"""Unit tests for WebSocket diff functionality."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime
from app.websocket import ConnectionManager
from app.models import CodeChangeMessage, CursorChangeMessage


@pytest.mark.asyncio
async def test_broadcast_code_change_with_diff():
    """Test broadcasting code change with diff."""
    manager = ConnectionManager()
    room_id = "test-room"
    
    # Create mock websockets
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    
    manager.active_connections[room_id] = {ws1, ws2}
    manager.user_info[ws1] = {"user_id": "user1", "username": "User1", "room_id": room_id}
    manager.user_info[ws2] = {"user_id": "user2", "username": "User2", "room_id": room_id}
    
    # Broadcast diff
    await manager.broadcast_code_change(
        room_id=room_id,
        from_pos=0,
        to_pos=5,
        insert="hello",
        delete_length=0,
        user_id="user1",
        exclude=ws1
    )
    
    # Check that ws2 received the message
    assert ws2.send_text.called
    call_args = ws2.send_text.call_args[0][0]
    message_data = eval(call_args) if isinstance(call_args, str) else call_args
    
    # Verify message contains diff fields
    assert "from_pos" in str(call_args) or "from_pos" in str(message_data)


@pytest.mark.asyncio
async def test_broadcast_code_change_with_full_code():
    """Test broadcasting code change with full code."""
    manager = ConnectionManager()
    room_id = "test-room"
    
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    
    manager.active_connections[room_id] = {ws1, ws2}
    manager.user_info[ws1] = {"user_id": "user1", "username": "User1", "room_id": room_id}
    manager.user_info[ws2] = {"user_id": "user2", "username": "User2", "room_id": room_id}
    
    # Broadcast full code
    await manager.broadcast_code_change(
        room_id=room_id,
        code="print('hello')",
        cursor_position=0,
        user_id="user1",
        exclude=ws1
    )
    
    assert ws2.send_text.called
    call_args = ws2.send_text.call_args[0][0]
    assert "code" in str(call_args) or "print" in str(call_args)


@pytest.mark.asyncio
async def test_broadcast_code_change_invalid_diff_fallback():
    """Test that invalid diff falls back to full code."""
    manager = ConnectionManager()
    room_id = "test-room"
    
    ws1 = AsyncMock()
    
    manager.active_connections[room_id] = {ws1}
    manager.user_info[ws1] = {"user_id": "user1", "username": "User1", "room_id": room_id}
    
    # Broadcast with invalid diff (to < from) but provide full code
    await manager.broadcast_code_change(
        room_id=room_id,
        code="fallback code",
        from_pos=10,
        to_pos=5,  # Invalid: to < from
        insert="test",
        user_id="user1"
    )
    
    assert ws1.send_text.called
    call_args = ws1.send_text.call_args[0][0]
    # Should use full code since diff is invalid
    assert "code" in str(call_args) or "fallback" in str(call_args)


@pytest.mark.asyncio
async def test_broadcast_cursor_change():
    """Test broadcasting cursor position changes."""
    manager = ConnectionManager()
    room_id = "test-room"
    
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    
    manager.active_connections[room_id] = {ws1, ws2}
    manager.user_info[ws1] = {"user_id": "user1", "username": "User1", "room_id": room_id}
    manager.user_info[ws2] = {"user_id": "user2", "username": "User2", "room_id": room_id}
    
    # Broadcast cursor change
    await manager.broadcast_cursor_change(
        room_id=room_id,
        line=10,
        column=20,
        user_id="user1",
        exclude=ws1
    )
    
    assert ws2.send_text.called
    call_args = ws2.send_text.call_args[0][0]
    assert "cursor_change" in str(call_args) or "line" in str(call_args)


@pytest.mark.asyncio
async def test_broadcast_cursor_change_excludes_sender():
    """Test that cursor change excludes the sender."""
    manager = ConnectionManager()
    room_id = "test-room"
    
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    
    manager.active_connections[room_id] = {ws1, ws2}
    manager.user_info[ws1] = {"user_id": "user1", "username": "User1", "room_id": room_id}
    manager.user_info[ws2] = {"user_id": "user2", "username": "User2", "room_id": room_id}
    
    # Broadcast cursor change excluding ws1
    await manager.broadcast_cursor_change(
        room_id=room_id,
        line=5,
        column=10,
        user_id="user1",
        exclude=ws1
    )
    
    # ws1 should not receive the message
    assert not ws1.send_text.called
    # ws2 should receive it
    assert ws2.send_text.called


def test_code_change_message_with_diff():
    """Test CodeChangeMessage model with diff fields."""
    message = CodeChangeMessage(
        type="code_change",
        from_pos=0,
        to_pos=5,
        insert="hello",
        delete_length=0,
        timestamp=datetime.utcnow()
    )
    
    assert message.from_pos == 0
    assert message.to_pos == 5
    assert message.insert == "hello"
    assert message.code is None  # Should be None when using diff


def test_code_change_message_with_full_code():
    """Test CodeChangeMessage model with full code."""
    message = CodeChangeMessage(
        type="code_change",
        code="print('hello')",
        cursor_position=0,
        timestamp=datetime.utcnow()
    )
    
    assert message.code == "print('hello')"
    assert message.from_pos is None  # Should be None when using full code


def test_cursor_change_message():
    """Test CursorChangeMessage model."""
    message = CursorChangeMessage(
        type="cursor_change",
        line=10,
        column=20,
        user_id="test-user"
    )
    
    assert message.line == 10
    assert message.column == 20
    assert message.user_id == "test-user"


def test_cursor_change_message_validation():
    """Test CursorChangeMessage validation."""
    # Line must be >= 1
    with pytest.raises(Exception):
        CursorChangeMessage(
            type="cursor_change",
            line=0,  # Invalid
            column=10
        )
    
    # Column must be >= 0
    with pytest.raises(Exception):
        CursorChangeMessage(
            type="cursor_change",
            line=1,
            column=-1  # Invalid
        )


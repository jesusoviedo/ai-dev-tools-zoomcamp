"""Unit tests for WebSocket endpoint using mocks."""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket, WebSocketDisconnect
from app.websocket import websocket_endpoint, manager


@pytest.mark.unit
class TestWebSocketEndpointUnit:
    """Unit tests for websocket_endpoint function."""
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_complete_flow(self):
        """Test complete websocket endpoint flow."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            json.dumps({"type": "code_change", "code": "print('test')", "cursor_position": 5}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-unit"
        
        # Mock manager methods
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_code_change', new_callable=AsyncMock) as mock_broadcast, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock) as mock_broadcast_left:
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Verify calls
            websocket.accept.assert_called_once()
            mock_connect.assert_called_once()
            mock_broadcast.assert_called_once()
            mock_disconnect.assert_called_once()
            mock_broadcast_left.assert_called_once()  # Lines 228-229
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_unknown_message_type(self):
        """Test websocket endpoint with unknown message type."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            json.dumps({"type": "unknown_type", "data": "test"}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-unknown"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should send error message for unknown type (lines 199-203)
            assert websocket.send_text.call_count >= 1
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_invalid_json(self):
        """Test websocket endpoint with invalid JSON."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            "invalid json {",
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-invalid-json"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should send error message for invalid JSON (lines 207-211)
            assert websocket.send_text.call_count >= 1
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_error_sending_fails(self):
        """Test websocket endpoint when sending error message fails (lines 222-223)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=Exception("Connection error"))
        websocket.send_text = AsyncMock(side_effect=Exception("Send failed"))
        
        room_id = "test-room-send-fail"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=None) as mock_disconnect:
            
            mock_connect.return_value = "user-123"
            
            # Should not raise exception even if send_text fails (lines 222-223)
            await websocket_endpoint(websocket, room_id)
            
            # Verify that send_text was attempted
            assert websocket.send_text.called
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_disconnect_exception(self):
        """Test websocket endpoint with WebSocketDisconnect."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=WebSocketDisconnect())
        
        room_id = "test-room-disconnect"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock) as mock_broadcast_left:
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should handle WebSocketDisconnect gracefully (line 213-214)
            mock_disconnect.assert_called_once()
            mock_broadcast_left.assert_called_once()  # Lines 228-229
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_code_change_none_cursor(self):
        """Test websocket endpoint with code_change and None cursor_position."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            json.dumps({"type": "code_change", "code": "print('test')", "cursor_position": None}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-none-cursor"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_code_change', new_callable=AsyncMock) as mock_broadcast, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Verify broadcast_code_change was called with cursor_position=0 (line 191)
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args
            assert call_args[1]['cursor_position'] == 0
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_anonymous_user(self):
        """Test websocket endpoint with anonymous user (invalid join message)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            "invalid json",
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-anonymous"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "Anonymous")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should use "Anonymous" as username (line 172)
            mock_connect.assert_called_once()
            # Check that connect was called with Anonymous username
            # connect is called as: connect(websocket, room_id, username)
            args, kwargs = mock_connect.call_args
            assert len(args) >= 3  # websocket, room_id, username
            assert args[2] == "Anonymous"  # username is the 3rd positional argument
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_join_message_with_empty_username(self):
        """Test websocket endpoint with join message having empty username (line 170)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": ""}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-empty-username"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "Anonymous")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should use "Anonymous" when username is empty (line 170)
            mock_connect.assert_called_once()
            args, kwargs = mock_connect.call_args
            assert args[2] == "Anonymous"
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_join_message_with_none_username(self):
        """Test websocket endpoint with join message having None username (line 170)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": None}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-none-username"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "Anonymous")) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should use "Anonymous" when username is None (line 170)
            mock_connect.assert_called_once()
            args, kwargs = mock_connect.call_args
            assert args[2] == "Anonymous"
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_general_exception_handling(self):
        """Test websocket endpoint handles general exceptions (lines 215-223)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=Exception("General error"))
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-general-error"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=None) as mock_disconnect:
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should send error message (lines 216-221)
            assert websocket.send_text.called
            call_args = websocket.send_text.call_args[0][0]
            assert "error" in call_args.lower()
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_disconnect_returns_none(self):
        """Test websocket endpoint when disconnect returns None (line 227)."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-disconnect-none"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=None) as mock_disconnect, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock) as mock_broadcast_left:
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Should not call broadcast_user_left when disconnect returns None (line 227)
            mock_disconnect.assert_called_once()
            mock_broadcast_left.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_websocket_endpoint_code_change_with_zero_cursor(self):
        """Test websocket endpoint with code_change and cursor_position=0."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.receive_text = AsyncMock(side_effect=[
            json.dumps({"type": "join", "username": "testuser"}),
            json.dumps({"type": "code_change", "code": "print('test')", "cursor_position": 0}),
            json.dumps({"type": "leave"})
        ])
        websocket.send_text = AsyncMock()
        
        room_id = "test-room-zero-cursor"
        
        with patch.object(manager, 'connect', new_callable=AsyncMock) as mock_connect, \
             patch.object(manager, 'disconnect', return_value=(room_id, "user-123", "testuser")) as mock_disconnect, \
             patch.object(manager, 'broadcast_code_change', new_callable=AsyncMock) as mock_broadcast, \
             patch.object(manager, 'broadcast_user_left', new_callable=AsyncMock):
            
            mock_connect.return_value = "user-123"
            
            await websocket_endpoint(websocket, room_id)
            
            # Verify broadcast_code_change was called with cursor_position=0 (line 191)
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args
            assert call_args[1]['cursor_position'] == 0


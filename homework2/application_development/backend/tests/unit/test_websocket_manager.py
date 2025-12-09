"""Unit tests for WebSocket ConnectionManager."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.websocket import ConnectionManager


@pytest.mark.unit
class TestConnectionManager:
    """Tests for ConnectionManager class."""
    
    def test_init(self):
        """Test ConnectionManager initialization."""
        manager = ConnectionManager()
        assert manager.active_connections == {}
        assert manager.user_info == {}
    
    @pytest.mark.asyncio
    async def test_connect_new_room(self):
        """Test connecting to a new room."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        
        user_id = await manager.connect(websocket, "room-123", "testuser")
        
        assert user_id is not None
        assert len(user_id) > 0
        assert "room-123" in manager.active_connections
        assert websocket in manager.active_connections["room-123"]
        assert websocket in manager.user_info
        assert manager.user_info[websocket]["username"] == "testuser"
        assert manager.user_info[websocket]["room_id"] == "room-123"
        websocket.accept.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_existing_room(self):
        """Test connecting to an existing room."""
        manager = ConnectionManager()
        websocket1 = AsyncMock()
        websocket1.accept = AsyncMock()
        websocket2 = AsyncMock()
        websocket2.accept = AsyncMock()
        
        await manager.connect(websocket1, "room-123", "user1")
        await manager.connect(websocket2, "room-123", "user2")
        
        assert len(manager.active_connections["room-123"]) == 2
        assert websocket1 in manager.active_connections["room-123"]
        assert websocket2 in manager.active_connections["room-123"]
    
    @pytest.mark.asyncio
    async def test_connect_anonymous_user(self):
        """Test connecting with anonymous username."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        
        user_id = await manager.connect(websocket, "room-123")
        
        assert user_id is not None
        assert manager.user_info[websocket]["username"] == "Anonymous"
    
    def test_disconnect_existing_user(self):
        """Test disconnecting an existing user."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        manager.active_connections["room-123"] = {websocket}
        manager.user_info[websocket] = {
            "user_id": "user-123",
            "username": "testuser",
            "room_id": "room-123"
        }
        
        result = manager.disconnect(websocket)
        
        assert result == ("room-123", "user-123", "testuser")
        assert websocket not in manager.active_connections.get("room-123", set())
        assert websocket not in manager.user_info
    
    def test_disconnect_nonexistent_user(self):
        """Test disconnecting a user that doesn't exist."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        
        result = manager.disconnect(websocket)
        
        assert result is None
    
    def test_disconnect_removes_empty_room(self):
        """Test that empty rooms are removed after disconnect."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        manager.active_connections["room-123"] = {websocket}
        manager.user_info[websocket] = {
            "user_id": "user-123",
            "username": "testuser",
            "room_id": "room-123"
        }
        
        manager.disconnect(websocket)
        
        assert "room-123" not in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_broadcast_code_change_single_user(self):
        """Test broadcasting code change to a single user."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket}
        
        await manager.broadcast_code_change("room-123", "print('test')", 10, "user-123")
        
        websocket.send_text.assert_called_once()
        call_args = websocket.send_text.call_args[0][0]
        assert "code_change" in call_args
        assert "print('test')" in call_args
    
    @pytest.mark.asyncio
    async def test_broadcast_code_change_multiple_users(self):
        """Test broadcasting code change to multiple users."""
        manager = ConnectionManager()
        websocket1 = AsyncMock()
        websocket1.send_text = AsyncMock()
        websocket2 = AsyncMock()
        websocket2.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket1, websocket2}
        
        await manager.broadcast_code_change("room-123", "print('test')", 10, "user-123")
        
        assert websocket1.send_text.call_count == 1
        assert websocket2.send_text.call_count == 1
    
    @pytest.mark.asyncio
    async def test_broadcast_code_change_exclude_sender(self):
        """Test that sender is excluded from broadcast."""
        manager = ConnectionManager()
        websocket1 = AsyncMock()
        websocket1.send_text = AsyncMock()
        websocket2 = AsyncMock()
        websocket2.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket1, websocket2}
        
        await manager.broadcast_code_change("room-123", "print('test')", 10, "user-123", exclude=websocket1)
        
        websocket1.send_text.assert_not_called()
        websocket2.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_broadcast_code_change_nonexistent_room(self):
        """Test broadcasting to nonexistent room."""
        manager = ConnectionManager()
        
        # Should not raise an error
        await manager.broadcast_code_change("nonexistent", "print('test')", 10, "user-123")
    
    @pytest.mark.asyncio
    async def test_broadcast_code_change_disconnected_user(self):
        """Test handling disconnected users during broadcast."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock(side_effect=Exception("Connection closed"))
        manager.active_connections["room-123"] = {websocket}
        manager.user_info[websocket] = {
            "user_id": "user-123",
            "username": "testuser",
            "room_id": "room-123"
        }
        
        await manager.broadcast_code_change("room-123", "print('test')", 10, "user-123")
        
        # Disconnected user should be cleaned up
        assert websocket not in manager.active_connections.get("room-123", set())
        assert websocket not in manager.user_info
    
    @pytest.mark.asyncio
    async def test_broadcast_user_joined(self):
        """Test broadcasting user joined notification."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket}
        
        await manager.broadcast_user_joined("room-123", "user-456", "newuser")
        
        websocket.send_text.assert_called_once()
        call_args = websocket.send_text.call_args[0][0]
        assert "user_joined" in call_args
        assert "newuser" in call_args
    
    @pytest.mark.asyncio
    async def test_broadcast_user_joined_exclude_new_user(self):
        """Test that new user is excluded from join notification."""
        manager = ConnectionManager()
        websocket1 = AsyncMock()
        websocket1.send_text = AsyncMock()
        websocket2 = AsyncMock()
        websocket2.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket1, websocket2}
        
        await manager.broadcast_user_joined("room-123", "user-456", "newuser", exclude=websocket2)
        
        websocket1.send_text.assert_called_once()
        websocket2.send_text.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_broadcast_user_left(self):
        """Test broadcasting user left notification."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock()
        manager.active_connections["room-123"] = {websocket}
        
        await manager.broadcast_user_left("room-123", "user-456")
        
        websocket.send_text.assert_called_once()
        call_args = websocket.send_text.call_args[0][0]
        assert "user_left" in call_args
    
    @pytest.mark.asyncio
    async def test_broadcast_user_left_nonexistent_room(self):
        """Test broadcasting user left to nonexistent room."""
        manager = ConnectionManager()
        
        # Should not raise an error
        await manager.broadcast_user_left("nonexistent", "user-456")
    
    @pytest.mark.asyncio
    async def test_broadcast_user_joined_nonexistent_room(self):
        """Test broadcasting user joined to nonexistent room (line 101)."""
        manager = ConnectionManager()
        
        # Should return early without error (line 101)
        await manager.broadcast_user_joined("nonexistent", "user-456", "newuser")
    
    @pytest.mark.asyncio
    async def test_broadcast_user_joined_disconnected_user(self):
        """Test handling disconnected users during user_joined broadcast."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock(side_effect=Exception("Connection closed"))
        manager.active_connections["room-123"] = {websocket}
        manager.user_info[websocket] = {
            "user_id": "user-123",
            "username": "testuser",
            "room_id": "room-123"
        }
        
        await manager.broadcast_user_joined("room-123", "user-456", "newuser")
        
        # Disconnected user should be cleaned up
        assert websocket not in manager.active_connections.get("room-123", set())
        assert websocket not in manager.user_info
    
    @pytest.mark.asyncio
    async def test_broadcast_user_left_disconnected_user(self):
        """Test handling disconnected users during user_left broadcast."""
        manager = ConnectionManager()
        websocket = AsyncMock()
        websocket.send_text = AsyncMock(side_effect=Exception("Connection closed"))
        manager.active_connections["room-123"] = {websocket}
        manager.user_info[websocket] = {
            "user_id": "user-123",
            "username": "testuser",
            "room_id": "room-123"
        }
        
        await manager.broadcast_user_left("room-123", "user-456")
        
        # Disconnected user should be cleaned up
        assert websocket not in manager.active_connections.get("room-123", set())
        assert websocket not in manager.user_info


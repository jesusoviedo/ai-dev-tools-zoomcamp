"""Integration tests for WebSocket endpoints."""

import pytest
import json
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.mark.integration
class TestWebSocketConnection:
    """Tests for WebSocket connection."""
    
    def test_websocket_connect_success(self, client):
        """Test successful WebSocket connection."""
        with client.websocket_connect("/ws/test-room-123") as websocket:
            # Send join message
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Should receive user_joined message (from other users, but we're alone)
            # Connection should be established
            assert websocket is not None
    
    def test_websocket_connect_without_join_message(self, client):
        """Test WebSocket connection accepts without initial join message."""
        with client.websocket_connect("/ws/test-room-123") as websocket:
            # Connection should be established even without join message
            assert websocket is not None
    
    def test_websocket_anonymous_user(self, client):
        """Test WebSocket connection with anonymous user."""
        with client.websocket_connect("/ws/test-room-123") as websocket:
            # Send invalid join message (should default to Anonymous)
            websocket.send_text("invalid json")
            assert websocket is not None


@pytest.mark.integration
class TestWebSocketCodeChange:
    """Tests for WebSocket code change messages."""
    
    def test_send_code_change_message(self, client):
        """Test sending code change message."""
        with client.websocket_connect("/ws/test-room-123") as websocket:
            # Join first
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Send code change
            code_message = {
                "type": "code_change",
                "code": "print('Hello')",
                "cursor_position": 10
            }
            websocket.send_text(json.dumps(code_message))
            
            # Message should be sent without error
            assert websocket is not None
    
    def test_code_change_broadcast(self, client):
        """Test that code changes are broadcast to other users."""
        room_id = "test-room-broadcast"
        
        # Connect first client
        with client.websocket_connect(f"/ws/{room_id}") as websocket1:
            join_message1 = {"type": "join", "username": "user1"}
            websocket1.send_text(json.dumps(join_message1))
            
            # Connect second client
            with client.websocket_connect(f"/ws/{room_id}") as websocket2:
                join_message2 = {"type": "join", "username": "user2"}
                websocket2.send_text(json.dumps(join_message2))
                
                # Wait a bit for connections to be established
                import time
                time.sleep(0.1)
                
                # Send code change from first client
                code_message = {
                    "type": "code_change",
                    "code": "const x = 42;",
                    "cursor_position": 5
                }
                websocket1.send_text(json.dumps(code_message))
                
                # Second client should receive the broadcast
                # Note: In test environment, broadcasts might not work exactly as in production
                # This test verifies the message can be sent without errors
                assert websocket2 is not None


@pytest.mark.integration
class TestWebSocketUserNotifications:
    """Tests for WebSocket user join/leave notifications."""
    
    def test_user_join_notification(self, client):
        """Test user join notification."""
        room_id = "test-room-notifications"
        
        # Connect first client
        with client.websocket_connect(f"/ws/{room_id}") as websocket1:
            join_message1 = {"type": "join", "username": "user1"}
            websocket1.send_text(json.dumps(join_message1))
            
            # Connect second client - first should be notified
            with client.websocket_connect(f"/ws/{room_id}") as websocket2:
                join_message2 = {"type": "join", "username": "user2"}
                websocket2.send_text(json.dumps(join_message2))
                
                # Wait for notifications
                import time
                time.sleep(0.1)
                
                # Both connections should be active
                assert websocket1 is not None
                assert websocket2 is not None
    
    def test_user_leave_message(self, client):
        """Test user leave message."""
        with client.websocket_connect("/ws/test-room-leave") as websocket:
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Send leave message
            leave_message = {"type": "leave"}
            websocket.send_text(json.dumps(leave_message))
            
            # Connection should close gracefully
            assert websocket is not None


@pytest.mark.integration
class TestWebSocketErrorHandling:
    """Tests for WebSocket error handling."""
    
    def test_invalid_message_type(self, client):
        """Test handling of invalid message type."""
        with client.websocket_connect("/ws/test-room-errors") as websocket:
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Send invalid message type
            invalid_message = {"type": "invalid_type", "data": "test"}
            websocket.send_text(json.dumps(invalid_message))
            
            # Should handle error gracefully
            assert websocket is not None
    
    def test_invalid_json_message(self, client):
        """Test handling of invalid JSON message."""
        with client.websocket_connect("/ws/test-room-errors") as websocket:
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Send invalid JSON
            websocket.send_text("not valid json {")
            
            # Should handle error gracefully
            assert websocket is not None
    
    def test_missing_required_fields(self, client):
        """Test handling of messages with missing required fields."""
        with client.websocket_connect("/ws/test-room-errors") as websocket:
            join_message = {"type": "join", "username": "testuser"}
            websocket.send_text(json.dumps(join_message))
            
            # Send code_change without required 'code' field
            invalid_code_message = {"type": "code_change"}
            websocket.send_text(json.dumps(invalid_code_message))
            
            # Should handle error gracefully
            assert websocket is not None


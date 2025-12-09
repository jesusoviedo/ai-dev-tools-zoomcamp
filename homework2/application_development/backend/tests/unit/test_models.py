"""Unit tests for Pydantic models."""

import pytest
from datetime import UTC, datetime
from pydantic import ValidationError
from app.models import (
    HealthResponse,
    CreateSessionRequest,
    SessionResponse,
    CodeChangeMessage,
    JoinMessage,
    LeaveMessage,
    UserJoinedMessage,
    UserLeftMessage,
    ErrorMessage,
)


class TestHealthResponse:
    """Tests for HealthResponse model."""
    
    def test_health_response_default_values(self):
        """Test HealthResponse with default values."""
        response = HealthResponse()
        assert response.status == "ok"
        assert isinstance(response.timestamp, datetime)
    
    def test_health_response_custom_values(self):
        """Test HealthResponse with custom values."""
        custom_timestamp = datetime(2024, 1, 1, 12, 0, 0)
        response = HealthResponse(status="healthy", timestamp=custom_timestamp)
        assert response.status == "healthy"
        assert response.timestamp == custom_timestamp


class TestCreateSessionRequest:
    """Tests for CreateSessionRequest model."""
    
    def test_create_session_request_default_values(self):
        """Test CreateSessionRequest with default values."""
        request = CreateSessionRequest()
        assert request.language == "python"
        assert request.initial_code == "# Escribe tu código aquí"
        assert request.title is None
    
    def test_create_session_request_custom_values(self):
        """Test CreateSessionRequest with custom values."""
        request = CreateSessionRequest(
            language="javascript",
            initial_code="console.log('Hello');",
            title="Test Session"
        )
        assert request.language == "javascript"
        assert request.initial_code == "console.log('Hello');"
        assert request.title == "Test Session"
    
    def test_create_session_request_invalid_language(self):
        """Test CreateSessionRequest with invalid language."""
        with pytest.raises(ValidationError):
            CreateSessionRequest(language="invalid_language")
    
    def test_create_session_request_valid_languages(self):
        """Test CreateSessionRequest with all valid languages."""
        valid_languages = ["python", "javascript", "typescript", "java", "cpp"]
        for lang in valid_languages:
            request = CreateSessionRequest(language=lang)
            assert request.language == lang


class TestSessionResponse:
    """Tests for SessionResponse model."""
    
    def test_session_response_all_fields(self):
        """Test SessionResponse with all required fields."""
        timestamp = datetime.now(UTC)
        response = SessionResponse(
            session_id="test-session-123",
            room_id="room-test-session-123",
            share_url="http://localhost:5173/session/test-session-123",
            language="python",
            initial_code="# Test code",
            created_at=timestamp,
            active_users=2
        )
        assert response.session_id == "test-session-123"
        assert response.room_id == "room-test-session-123"
        assert response.share_url == "http://localhost:5173/session/test-session-123"
        assert response.language == "python"
        assert response.initial_code == "# Test code"
        assert response.created_at == timestamp
        assert response.active_users == 2
    
    def test_session_response_optional_title(self):
        """Test SessionResponse with optional title."""
        timestamp = datetime.now(UTC)
        response = SessionResponse(
            session_id="test-session-123",
            room_id="room-test-session-123",
            share_url="http://localhost:5173/session/test-session-123",
            language="python",
            initial_code="# Test code",
            created_at=timestamp,
            title="My Session"
        )
        assert response.title == "My Session"
    
    def test_session_response_default_active_users(self):
        """Test SessionResponse with default active_users."""
        timestamp = datetime.now(UTC)
        response = SessionResponse(
            session_id="test-session-123",
            room_id="room-test-session-123",
            share_url="http://localhost:5173/session/test-session-123",
            language="python",
            initial_code="# Test code",
            created_at=timestamp
        )
        assert response.active_users == 0
    
    def test_session_response_negative_active_users(self):
        """Test SessionResponse rejects negative active_users."""
        timestamp = datetime.now(UTC)
        with pytest.raises(ValidationError):
            SessionResponse(
                session_id="test-session-123",
                room_id="room-test-session-123",
                share_url="http://localhost:5173/session/test-session-123",
                language="python",
                initial_code="# Test code",
                created_at=timestamp,
                active_users=-1
            )


class TestCodeChangeMessage:
    """Tests for CodeChangeMessage model."""
    
    def test_code_change_message_required_fields(self):
        """Test CodeChangeMessage with required fields."""
        message = CodeChangeMessage(code="print('Hello')")
        assert message.type == "code_change"
        assert message.code == "print('Hello')"
        assert message.cursor_position is None
        assert message.user_id is None
    
    def test_code_change_message_all_fields(self):
        """Test CodeChangeMessage with all fields."""
        message = CodeChangeMessage(
            code="print('Hello')",
            cursor_position=10,
            user_id="user-123"
        )
        assert message.type == "code_change"
        assert message.code == "print('Hello')"
        assert message.cursor_position == 10
        assert message.user_id == "user-123"
    
    def test_code_change_message_negative_cursor_position(self):
        """Test CodeChangeMessage rejects negative cursor_position."""
        with pytest.raises(ValidationError):
            CodeChangeMessage(code="test", cursor_position=-1)


class TestJoinMessage:
    """Tests for JoinMessage model."""
    
    def test_join_message_default_type(self):
        """Test JoinMessage with default type."""
        message = JoinMessage(username="testuser")
        assert message.type == "join"
        assert message.username == "testuser"
    
    def test_join_message_custom_type(self):
        """Test JoinMessage with custom type."""
        message = JoinMessage(type="join", username="testuser")
        assert message.type == "join"
        assert message.username == "testuser"


class TestLeaveMessage:
    """Tests for LeaveMessage model."""
    
    def test_leave_message_default(self):
        """Test LeaveMessage with default values."""
        message = LeaveMessage()
        assert message.type == "leave"


class TestUserJoinedMessage:
    """Tests for UserJoinedMessage model."""
    
    def test_user_joined_message_all_fields(self):
        """Test UserJoinedMessage with all fields."""
        message = UserJoinedMessage(
            user_id="user-123",
            username="testuser"
        )
        assert message.type == "user_joined"
        assert message.user_id == "user-123"
        assert message.username == "testuser"


class TestUserLeftMessage:
    """Tests for UserLeftMessage model."""
    
    def test_user_left_message_all_fields(self):
        """Test UserLeftMessage with all fields."""
        message = UserLeftMessage(user_id="user-123")
        assert message.type == "user_left"
        assert message.user_id == "user-123"


class TestErrorMessage:
    """Tests for ErrorMessage model."""
    
    def test_error_message_all_fields(self):
        """Test ErrorMessage with all fields."""
        message = ErrorMessage(message="Something went wrong")
        assert message.type == "error"
        assert message.message == "Something went wrong"


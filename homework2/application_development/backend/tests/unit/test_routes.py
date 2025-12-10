"""Unit tests for routes."""

import pytest
from datetime import UTC, datetime, timedelta
from unittest.mock import patch, MagicMock, Mock
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.routes import (
    create_session,
    get_session,
    save_code,
    SESSION_DURATION_HOURS
)
from app.models import (
    CreateSessionRequest,
    SessionResponse,
    SaveCodeRequest,
    Session as SessionModel
)


@pytest.mark.unit
class TestSessionDurationConfig:
    """Tests for SESSION_DURATION_HOURS configuration."""
    
    @patch.dict('os.environ', {'SESSION_DURATION_HOURS': '3'})  # Invalid: < 5
    def test_session_duration_below_minimum(self):
        """Test that SESSION_DURATION_HOURS defaults to 8 when below 5."""
        import importlib
        import app.routes
        importlib.reload(app.routes)
        assert app.routes.SESSION_DURATION_HOURS == 8
    
    @patch.dict('os.environ', {'SESSION_DURATION_HOURS': '15'})  # Invalid: > 12
    def test_session_duration_above_maximum(self):
        """Test that SESSION_DURATION_HOURS defaults to 8 when above 12."""
        import importlib
        import app.routes
        importlib.reload(app.routes)
        assert app.routes.SESSION_DURATION_HOURS == 8
    
    @patch.dict('os.environ', {'SESSION_DURATION_HOURS': '10'})  # Valid: 5-12
    def test_session_duration_valid(self):
        """Test that SESSION_DURATION_HOURS accepts valid values."""
        import importlib
        import app.routes
        importlib.reload(app.routes)
        assert app.routes.SESSION_DURATION_HOURS == 10


@pytest.mark.unit
class TestCreateSession:
    """Unit tests for create_session endpoint."""
    
    @pytest.mark.asyncio
    @patch('app.routes.secrets')
    @patch('app.routes.datetime')
    async def test_create_session_defaults(self, mock_datetime, mock_secrets):
        """Test create_session with default values."""
        mock_secrets.token_urlsafe.return_value = "test-session-id"
        mock_now = datetime.now(UTC)
        mock_datetime.now.return_value = mock_now
        mock_datetime.UTC = UTC
        mock_datetime.timedelta = timedelta
        
        mock_db = MagicMock(spec=Session)
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        # Mock SessionModel
        with patch('app.routes.SessionModel') as mock_session_model:
            mock_session_instance = MagicMock()
            mock_session_instance.session_id = "test-session-id"
            mock_session_instance.room_id = "room-test-session-id"
            mock_session_instance.language = "python"
            mock_session_instance.code = "# Escribe tu código aquí"
            mock_session_instance.title = None
            mock_session_instance.created_at = mock_now
            mock_session_instance.expires_at = mock_now + timedelta(hours=SESSION_DURATION_HOURS)
            mock_session_instance.active_users = 0
            mock_session_instance.last_saved_at = None
            mock_session_model.return_value = mock_session_instance
            
            request = CreateSessionRequest()
            result = await create_session(request, mock_db)
            
            assert isinstance(result, SessionResponse)
            assert result.session_id == "test-session-id"
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()


@pytest.mark.unit
class TestGetSession:
    """Unit tests for get_session endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_session_not_found(self):
        """Test get_session raises 404 for non-existent session."""
        mock_db = MagicMock(spec=Session)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            await get_session("non-existent", mock_db)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_session_expired(self):
        """Test get_session raises 410 for expired session."""
        mock_db = MagicMock(spec=Session)
        mock_session = MagicMock()
        mock_session.is_expired.return_value = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        
        with pytest.raises(HTTPException) as exc_info:
            await get_session("expired-session", mock_db)
        
        assert exc_info.value.status_code == 410
    
    @pytest.mark.asyncio
    async def test_get_session_success(self):
        """Test get_session returns session data."""
        mock_db = MagicMock(spec=Session)
        mock_session = MagicMock()
        mock_session.session_id = "test-session"
        mock_session.room_id = "room-test"
        mock_session.language = "python"
        mock_session.code = "print('test')"
        mock_session.title = None
        mock_session.created_at = datetime.now(UTC)
        mock_session.active_users = 0
        mock_session.last_saved_at = None
        mock_session.is_expired.return_value = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        
        result = await get_session("test-session", mock_db)
        
        assert isinstance(result, SessionResponse)
        assert result.session_id == "test-session"


@pytest.mark.unit
class TestSaveCode:
    """Unit tests for save_code endpoint."""
    
    @pytest.mark.asyncio
    async def test_save_code_not_found(self):
        """Test save_code raises 404 for non-existent session."""
        mock_db = MagicMock(spec=Session)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        request = SaveCodeRequest(code="print('test')")
        
        with pytest.raises(HTTPException) as exc_info:
            await save_code("non-existent", request, mock_db)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_save_code_expired(self):
        """Test save_code raises 410 for expired session."""
        mock_db = MagicMock(spec=Session)
        mock_session = MagicMock()
        mock_session.is_expired.return_value = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        
        request = SaveCodeRequest(code="print('test')")
        
        with pytest.raises(HTTPException) as exc_info:
            await save_code("expired-session", request, mock_db)
        
        assert exc_info.value.status_code == 410
    
    @pytest.mark.asyncio
    @patch('app.routes.datetime')
    async def test_save_code_success(self, mock_datetime):
        """Test save_code updates code successfully."""
        mock_now = datetime.now(UTC)
        mock_datetime.now.return_value = mock_now
        mock_datetime.UTC = UTC
        
        mock_db = MagicMock(spec=Session)
        mock_session = MagicMock()
        mock_session.session_id = "test-session"
        mock_session.room_id = "room-test"
        mock_session.language = "python"
        mock_session.code = "old code"
        mock_session.title = None
        mock_session.created_at = datetime.now(UTC)
        mock_session.active_users = 0
        mock_session.last_saved_at = None
        mock_session.is_expired.return_value = False
        mock_db.query.return_value.filter.return_value.first.return_value = mock_session
        mock_db.refresh.return_value = None
        
        request = SaveCodeRequest(code="new code")
        result = await save_code("test-session", request, mock_db)
        
        assert mock_session.code == "new code"
        assert mock_session.last_saved_at == mock_now
        mock_db.commit.assert_called_once()
        assert isinstance(result, SessionResponse)


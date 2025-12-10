"""Unit tests for routes."""

import pytest
import os
import sys
from datetime import UTC, datetime, timedelta
from unittest.mock import patch, MagicMock, Mock
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.routes import (
    health_check,
    create_session,
    get_session,
    save_code,
    SESSION_DURATION_HOURS
)
from app.models import (
    HealthResponse,
    CreateSessionRequest,
    SessionResponse,
    SaveCodeRequest,
    Session as SessionModel
)


@pytest.mark.unit
class TestSessionDurationConfig:
    """Tests for SESSION_DURATION_HOURS configuration."""
    
    def test_session_duration_below_minimum(self):
        """Test that SESSION_DURATION_HOURS defaults to 8 when below 5 (line 24)."""
        import sys
        import importlib
        
        # Save original module
        original_module = sys.modules.get('app.routes')
        original_env = os.environ.get('SESSION_DURATION_HOURS')
        
        try:
            # Set invalid value
            os.environ['SESSION_DURATION_HOURS'] = '3'
            
            # Remove from cache to force reload
            if 'app.routes' in sys.modules:
                del sys.modules['app.routes']
            
            # Reload module - this should execute line 24
            import app.routes
            importlib.reload(app.routes)
            
            # Verify line 24 was executed (assignment inside if)
            assert app.routes.SESSION_DURATION_HOURS == 8
        finally:
            # Restore
            if original_env:
                os.environ['SESSION_DURATION_HOURS'] = original_env
            elif 'SESSION_DURATION_HOURS' in os.environ:
                del os.environ['SESSION_DURATION_HOURS']
            if original_module:
                sys.modules['app.routes'] = original_module
    
    def test_session_duration_above_maximum(self):
        """Test that SESSION_DURATION_HOURS defaults to 8 when above 12 (line 24)."""
        import sys
        import importlib
        
        # Save original module
        original_module = sys.modules.get('app.routes')
        original_env = os.environ.get('SESSION_DURATION_HOURS')
        
        try:
            # Set invalid value
            os.environ['SESSION_DURATION_HOURS'] = '15'
            
            # Remove from cache to force reload
            if 'app.routes' in sys.modules:
                del sys.modules['app.routes']
            
            # Reload module - this should execute line 24
            import app.routes
            importlib.reload(app.routes)
            
            # Verify line 24 was executed (assignment inside if)
            assert app.routes.SESSION_DURATION_HOURS == 8
        finally:
            # Restore
            if original_env:
                os.environ['SESSION_DURATION_HOURS'] = original_env
            elif 'SESSION_DURATION_HOURS' in os.environ:
                del os.environ['SESSION_DURATION_HOURS']
            if original_module:
                sys.modules['app.routes'] = original_module
    
    def test_session_duration_valid(self):
        """Test that SESSION_DURATION_HOURS accepts valid values."""
        import sys
        import importlib
        
        # Save original module
        original_module = sys.modules.get('app.routes')
        original_env = os.environ.get('SESSION_DURATION_HOURS')
        
        try:
            # Set valid value
            os.environ['SESSION_DURATION_HOURS'] = '10'
            
            # Remove from cache to force reload
            if 'app.routes' in sys.modules:
                del sys.modules['app.routes']
            
            # Reload module
            import app.routes
            importlib.reload(app.routes)
            
            # Verify valid value is used (line 24 should NOT execute)
            assert app.routes.SESSION_DURATION_HOURS == 10
        finally:
            # Restore
            if original_env:
                os.environ['SESSION_DURATION_HOURS'] = original_env
            elif 'SESSION_DURATION_HOURS' in os.environ:
                del os.environ['SESSION_DURATION_HOURS']
            if original_module:
                sys.modules['app.routes'] = original_module


@pytest.mark.unit
class TestHealthCheck:
    """Unit tests for health_check endpoint."""
    
    @pytest.mark.asyncio
    async def test_health_check_returns_health_response(self):
        """Test health_check returns HealthResponse with default values."""
        result = await health_check()
        
        assert isinstance(result, HealthResponse)
        assert result.status == "ok"
        assert isinstance(result.timestamp, datetime)
    
    @pytest.mark.asyncio
    async def test_health_check_timestamp_is_recent(self):
        """Test health_check timestamp is recent (within last second)."""
        from datetime import UTC as UTC_TZ
        
        result = await health_check()
        now = datetime.now(UTC_TZ)
        time_diff = abs((now - result.timestamp).total_seconds())
        
        # Timestamp should be within the last second
        assert time_diff < 1.0


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


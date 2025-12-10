"""Unit tests for background tasks."""

import pytest
import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from app.tasks import cleanup_expired_sessions, periodic_cleanup
from app.models import Session as SessionModel


@pytest.mark.unit
class TestCleanupExpiredSessions:
    """Tests for cleanup_expired_sessions function."""
    
    @patch('app.tasks.SessionLocal')
    def test_cleanup_expired_sessions_with_expired(self, mock_session_local):
        """Test cleanup removes expired sessions."""
        # Mock database session - SessionLocal() returns a session directly
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db
        
        # Mock query result
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_query.filter.return_value = mock_filter
        mock_filter.delete.return_value = 3  # 3 expired sessions deleted
        mock_db.query.return_value = mock_query
        
        result = cleanup_expired_sessions()
        
        assert result == 3
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()
    
    @patch('app.tasks.SessionLocal')
    def test_cleanup_expired_sessions_no_expired(self, mock_session_local):
        """Test cleanup when no expired sessions exist."""
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db
        
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_query.filter.return_value = mock_filter
        mock_filter.delete.return_value = 0  # No expired sessions
        mock_db.query.return_value = mock_query
        
        result = cleanup_expired_sessions()
        
        assert result == 0
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()
    
    @patch('app.tasks.SessionLocal')
    def test_cleanup_expired_sessions_error_handling(self, mock_session_local):
        """Test cleanup handles errors gracefully."""
        mock_db = MagicMock(spec=Session)
        mock_session_local.return_value = mock_db
        
        # Simulate error during cleanup
        mock_db.query.side_effect = Exception("Database error")
        
        with pytest.raises(Exception):
            cleanup_expired_sessions()
        
        mock_db.rollback.assert_called_once()
        mock_db.close.assert_called_once()


@pytest.mark.unit
class TestPeriodicCleanup:
    """Tests for periodic_cleanup function."""
    
    @pytest.mark.asyncio
    @patch('app.tasks.cleanup_expired_sessions')
    @patch('app.tasks.asyncio.sleep')
    async def test_periodic_cleanup_runs_cleanup(self, mock_sleep, mock_cleanup):
        """Test periodic_cleanup calls cleanup_expired_sessions."""
        mock_cleanup.return_value = 0
        mock_sleep.side_effect = asyncio.CancelledError()  # Cancel after first iteration
        
        # Create task
        task = asyncio.create_task(periodic_cleanup(interval_hours=1))
        
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        # Should have called cleanup at least once
        assert mock_cleanup.called
    
    @pytest.mark.asyncio
    @patch('app.tasks.cleanup_expired_sessions')
    @patch('app.tasks.asyncio.sleep')
    async def test_periodic_cleanup_handles_errors(self, mock_sleep, mock_cleanup):
        """Test periodic_cleanup handles errors in cleanup."""
        mock_cleanup.side_effect = Exception("Cleanup error")
        mock_sleep.side_effect = asyncio.CancelledError()  # Cancel after first iteration
        
        task = asyncio.create_task(periodic_cleanup(interval_hours=1))
        
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        # Should have attempted cleanup despite error
        assert mock_cleanup.called


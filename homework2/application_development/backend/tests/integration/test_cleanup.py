"""Integration tests for session cleanup task."""

import pytest
import asyncio
from datetime import UTC, datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, drop_db
from app.models import Session as SessionModel
from app.tasks import cleanup_expired_sessions, periodic_cleanup


@pytest.fixture(scope="function")
def db_session():
    """Create a database session for testing."""
    # Initialize database
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up: drop tables after test
        drop_db()


@pytest.mark.integration
class TestSessionCleanup:
    """Tests for session cleanup functionality."""
    
    def test_cleanup_expired_sessions(self, db_session: Session):
        """Test that cleanup removes expired sessions."""
        now = datetime.now(UTC)
        
        # Create expired session
        expired = SessionModel(
            session_id="expired-cleanup-1",
            room_id="room-expired-1",
            language="python",
            code="print('expired')",
            created_at=now - timedelta(hours=10),
            expires_at=now - timedelta(hours=2)
        )
        db_session.add(expired)
        
        # Create active session
        active = SessionModel(
            session_id="active-cleanup-1",
            room_id="room-active-1",
            language="python",
            code="print('active')",
            created_at=now,
            expires_at=now + timedelta(hours=8)
        )
        db_session.add(active)
        db_session.commit()
        
        # Run cleanup
        deleted_count = cleanup_expired_sessions()
        
        assert deleted_count == 1
        
        # Verify expired session is deleted
        expired_check = db_session.query(SessionModel).filter(
            SessionModel.session_id == "expired-cleanup-1"
        ).first()
        assert expired_check is None
        
        # Verify active session still exists
        active_check = db_session.query(SessionModel).filter(
            SessionModel.session_id == "active-cleanup-1"
        ).first()
        assert active_check is not None
    
    def test_cleanup_no_expired_sessions(self, db_session: Session):
        """Test cleanup when there are no expired sessions."""
        now = datetime.now(UTC)
        
        # Create only active sessions
        active1 = SessionModel(
            session_id="active-cleanup-2",
            room_id="room-active-2",
            language="python",
            code="print('active1')",
            created_at=now,
            expires_at=now + timedelta(hours=8)
        )
        db_session.add(active1)
        
        active2 = SessionModel(
            session_id="active-cleanup-3",
            room_id="room-active-3",
            language="javascript",
            code="console.log('active2')",
            created_at=now,
            expires_at=now + timedelta(hours=10)
        )
        db_session.add(active2)
        db_session.commit()
        
        # Run cleanup
        deleted_count = cleanup_expired_sessions()
        
        assert deleted_count == 0
        
        # Verify both sessions still exist
        assert db_session.query(SessionModel).filter(
            SessionModel.session_id == "active-cleanup-2"
        ).first() is not None
        assert db_session.query(SessionModel).filter(
            SessionModel.session_id == "active-cleanup-3"
        ).first() is not None
    
    def test_cleanup_empty_database(self, db_session: Session):
        """Test cleanup on empty database."""
        deleted_count = cleanup_expired_sessions()
        assert deleted_count == 0
    
    def test_cleanup_expired_sessions_handles_db_error(self, db_session: Session):
        """Test cleanup handles database errors gracefully (lines 26-29)."""
        from unittest.mock import patch, MagicMock
        
        # Create an expired session
        now = datetime.now(UTC)
        expired = SessionModel(
            session_id="error-test-session",
            room_id="room-error",
            language="python",
            code="print('error')",
            created_at=now - timedelta(hours=10),
            expires_at=now - timedelta(hours=2)
        )
        db_session.add(expired)
        db_session.commit()
        
        # Mock SessionLocal to return a session that raises an error on commit
        mock_db = MagicMock(spec=Session)
        mock_db.query.return_value.filter.return_value.delete.return_value = 1
        mock_db.commit.side_effect = Exception("Database error")
        mock_db.rollback = MagicMock()
        mock_db.close = MagicMock()
        
        with patch('app.tasks.SessionLocal', return_value=mock_db):
            # Verify that cleanup raises the exception
            with pytest.raises(Exception, match="Database error"):
                cleanup_expired_sessions()
            
            # Verify rollback was called (line 27)
            mock_db.rollback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_periodic_cleanup_runs_multiple_times(self, db_session: Session):
        """Test periodic_cleanup runs multiple cleanup cycles (lines 41-48)."""
        # Create expired sessions
        now = datetime.now(UTC)
        expired1 = SessionModel(
            session_id="periodic-test-1",
            room_id="room-periodic-1",
            language="python",
            code="print('periodic1')",
            created_at=now - timedelta(hours=10),
            expires_at=now - timedelta(hours=2)
        )
        expired2 = SessionModel(
            session_id="periodic-test-2",
            room_id="room-periodic-2",
            language="python",
            code="print('periodic2')",
            created_at=now - timedelta(hours=10),
            expires_at=now - timedelta(hours=2)
        )
        db_session.add(expired1)
        db_session.add(expired2)
        db_session.commit()
        
        # Start periodic cleanup with very short interval (0.05 seconds for testing)
        # Use a small interval to test quickly but not too small to avoid race conditions
        cleanup_task = asyncio.create_task(periodic_cleanup(interval_hours=0.05 / 3600))
        
        # Wait a bit to allow cleanup to run at least once
        await asyncio.sleep(0.1)
        
        # Verify cleanup ran (sessions should be deleted)
        remaining = db_session.query(SessionModel).filter(
            SessionModel.session_id.in_(["periodic-test-1", "periodic-test-2"])
        ).count()
        assert remaining == 0, "Periodic cleanup should have removed expired sessions"
        
        # Cancel the task immediately to prevent infinite loop
        cleanup_task.cancel()
        try:
            await asyncio.wait_for(cleanup_task, timeout=0.1)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    
    @pytest.mark.asyncio
    async def test_periodic_cleanup_handles_errors(self, db_session: Session):
        """Test periodic_cleanup handles errors gracefully (lines 41-48)."""
        from unittest.mock import patch
        
        # Mock cleanup_expired_sessions to raise an error
        with patch('app.tasks.cleanup_expired_sessions', side_effect=Exception("Cleanup error")):
            # Start periodic cleanup with very short interval (0.05 seconds)
            cleanup_task = asyncio.create_task(periodic_cleanup(interval_hours=0.05 / 3600))
            
            # Wait a bit to allow cleanup to run and handle error
            await asyncio.sleep(0.1)
            
            # Task should still be running despite errors (error handling in lines 44-45)
            assert not cleanup_task.done(), "Task should continue running despite errors"
            
            # Cancel the task immediately to prevent infinite loop
            cleanup_task.cancel()
            try:
                await asyncio.wait_for(cleanup_task, timeout=0.1)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass


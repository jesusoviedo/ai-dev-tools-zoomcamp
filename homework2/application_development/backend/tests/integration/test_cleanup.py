"""Integration tests for session cleanup task."""

import pytest
from datetime import UTC, datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, drop_db
from app.models import Session as SessionModel
from app.tasks import cleanup_expired_sessions


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


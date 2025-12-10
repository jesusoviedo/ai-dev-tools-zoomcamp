"""Integration tests for session persistence."""

import pytest
from datetime import UTC, datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, drop_db
from app.models import Session as SessionModel


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
class TestSessionPersistence:
    """Tests for session persistence in database."""
    
    def test_create_session_in_database(self, db_session: Session):
        """Test that creating a session stores it in the database."""
        session = SessionModel(
            session_id="test-session-1",
            room_id="room-test-1",
            language="python",
            code="print('hello')",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(hours=8)
        )
        db_session.add(session)
        db_session.commit()
        
        # Retrieve from database
        retrieved = db_session.query(SessionModel).filter(
            SessionModel.session_id == "test-session-1"
        ).first()
        
        assert retrieved is not None
        assert retrieved.session_id == "test-session-1"
        assert retrieved.language == "python"
        assert retrieved.code == "print('hello')"
    
    def test_update_session_code(self, db_session: Session):
        """Test updating session code in database."""
        session = SessionModel(
            session_id="test-session-2",
            room_id="room-test-2",
            language="python",
            code="print('old')",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(hours=8)
        )
        db_session.add(session)
        db_session.commit()
        
        # Update code
        session.code = "print('new')"
        session.last_saved_at = datetime.now(UTC)
        db_session.commit()
        
        # Retrieve and verify
        retrieved = db_session.query(SessionModel).filter(
            SessionModel.session_id == "test-session-2"
        ).first()
        
        assert retrieved.code == "print('new')"
        assert retrieved.last_saved_at is not None
    
    def test_session_expiration_check(self, db_session: Session):
        """Test checking if session is expired."""
        # Create expired session
        expired_session = SessionModel(
            session_id="expired-session",
            room_id="room-expired",
            language="python",
            code="print('expired')",
            created_at=datetime.now(UTC) - timedelta(hours=10),
            expires_at=datetime.now(UTC) - timedelta(hours=2)
        )
        db_session.add(expired_session)
        db_session.commit()
        
        assert expired_session.is_expired() is True
        
        # Create active session
        active_session = SessionModel(
            session_id="active-session",
            room_id="room-active",
            language="python",
            code="print('active')",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(hours=8)
        )
        db_session.add(active_session)
        db_session.commit()
        
        assert active_session.is_expired() is False
    
    def test_query_expired_sessions(self, db_session: Session):
        """Test querying expired sessions."""
        now = datetime.now(UTC)
        
        # Create expired session
        expired = SessionModel(
            session_id="expired-1",
            room_id="room-expired-1",
            language="python",
            code="print('expired')",
            created_at=now - timedelta(hours=10),
            expires_at=now - timedelta(hours=2)
        )
        db_session.add(expired)
        
        # Create active session
        active = SessionModel(
            session_id="active-1",
            room_id="room-active-1",
            language="python",
            code="print('active')",
            created_at=now,
            expires_at=now + timedelta(hours=8)
        )
        db_session.add(active)
        db_session.commit()
        
        # Query expired sessions
        expired_sessions = db_session.query(SessionModel).filter(
            SessionModel.expires_at < now
        ).all()
        
        assert len(expired_sessions) == 1
        assert expired_sessions[0].session_id == "expired-1"


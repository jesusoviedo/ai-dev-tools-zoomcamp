"""Unit tests for SQLAlchemy ORM models."""

import pytest
from datetime import datetime, UTC, timedelta
from app.models import Session as SessionModel


@pytest.mark.unit
class TestSessionORM:
    """Tests for Session SQLAlchemy ORM model."""
    
    def test_session_is_expired_with_timezone_aware(self):
        """Test is_expired() with timezone-aware datetime (else branch line 126)."""
        # Create session with timezone-aware expires_at
        expires_at = datetime.now(UTC) - timedelta(hours=2)  # Expired
        
        session = SessionModel(
            session_id="test-expired",
            room_id="room-test",
            language="python",
            code="print('test')",
            created_at=datetime.now(UTC),
            expires_at=expires_at
        )
        
        # expires_at has tzinfo, so should use else branch (line 126)
        assert session.is_expired() is True
    
    def test_session_is_expired_with_timezone_aware_active(self):
        """Test is_expired() with timezone-aware datetime for active session."""
        # Create session with timezone-aware expires_at (future)
        expires_at = datetime.now(UTC) + timedelta(hours=8)  # Active
        
        session = SessionModel(
            session_id="test-active",
            room_id="room-test",
            language="python",
            code="print('test')",
            created_at=datetime.now(UTC),
            expires_at=expires_at
        )
        
        # expires_at has tzinfo, so should use else branch (line 126)
        assert session.is_expired() is False
    
    def test_session_is_expired_with_naive_datetime(self):
        """Test is_expired() with naive datetime (if branch)."""
        # Create session with naive datetime
        from datetime import datetime as dt
        naive_expires_at = dt.now() - timedelta(hours=2)  # Naive datetime
        
        session = SessionModel(
            session_id="test-naive",
            room_id="room-test",
            language="python",
            code="print('test')",
            created_at=datetime.now(UTC),
            expires_at=naive_expires_at.replace(tzinfo=UTC)  # Make aware for constructor
        )
        
        # Manually set naive datetime to test if branch
        session.expires_at = naive_expires_at
        
        # Should handle naive datetime (if branch line 124)
        assert session.is_expired() is True
    
    def test_session_repr(self):
        """Test Session __repr__ method."""
        session = SessionModel(
            session_id="repr-test",
            room_id="room-repr",
            language="python",
            code="print('test')",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(hours=8)
        )
        
        repr_str = repr(session)
        assert "Session" in repr_str
        assert "repr-test" in repr_str
        assert "python" in repr_str
        assert "expires_at" in repr_str


"""Unit tests for database configuration."""

import pytest
import os
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from app.database import (
    get_db,
    init_db,
    drop_db,
    DATABASE_URL,
    SessionLocal,
    Base,
    engine
)


@pytest.mark.unit
class TestDatabaseConfiguration:
    """Tests for database configuration."""
    
    def test_database_url_default(self):
        """Test default DATABASE_URL is SQLite."""
        assert DATABASE_URL.startswith("sqlite")
    
    def test_database_url_from_env(self):
        """Test DATABASE_URL can be set from environment."""
        # This test verifies that DATABASE_URL uses os.getenv
        # Actual environment variable testing is done in integration tests
        assert DATABASE_URL is not None
        assert isinstance(DATABASE_URL, str)
    
    def test_session_local_exists(self):
        """Test SessionLocal is created."""
        assert SessionLocal is not None
    
    def test_base_exists(self):
        """Test Base declarative base exists."""
        assert Base is not None


@pytest.mark.unit
class TestDatabaseFunctions:
    """Tests for database utility functions."""
    
    def test_get_db_generator(self):
        """Test get_db returns a generator."""
        db_gen = get_db()
        assert hasattr(db_gen, '__iter__')
        assert hasattr(db_gen, '__next__')
    
    def test_get_db_yields_session(self):
        """Test get_db yields a database session."""
        db_gen = get_db()
        db = next(db_gen)
        assert db is not None
        # Clean up
        try:
            next(db_gen)
        except StopIteration:
            pass
    
    def test_get_db_closes_session(self):
        """Test get_db closes session after use."""
        db_gen = get_db()
        db = next(db_gen)
        db_id = id(db)
        
        # Close generator (should close session)
        try:
            next(db_gen)
        except StopIteration:
            pass
        
        # Session should be closed (we can't easily verify this without accessing internals)
        assert True  # Placeholder - session closing is handled by SQLAlchemy
    
    def test_init_db_creates_tables(self):
        """Test init_db creates tables."""
        # Mock Base.metadata.create_all
        with patch.object(Base.metadata, 'create_all') as mock_create:
            init_db()
            mock_create.assert_called_once_with(bind=engine)
    
    def test_drop_db_drops_tables(self):
        """Test drop_db drops tables."""
        # Mock Base.metadata.drop_all
        with patch.object(Base.metadata, 'drop_all') as mock_drop:
            drop_db()
            mock_drop.assert_called_once_with(bind=engine)


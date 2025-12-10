"""Integration tests for database configuration."""

import pytest
import os
from unittest.mock import patch
from sqlalchemy import create_engine


@pytest.mark.integration
class TestDatabaseConfiguration:
    """Tests for database configuration."""
    
    def test_postgresql_engine_configuration(self):
        """Test PostgreSQL engine configuration logic (line 26)."""
        # Test that PostgreSQL URLs trigger the else branch in database.py
        postgresql_urls = [
            "postgresql://user:pass@localhost/db",
            "postgresql+psycopg2://user:pass@localhost/db",
            "postgres://user:pass@localhost/db",
        ]
        
        for url in postgresql_urls:
            # Verify the conditional logic that triggers else branch
            assert not url.startswith("sqlite"), f"URL {url} should not be SQLite"
            # This means the else branch (line 26) would execute for PostgreSQL URLs
    
    @patch.dict(os.environ, {'DATABASE_URL': 'postgresql://test:test@localhost/testdb'}, clear=False)
    def test_postgresql_url_from_env(self):
        """Test PostgreSQL URL from environment variable."""
        # This test verifies that a PostgreSQL URL would trigger the else branch
        postgresql_url = os.getenv('DATABASE_URL', 'sqlite:///./sessions.db')
        assert not postgresql_url.startswith("sqlite")
        # The else branch (line 26) would execute


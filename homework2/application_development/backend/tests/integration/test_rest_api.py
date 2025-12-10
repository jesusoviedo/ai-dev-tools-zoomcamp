"""Integration tests for REST API endpoints."""

import pytest
from datetime import UTC, datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from app.database import init_db, drop_db, engine, SessionLocal
from app.models import Session as SessionModel
from sqlalchemy import text


@pytest.fixture(scope="function")
def client():
    """Create a test client."""
    # Initialize database before each test
    init_db()
    yield TestClient(app)
    # Clean up after test
    drop_db()


@pytest.mark.integration
class TestHealthEndpoint:
    """Tests for GET /health endpoint."""
    
    def test_health_check_success(self, client):
        """Test health check returns 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
    
    def test_health_check_response_structure(self, client):
        """Test health check response structure."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["status"], str)
        assert isinstance(data["timestamp"], str)


@pytest.mark.integration
class TestCreateSessionEndpoint:
    """Tests for POST /api/sessions endpoint."""
    
    def test_create_session_default_values(self, client):
        """Test creating session with default values."""
        response = client.post("/api/sessions")
        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert "room_id" in data
        assert "share_url" in data
        assert data["language"] == "python"
        assert data["initial_code"] == "# Escribe tu código aquí"
        assert data["active_users"] == 0
        assert data["title"] is None
    
    def test_create_session_custom_language(self, client):
        """Test creating session with custom language."""
        response = client.post(
            "/api/sessions",
            json={"language": "javascript"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["language"] == "javascript"
    
    def test_create_session_custom_code(self, client):
        """Test creating session with custom initial code."""
        custom_code = "console.log('Hello');"
        response = client.post(
            "/api/sessions",
            json={"initial_code": custom_code}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["initial_code"] == custom_code
    
    def test_create_session_with_title(self, client):
        """Test creating session with title."""
        response = client.post(
            "/api/sessions",
            json={"title": "My Test Session"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My Test Session"
    
    def test_create_session_all_fields(self, client):
        """Test creating session with all fields."""
        response = client.post(
            "/api/sessions",
            json={
                "language": "typescript",
                "initial_code": "const x: number = 42;",
                "title": "TypeScript Session"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["language"] == "typescript"
        assert data["initial_code"] == "const x: number = 42;"
        assert data["title"] == "TypeScript Session"
    
    def test_create_session_invalid_language(self, client):
        """Test creating session with invalid language."""
        response = client.post(
            "/api/sessions",
            json={"language": "invalid_language"}
        )
        assert response.status_code == 422  # Validation error


@pytest.mark.integration
class TestGetSessionEndpoint:
    """Tests for GET /api/sessions/{session_id} endpoint."""
    
    def test_get_session_success(self, client):
        """Test getting an existing session."""
        # Create a session first
        create_response = client.post("/api/sessions")
        assert create_response.status_code == 201
        session_id = create_response.json()["session_id"]
        
        # Get the session
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert "room_id" in data
        assert "share_url" in data
    
    def test_get_session_not_found(self, client):
        """Test getting a non-existent session."""
        response = client.get("/api/sessions/non-existent-session-id")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_get_session_response_structure(self, client):
        """Test get session response structure."""
        # Create a session first
        create_response = client.post("/api/sessions")
        session_id = create_response.json()["session_id"]
        
        # Get the session
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "room_id" in data
        assert "share_url" in data
        assert "language" in data
        assert "initial_code" in data
        assert "created_at" in data
        assert "active_users" in data
    
    def test_get_session_preserves_data(self, client):
        """Test that get session preserves session data."""
        # Create a session with custom data
        create_response = client.post(
            "/api/sessions",
            json={
                "language": "java",
                "initial_code": "public class Main {}",
                "title": "Java Session"
            }
        )
        session_id = create_response.json()["session_id"]
        
        # Get the session
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "java"
        assert data["initial_code"] == "public class Main {}"
        assert data["title"] == "Java Session"
    
    def test_get_session_includes_last_saved_at(self, client):
        """Test that get session includes last_saved_at field."""
        # Create a session first
        create_response = client.post("/api/sessions")
        session_id = create_response.json()["session_id"]
        
        # Get the session
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "last_saved_at" in data
        # Initially should be None
        assert data["last_saved_at"] is None


@pytest.mark.integration
class TestSaveCodeEndpoint:
    """Tests for PUT /api/sessions/{session_id}/code endpoint."""
    
    def test_save_code_success(self, client):
        """Test saving code to an existing session."""
        # Create a session first
        create_response = client.post("/api/sessions", json={
            "language": "python",
            "initial_code": "print('hello')"
        })
        session_id = create_response.json()["session_id"]
        
        # Save new code
        new_code = "print('updated')"
        response = client.put(
            f"/api/sessions/{session_id}/code",
            json={"code": new_code}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["initial_code"] == new_code
        assert data["last_saved_at"] is not None
    
    def test_save_code_not_found(self, client):
        """Test saving code to a non-existent session."""
        response = client.put(
            "/api/sessions/non-existent-session-id/code",
            json={"code": "print('test')"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_save_code_updates_last_saved_at(self, client):
        """Test that saving code updates last_saved_at timestamp."""
        # Create a session first
        create_response = client.post("/api/sessions")
        session_id = create_response.json()["session_id"]
        
        # Get initial session (last_saved_at should be None)
        get_response = client.get(f"/api/sessions/{session_id}")
        assert get_response.json()["last_saved_at"] is None
        
        # Save code
        save_response = client.put(
            f"/api/sessions/{session_id}/code",
            json={"code": "print('test')"}
        )
        assert save_response.status_code == 200
        assert save_response.json()["last_saved_at"] is not None
        
        # Verify it's updated in get session
        get_response2 = client.get(f"/api/sessions/{session_id}")
        assert get_response2.json()["last_saved_at"] is not None
    
    def test_save_code_preserves_other_fields(self, client):
        """Test that saving code preserves other session fields."""
        # Create a session with custom data
        create_response = client.post("/api/sessions", json={
            "language": "javascript",
            "initial_code": "console.log('hello')",
            "title": "Test Session"
        })
        session_id = create_response.json()["session_id"]
        
        # Save new code
        new_code = "console.log('updated')"
        response = client.put(
            f"/api/sessions/{session_id}/code",
            json={"code": new_code}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert data["language"] == "javascript"
        assert data["title"] == "Test Session"
        assert data["initial_code"] == new_code
    
    def test_save_code_empty_code(self, client):
        """Test saving empty code."""
        # Create a session first
        create_response = client.post("/api/sessions")
        session_id = create_response.json()["session_id"]
        
        # Save empty code
        response = client.put(
            f"/api/sessions/{session_id}/code",
            json={"code": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["initial_code"] == ""
    
    def test_get_session_expired_returns_410(self, client):
        """Test get_session returns 410 for expired session (line 109)."""
        # Create an expired session directly in the database
        db = SessionLocal()
        try:
            now = datetime.now(UTC)
            expired_session = SessionModel(
                session_id="expired-session-410",
                room_id="room-expired-410",
                language="python",
                code="print('expired')",
                created_at=now - timedelta(hours=10),
                expires_at=now - timedelta(hours=2)  # Expired 2 hours ago
            )
            db.add(expired_session)
            db.commit()
            
            # Try to get the expired session via API
            response = client.get("/api/sessions/expired-session-410")
            assert response.status_code == 410
            data = response.json()
            assert "detail" in data
            assert "expirado" in data["detail"].lower() or "expired" in data["detail"].lower()
        finally:
            db.close()
    
    def test_save_code_expired_returns_410(self, client):
        """Test save_code returns 410 for expired session (line 150)."""
        # Create an expired session directly in the database
        db = SessionLocal()
        try:
            now = datetime.now(UTC)
            expired_session = SessionModel(
                session_id="expired-save-410",
                room_id="room-expired-save-410",
                language="python",
                code="print('expired')",
                created_at=now - timedelta(hours=10),
                expires_at=now - timedelta(hours=2)  # Expired 2 hours ago
            )
            db.add(expired_session)
            db.commit()
            
            # Try to save code to the expired session via API
            response = client.put(
                "/api/sessions/expired-save-410/code",
                json={"code": "print('new code')"}
            )
            assert response.status_code == 410
            data = response.json()
            assert "detail" in data
            assert "expirado" in data["detail"].lower() or "expired" in data["detail"].lower()
        finally:
            db.close()


"""Integration tests for REST API endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


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


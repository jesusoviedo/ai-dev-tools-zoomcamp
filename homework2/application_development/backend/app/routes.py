"""REST API routes."""

import secrets
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException, status
from app.models import (
    HealthResponse,
    CreateSessionRequest,
    SessionResponse,
    ErrorResponse
)

router = APIRouter()

# In-memory storage for sessions (will be replaced with database later)
sessions: Dict[str, dict] = {}


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Verifica el estado del servidor y retorna el estado actual.
    """
    return HealthResponse()


@router.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, tags=["sessions"])
async def create_session(request: CreateSessionRequest = CreateSessionRequest()) -> SessionResponse:
    """
    Crear nueva sesión de código.
    
    Crea una nueva sesión de código y retorna el ID de la sesión y el enlace para compartir.
    """
    # Generate unique session ID
    session_id = secrets.token_urlsafe(16)
    room_id = f"room-{session_id}"
    
    # Create session data
    session_data = {
        "session_id": session_id,
        "room_id": room_id,
        "language": request.language or "python",
        "initial_code": request.initial_code or "# Escribe tu código aquí",
        "title": request.title,
        "created_at": datetime.utcnow(),
        "active_users": 0,
        "current_code": request.initial_code or "# Escribe tu código aquí"
    }
    
    sessions[session_id] = session_data
    
    # Generate share URL (frontend URL)
    share_url = f"http://localhost:5173/session/{session_id}"
    
    return SessionResponse(
        session_id=session_id,
        room_id=room_id,
        share_url=share_url,
        language=session_data["language"],
        initial_code=session_data["initial_code"],
        title=session_data["title"],
        created_at=session_data["created_at"],
        active_users=0
    )


@router.get("/api/sessions/{session_id}", response_model=SessionResponse, tags=["sessions"])
async def get_session(session_id: str) -> SessionResponse:
    """
    Obtener información de sesión.
    
    Obtiene la información de una sesión de código existente.
    """
    if session_id not in sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesión con ID '{session_id}' no encontrada"
        )
    
    session_data = sessions[session_id]
    share_url = f"http://localhost:5173/session/{session_id}"
    
    return SessionResponse(
        session_id=session_data["session_id"],
        room_id=session_data["room_id"],
        share_url=share_url,
        language=session_data["language"],
        initial_code=session_data.get("current_code", session_data["initial_code"]),
        title=session_data["title"],
        created_at=session_data["created_at"],
        active_users=session_data["active_users"]
    )


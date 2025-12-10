"""REST API routes."""

import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Dict
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models import (
    HealthResponse,
    CreateSessionRequest,
    SessionResponse,
    SaveCodeRequest,
    ErrorResponse,
    Session as SessionModel
)
from app.database import get_db, init_db

router = APIRouter()

# Session duration configuration (5-12 hours)
SESSION_DURATION_HOURS = int(os.getenv("SESSION_DURATION_HOURS", "8"))
if SESSION_DURATION_HOURS < 5 or SESSION_DURATION_HOURS > 12:
    SESSION_DURATION_HOURS = 8  # Default to 8 hours if invalid


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Verifica el estado del servidor y retorna el estado actual.
    """
    return HealthResponse()


@router.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, tags=["sessions"])
async def create_session(
    request: CreateSessionRequest = CreateSessionRequest(),
    db: Session = Depends(get_db)
) -> SessionResponse:
    """
    Crear nueva sesión de código.
    
    Crea una nueva sesión de código y retorna el ID de la sesión y el enlace para compartir.
    """
    # Generate unique session ID
    session_id = secrets.token_urlsafe(16)
    room_id = f"room-{session_id}"
    
    # Calculate expiration time (5-12 hours from now)
    created_at = datetime.now(UTC)
    expires_at = created_at + timedelta(hours=SESSION_DURATION_HOURS)
    
    initial_code = request.initial_code or "# Escribe tu código aquí"
    
    # Create session in database
    db_session = SessionModel(
        session_id=session_id,
        room_id=room_id,
        language=request.language or "python",
        code=initial_code,
        title=request.title,
        created_at=created_at,
        expires_at=expires_at,
        active_users=0
    )
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Generate share URL (frontend URL)
    share_url = f"http://localhost:5173/session/{session_id}"
    
    return SessionResponse(
        session_id=db_session.session_id,
        room_id=db_session.room_id,
        share_url=share_url,
        language=db_session.language,
        initial_code=db_session.code,
        title=db_session.title,
        created_at=db_session.created_at,
        active_users=db_session.active_users,
        last_saved_at=db_session.last_saved_at
    )


@router.get("/api/sessions/{session_id}", response_model=SessionResponse, tags=["sessions"])
async def get_session(
    session_id: str,
    db: Session = Depends(get_db)
) -> SessionResponse:
    """
    Obtener información de sesión.
    
    Obtiene la información de una sesión de código existente.
    """
    db_session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesión con ID '{session_id}' no encontrada"
        )
    
    # Check if session has expired
    if db_session.is_expired():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Sesión con ID '{session_id}' ha expirado"
        )
    
    share_url = f"http://localhost:5173/session/{session_id}"
    
    return SessionResponse(
        session_id=db_session.session_id,
        room_id=db_session.room_id,
        share_url=share_url,
        language=db_session.language,
        initial_code=db_session.code,
        title=db_session.title,
        created_at=db_session.created_at,
        active_users=db_session.active_users,
        last_saved_at=db_session.last_saved_at
    )


@router.put("/api/sessions/{session_id}/code", response_model=SessionResponse, tags=["sessions"])
async def save_code(
    session_id: str,
    request: SaveCodeRequest,
    db: Session = Depends(get_db)
) -> SessionResponse:
    """
    Guardar código de una sesión.
    
    Actualiza el código de una sesión existente y marca la fecha de último guardado.
    """
    db_session = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesión con ID '{session_id}' no encontrada"
        )
    
    # Check if session has expired
    if db_session.is_expired():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Sesión con ID '{session_id}' ha expirado"
        )
    
    # Update code and last_saved_at
    db_session.code = request.code
    db_session.last_saved_at = datetime.now(UTC)
    
    db.commit()
    db.refresh(db_session)
    
    share_url = f"http://localhost:5173/session/{session_id}"
    
    return SessionResponse(
        session_id=db_session.session_id,
        room_id=db_session.room_id,
        share_url=share_url,
        language=db_session.language,
        initial_code=db_session.code,
        title=db_session.title,
        created_at=db_session.created_at,
        active_users=db_session.active_users,
        last_saved_at=db_session.last_saved_at
    )


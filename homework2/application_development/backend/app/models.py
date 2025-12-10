"""Pydantic models for request/response validation and SQLAlchemy ORM models."""

from datetime import UTC, datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Integer, DateTime, Text, Index
from sqlalchemy.sql import func
from app.database import Base


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(default="ok", description="Estado del servidor")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Timestamp de la verificación")


class CreateSessionRequest(BaseModel):
    """Request model for creating a new session."""
    language: Optional[str] = Field(
        default="python",
        description="Lenguaje de programación inicial",
        pattern="^(python|javascript|typescript|java|cpp)$"
    )
    initial_code: Optional[str] = Field(
        default="# Escribe tu código aquí",
        description="Código inicial de la sesión"
    )
    title: Optional[str] = Field(
        default=None,
        description="Título opcional de la sesión"
    )


class SessionResponse(BaseModel):
    """Response model for session endpoints."""
    session_id: str = Field(description="ID único de la sesión")
    room_id: str = Field(description="ID de la sala para WebSocket")
    share_url: str = Field(description="URL para compartir la sesión")
    language: str = Field(description="Lenguaje de programación")
    initial_code: str = Field(description="Código inicial")
    title: Optional[str] = Field(default=None, description="Título de la sesión")
    created_at: datetime = Field(description="Fecha de creación")
    active_users: int = Field(default=0, ge=0, description="Número de usuarios activos en la sesión")
    last_saved_at: Optional[datetime] = Field(default=None, description="Fecha del último guardado")


class SaveCodeRequest(BaseModel):
    """Request model for saving code."""
    code: str = Field(description="Código a guardar")


class ErrorResponse(BaseModel):
    """Standard error response model."""
    error: str = Field(description="Tipo de error")
    message: str = Field(description="Mensaje descriptivo del error")
    details: Optional[dict] = Field(default=None, description="Detalles adicionales del error")


# WebSocket Message Models
class CodeChangeMessage(BaseModel):
    """WebSocket message for code changes."""
    type: str = Field(default="code_change", description="Tipo de mensaje")
    code: Optional[str] = Field(default=None, description="Código completo (fallback)")
    cursor_position: Optional[int] = Field(default=None, ge=0, description="Posición del cursor")
    user_id: Optional[str] = Field(default=None, description="ID del usuario (solo en mensajes del servidor)")
    # Diff fields for incremental updates
    from_pos: Optional[int] = Field(default=None, ge=0, description="Posición inicial del cambio (diff)")
    to_pos: Optional[int] = Field(default=None, ge=0, description="Posición final del cambio (diff)")
    insert: Optional[str] = Field(default=None, description="Texto insertado (diff)")
    delete_length: Optional[int] = Field(default=None, ge=0, description="Cantidad de caracteres eliminados (diff)")
    timestamp: Optional[datetime] = Field(default=None, description="Timestamp del cambio para resolución de conflictos")


class JoinMessage(BaseModel):
    """WebSocket message for user joining."""
    type: str = Field(default="join", description="Tipo de mensaje")
    username: str = Field(description="Nombre del usuario que se une")


class LeaveMessage(BaseModel):
    """WebSocket message for user leaving."""
    type: str = Field(default="leave", description="Tipo de mensaje")


class UserJoinedMessage(BaseModel):
    """WebSocket message notifying user joined."""
    type: str = Field(default="user_joined", description="Tipo de mensaje")
    user_id: str = Field(description="ID del usuario")
    username: str = Field(description="Nombre del usuario")


class UserLeftMessage(BaseModel):
    """WebSocket message notifying user left."""
    type: str = Field(default="user_left", description="Tipo de mensaje")
    user_id: str = Field(description="ID del usuario que se desconectó")


class ErrorMessage(BaseModel):
    """WebSocket error message."""
    type: str = Field(default="error", description="Tipo de mensaje")
    message: str = Field(description="Mensaje de error")


class CursorChangeMessage(BaseModel):
    """WebSocket message for cursor position changes."""
    type: str = Field(default="cursor_change", description="Tipo de mensaje")
    line: int = Field(ge=1, description="Número de línea (1-indexed)")
    column: int = Field(ge=0, description="Columna (0-indexed)")
    user_id: Optional[str] = Field(default=None, description="ID del usuario (solo en mensajes del servidor)")


# SQLAlchemy ORM Models
class Session(Base):
    """SQLAlchemy model for sessions table."""
    __tablename__ = "sessions"
    
    session_id = Column(String, primary_key=True, index=True)
    room_id = Column(String, nullable=False, index=True)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_saved_at = Column(DateTime(timezone=True), nullable=True)
    active_users = Column(Integer, default=0, nullable=False)
    
    # Index for efficient expiration queries
    __table_args__ = (
        Index('idx_expires_at', 'expires_at'),
    )
    
    def is_expired(self) -> bool:
        """Check if session has expired."""
        now = datetime.now(UTC)
        # Ensure expires_at is timezone-aware
        if self.expires_at.tzinfo is None:
            # If expires_at is naive, assume it's UTC
            expires_at_aware = self.expires_at.replace(tzinfo=UTC)
        else:
            expires_at_aware = self.expires_at
        return now > expires_at_aware
    
    def __repr__(self):
        return f"<Session(session_id={self.session_id}, language={self.language}, expires_at={self.expires_at})>"


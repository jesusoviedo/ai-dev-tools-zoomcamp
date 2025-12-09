"""Pydantic models for request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(default="ok", description="Estado del servidor")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp de la verificación")


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


class ErrorResponse(BaseModel):
    """Standard error response model."""
    error: str = Field(description="Tipo de error")
    message: str = Field(description="Mensaje descriptivo del error")
    details: Optional[dict] = Field(default=None, description="Detalles adicionales del error")


# WebSocket Message Models
class CodeChangeMessage(BaseModel):
    """WebSocket message for code changes."""
    type: str = Field(default="code_change", description="Tipo de mensaje")
    code: str = Field(description="Código actualizado")
    cursor_position: Optional[int] = Field(default=None, ge=0, description="Posición del cursor")
    user_id: Optional[str] = Field(default=None, description="ID del usuario (solo en mensajes del servidor)")


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


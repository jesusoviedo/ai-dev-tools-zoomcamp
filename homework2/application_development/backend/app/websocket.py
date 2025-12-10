"""WebSocket handlers for real-time collaboration."""

import json
import secrets
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from app.models import (
    CodeChangeMessage,
    CursorChangeMessage,
    JoinMessage,
    LeaveMessage,
    UserJoinedMessage,
    UserLeftMessage,
    ErrorMessage
)
from datetime import datetime

# Store active connections: room_id -> Set[WebSocket]
active_connections: Dict[str, Set[WebSocket]] = {}

# Store user info: websocket -> {user_id, username, room_id}
user_info: Dict[WebSocket, dict] = {}

# Store last activity time for each room: room_id -> datetime
room_last_activity: Dict[str, datetime] = {}


class ConnectionManager:
    """Manages WebSocket connections for rooms."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, username: str = "Anonymous"):
        """Connect a user to a room."""
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        
        user_id = secrets.token_urlsafe(8)
        self.active_connections[room_id].add(websocket)
        self.user_info[websocket] = {
            "user_id": user_id,
            "username": username,
            "room_id": room_id
        }
        
        # Update last activity time for the room
        room_last_activity[room_id] = datetime.now()
        
        # Notify other users in the room
        await self.broadcast_user_joined(room_id, user_id, username, websocket)
        
        return user_id
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a user from a room."""
        if websocket not in self.user_info:
            return None
        
        user_data = self.user_info[websocket]
        room_id = user_data["room_id"]
        user_id = user_data["user_id"]
        username = user_data["username"]
        
        # Remove from connections
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                # Room is empty, update last activity time
                room_last_activity[room_id] = datetime.now()
                del self.active_connections[room_id]
            else:
                # Room still has users, update last activity time
                room_last_activity[room_id] = datetime.now()
        
        del self.user_info[websocket]
        
        # Notify other users
        return room_id, user_id, username
    
    async def broadcast_code_change(
        self, 
        room_id: str, 
        code: str = None, 
        cursor_position: int = None, 
        user_id: str = None,
        from_pos: int = None,
        to_pos: int = None,
        insert: str = None,
        delete_length: int = None,
        timestamp: datetime = None,
        exclude: WebSocket = None
    ):
        """Broadcast code changes to all users in a room. Supports both full code and diffs."""
        if room_id not in self.active_connections:
            return
        
        # Validate diff if provided
        has_diff = from_pos is not None and to_pos is not None and insert is not None
        if has_diff:
            # Validate diff parameters
            if from_pos < 0 or to_pos < from_pos:
                # Invalid diff, fall back to full code
                has_diff = False
        
        # Create message with diff or full code
        if has_diff and code is None:
            # Diff only (preferred for efficiency)
            message = CodeChangeMessage(
                type="code_change",
                from_pos=from_pos,
                to_pos=to_pos,
                insert=insert,
                delete_length=delete_length,
                user_id=user_id,
                timestamp=timestamp or datetime.utcnow()
            )
        else:
            # Full code (fallback or explicit)
            message = CodeChangeMessage(
                type="code_change",
                code=code,
                cursor_position=cursor_position or 0,
                user_id=user_id,
                timestamp=timestamp or datetime.utcnow()
            )
        
        message_json = message.model_dump_json()
        
        # Update last activity time for the room
        if room_id in room_last_activity:
            room_last_activity[room_id] = datetime.now()
        
        disconnected = []
        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_cursor_change(self, room_id: str, line: int, column: int, user_id: str, exclude: WebSocket = None):
        """Broadcast cursor position changes to all users in a room."""
        if room_id not in self.active_connections:
            return
        
        message = CursorChangeMessage(
            type="cursor_change",
            line=line,
            column=column,
            user_id=user_id
        )
        
        message_json = message.model_dump_json()
        
        disconnected = []
        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_user_joined(self, room_id: str, user_id: str, username: str, exclude: WebSocket = None):
        """Broadcast user joined notification."""
        if room_id not in self.active_connections:
            return
        
        message = UserJoinedMessage(
            type="user_joined",
            user_id=user_id,
            username=username
        )
        
        message_json = message.model_dump_json()
        
        disconnected = []
        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_user_left(self, room_id: str, user_id: str):
        """Broadcast user left notification."""
        if room_id not in self.active_connections:
            return
        
        message = UserLeftMessage(
            type="user_left",
            user_id=user_id
        )
        
        message_json = message.model_dump_json()
        
        disconnected = []
        for connection in self.active_connections[room_id]:
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)


# Global connection manager instance
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for real-time collaboration.
    
    Handles:
    - User connections/disconnections
    - Code change broadcasts
    - User join/leave notifications
    """
    user_id = None
    
    try:
        # Accept connection and get username from initial message
        await websocket.accept()
        
        # Wait for join message
        initial_message = await websocket.receive_text()
        try:
            join_data = json.loads(initial_message)
            join_msg = JoinMessage(**join_data)
            username = join_msg.username or "Anonymous"
        except Exception:
            username = "Anonymous"
        
        # Connect user
        user_id = await manager.connect(websocket, room_id, username)
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                if message_type == "code_change":
                    code_msg = CodeChangeMessage(**message_data)
                    # Broadcast to all other users in the room
                    # Support both diff and full code messages
                    await manager.broadcast_code_change(
                        room_id=room_id,
                        code=code_msg.code,
                        cursor_position=code_msg.cursor_position,
                        user_id=user_id,
                        from_pos=code_msg.from_pos,
                        to_pos=code_msg.to_pos,
                        insert=code_msg.insert,
                        delete_length=code_msg.delete_length,
                        timestamp=code_msg.timestamp,
                        exclude=websocket
                    )
                elif message_type == "cursor_change":
                    cursor_msg = CursorChangeMessage(**message_data)
                    # Broadcast cursor position changes
                    await manager.broadcast_cursor_change(
                        room_id=room_id,
                        line=cursor_msg.line,
                        column=cursor_msg.column,
                        user_id=user_id,
                        exclude=websocket
                    )
                elif message_type == "leave":
                    break
                else:
                    # Send error for unknown message type
                    error_msg = ErrorMessage(
                        type="error",
                        message=f"Tipo de mensaje desconocido: {message_type}"
                    )
                    await websocket.send_text(error_msg.model_dump_json())
            
            except Exception as e:
                # Send error message
                error_msg = ErrorMessage(
                    type="error",
                    message=f"Error al procesar el mensaje: {str(e)}"
                )
                await websocket.send_text(error_msg.model_dump_json())
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        error_msg = ErrorMessage(
            type="error",
            message=f"Error en la conexión WebSocket: {str(e)}"
        )
        try:
            await websocket.send_text(error_msg.model_dump_json())
        except:
            pass
    finally:
        # Clean up connection
        disconnect_data = manager.disconnect(websocket)
        if disconnect_data:
            room_id, user_id, username = disconnect_data
            await manager.broadcast_user_left(room_id, user_id)



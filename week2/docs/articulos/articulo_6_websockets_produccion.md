# WebSockets en Producción: Construyendo Colaboración en Tiempo Real con FastAPI y React

## Del Concepto a la Implementación: Una Guía Completa para Aplicaciones Colaborativas Escalables

Las aplicaciones colaborativas en tiempo real han transformado la forma en que trabajamos y aprendemos. Desde editores de código compartidos hasta plataformas de entrevistas técnicas, la capacidad de sincronizar cambios instantáneamente entre múltiples usuarios es fundamental. Sin embargo, implementar WebSockets de manera robusta y escalable presenta desafíos únicos que muchos desarrolladores subestiman.

En este artículo, exploraremos la implementación práctica de WebSockets usando FastAPI y React, basándonos en una aplicación real de plataforma de entrevistas de código. Aprenderás cómo construir un sistema de colaboración en tiempo real que maneja conexiones, desconexiones, reconexión automática y sincronización de estado entre múltiples clientes. Veremos cómo implementar un ConnectionManager robusto, manejar conflictos cuando múltiples usuarios editan simultáneamente, y asegurar que los mensajes se entreguen correctamente incluso cuando hay problemas de red.

---

## Introducción

Imagina que estás construyendo una plataforma de entrevistas de código donde el entrevistador y el candidato necesitan ver los cambios del código en tiempo real. HTTP tradicional no es suficiente aquí: necesitas comunicación bidireccional persistente. Los WebSockets proporcionan exactamente eso, pero implementarlos correctamente requiere más que solo abrir una conexión.

En este artículo, basado en una aplicación real desplegada en producción, aprenderás:

- Cómo implementar un sistema de gestión de conexiones WebSocket robusto
- Estrategias para manejar múltiples usuarios en salas colaborativas
- Técnicas de reconexión automática con backoff exponencial
- Soluciones a problemas comunes en producción (memory leaks, conexiones colgadas)
- Mejores prácticas para testing y debugging

---

## Conceptos Fundamentales

### ¿Qué son WebSockets y Cuándo Usarlos?

Los WebSockets son un protocolo de comunicación bidireccional que permite una conexión persistente entre cliente y servidor. A diferencia de HTTP, donde cada petición requiere una nueva conexión, los WebSockets mantienen la conexión abierta, permitiendo comunicación en tiempo real.

**Cuándo usar WebSockets:**
- Aplicaciones colaborativas (editores compartidos, pizarras virtuales)
- Chat en tiempo real
- Notificaciones push
- Juegos multijugador
- Dashboards con actualizaciones en vivo

**Cuándo NO usar WebSockets:**
- Operaciones CRUD simples (HTTP REST es suficiente)
- Cuando no necesitas tiempo real
- Cuando la latencia no es crítica

### Ventajas sobre Polling y Server-Sent Events

- **Polling**: El cliente pregunta constantemente al servidor si hay actualizaciones. Ineficiente y con latencia.
- **Server-Sent Events (SSE)**: El servidor puede enviar datos al cliente, pero solo en una dirección. No permite comunicación bidireccional.
- **WebSockets**: Comunicación bidireccional en tiempo real con overhead mínimo una vez establecida la conexión.

### Protocolo WebSocket: Handshake y Frames

El protocolo WebSocket comienza con un handshake HTTP especial que "actualiza" la conexión HTTP a WebSocket:

```
GET /ws/room-123 HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Si el servidor acepta, responde con:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Una vez establecida la conexión, los datos se envían en "frames" que pueden ser texto o binarios.

---

## Implementación Práctica

### Backend: ConnectionManager con FastAPI

El corazón de nuestro sistema es el `ConnectionManager`, una clase que gestiona todas las conexiones WebSocket activas. Aquí está la implementación completa basada en nuestra aplicación real:

```python
"""WebSocket handlers for real-time collaboration."""

import json
import secrets
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.models import (
    CodeChangeMessage,
    JoinMessage,
    UserJoinedMessage,
    UserLeftMessage,
    ErrorMessage
)


class ConnectionManager:
    """Manages WebSocket connections for rooms."""
    
    def __init__(self):
        # Almacenamos conexiones por room_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Almacenamos información de usuario por conexión
        self.user_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, username: str = "Anonymous"):
        """Connect a user to a room."""
        await websocket.accept()
        
        # Crear la sala si no existe
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        
        # Generar ID único para el usuario
        user_id = secrets.token_urlsafe(8)
        
        # Agregar conexión a la sala
        self.active_connections[room_id].add(websocket)
        
        # Almacenar información del usuario
        self.user_info[websocket] = {
            "user_id": user_id,
            "username": username,
            "room_id": room_id
        }
        
        # Notificar a otros usuarios en la sala
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
        
        # Remover de las conexiones activas
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            # Eliminar la sala si está vacía
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        
        # Remover información del usuario
        del self.user_info[websocket]
        
        return room_id, user_id, username
    
    async def broadcast_code_change(
        self, 
        room_id: str, 
        code: str, 
        cursor_position: int, 
        user_id: str, 
        exclude: WebSocket = None
    ):
        """Broadcast code changes to all users in a room, excluding the sender."""
        if room_id not in self.active_connections:
            return
        
        message = CodeChangeMessage(
            type="code_change",
            code=code,
            cursor_position=cursor_position,
            user_id=user_id
        )
        
        message_json = message.model_dump_json()
        
        # Lista de conexiones desconectadas para limpiar después
        disconnected = []
        
        for connection in self.active_connections[room_id]:
            # Excluir al remitente del broadcast
            if connection == exclude:
                continue
            
            try:
                await connection.send_text(message_json)
            except Exception:
                # Si falla el envío, marcar para desconexión
                disconnected.append(connection)
        
        # Limpiar conexiones desconectadas
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_user_joined(
        self, 
        room_id: str, 
        user_id: str, 
        username: str, 
        exclude: WebSocket = None
    ):
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


# Instancia global del gestor de conexiones
manager = ConnectionManager()
```

### Endpoint WebSocket en FastAPI

Ahora implementamos el endpoint que maneja las conexiones WebSocket:

```python
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
        # Aceptar la conexión
        await websocket.accept()
        
        # Esperar mensaje inicial de unión
        initial_message = await websocket.receive_text()
        try:
            join_data = json.loads(initial_message)
            join_msg = JoinMessage(**join_data)
            username = join_msg.username or "Anonymous"
        except Exception:
            username = "Anonymous"
        
        # Conectar usuario a la sala
        user_id = await manager.connect(websocket, room_id, username)
        
        # Escuchar mensajes
        while True:
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                if message_type == "code_change":
                    code_msg = CodeChangeMessage(**message_data)
                    # Broadcast a todos los demás usuarios
                    await manager.broadcast_code_change(
                        room_id=room_id,
                        code=code_msg.code,
                        cursor_position=code_msg.cursor_position or 0,
                        user_id=user_id,
                        exclude=websocket  # Excluir al remitente
                    )
                elif message_type == "leave":
                    break
                else:
                    # Enviar error para tipos de mensaje desconocidos
                    error_msg = ErrorMessage(
                        type="error",
                        message=f"Tipo de mensaje desconocido: {message_type}"
                    )
                    await websocket.send_text(error_msg.model_dump_json())
            
            except Exception as e:
                # Enviar mensaje de error
                error_msg = ErrorMessage(
                    type="error",
                    message=f"Error al procesar el mensaje: {str(e)}"
                )
                await websocket.send_text(error_msg.model_dump_json())
    
    except WebSocketDisconnect:
        # Conexión cerrada normalmente
        pass
    except Exception as e:
        # Manejar otros errores
        error_msg = ErrorMessage(
            type="error",
            message=f"Error en la conexión WebSocket: {str(e)}"
        )
        try:
            await websocket.send_text(error_msg.model_dump_json())
        except:
            pass
    finally:
        # Limpiar conexión
        disconnect_data = manager.disconnect(websocket)
        if disconnect_data:
            room_id, user_id, username = disconnect_data
            await manager.broadcast_user_left(room_id, user_id)
```

### Frontend: Hook React para WebSockets

En el frontend, creamos un hook personalizado que maneja la conexión WebSocket con reconexión automática:

```typescript
import { useEffect, useRef, useCallback, useState } from 'react'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export interface UseWebSocketReturn {
  isConnected: boolean
  sendMessage: (message: WebSocketMessage) => void
  error: string | null
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(
  roomId: string | null,
  onMessage?: (message: WebSocketMessage) => void,
  onError?: (error: Event) => void
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!roomId) {
      return
    }

    // Cerrar conexión existente si hay una
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const wsUrl = `${WS_BASE_URL}/ws/${roomId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected to room:', roomId)
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Enviar mensaje de unión
        ws.send(JSON.stringify({
          type: 'join',
          username: 'Anonymous'
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          // Manejar diferentes tipos de mensajes
          if (message.type === 'error') {
            setError(message.message || 'Unknown error')
            console.error('WebSocket error:', message.message)
          } else if (onMessage) {
            onMessage(message)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
        if (onError) {
          onError(event)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected from room:', roomId)
        setIsConnected(false)

        // Intentar reconectar si no fue cerrado manualmente
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          // Backoff exponencial: 1s, 2s, 4s, 8s, 10s (máximo)
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          setError('Failed to reconnect to WebSocket')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Error creating WebSocket:', err)
      setError('Failed to create WebSocket connection')
    }
  }, [roomId, onMessage, onError])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (err) {
        console.error('Error sending WebSocket message:', err)
        setError('Failed to send message')
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  useEffect(() => {
    if (roomId) {
      connect()
    } else {
      // Cerrar conexión si no hay roomId
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }

    // Cleanup al desmontar o cambiar roomId
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [roomId, connect])

  return {
    isConnected,
    sendMessage,
    error
  }
}
```

### Uso del Hook en un Componente

Aquí está cómo usar el hook en un componente React:

```typescript
import { useWebSocket } from './hooks/useWebSocket'
import { useState } from 'react'

function CodeEditor({ roomId }: { roomId: string }) {
  const [code, setCode] = useState('')
  
  const handleMessage = (message: WebSocketMessage) => {
    if (message.type === 'code_change') {
      setCode(message.code)
    } else if (message.type === 'user_joined') {
      console.log(`User ${message.username} joined`)
    }
  }
  
  const { isConnected, sendMessage, error } = useWebSocket(
    roomId,
    handleMessage
  )
  
  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    sendMessage({
      type: 'code_change',
      code: newCode,
      cursor_position: 0
    })
  }
  
  return (
    <div>
      {!isConnected && <div>Conectando...</div>}
      {error && <div>Error: {error}</div>}
      <textarea
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
      />
    </div>
  )
}
```

---

## Problemas Comunes y Soluciones

### Problema 1: Memory Leaks por Conexiones No Cerradas

**Síntoma:** El servidor consume cada vez más memoria y eventualmente se queda sin recursos.

**Causa:** Las conexiones WebSocket que se desconectan abruptamente (navegador cerrado, pérdida de red) no se limpian correctamente del `ConnectionManager`.

**Solución:** Implementar limpieza automática de conexiones desconectadas:

```python
async def broadcast_code_change(self, room_id: str, code: str, cursor_position: int, user_id: str, exclude: WebSocket = None):
    """Broadcast code changes with automatic cleanup of disconnected connections."""
    if room_id not in self.active_connections:
        return
    
    message = CodeChangeMessage(
        type="code_change",
        code=code,
        cursor_position=cursor_position,
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
            # Capturar excepciones y marcar para limpieza
            disconnected.append(connection)
    
    # Limpiar conexiones desconectadas inmediatamente
    for conn in disconnected:
        self.disconnect(conn)
```

**Prevención:** Siempre envuelve los envíos de mensajes en try-except y limpia las conexiones fallidas inmediatamente.

### Problema 2: Reconexión Infinita

**Síntoma:** El cliente intenta reconectarse infinitamente incluso cuando el servidor está caído.

**Causa:** No hay límite en los intentos de reconexión.

**Solución:** Implementar límite de intentos con backoff exponencial:

```typescript
const maxReconnectAttempts = 5
const reconnectAttemptsRef = useRef(0)

ws.onclose = () => {
  setIsConnected(false)

  // Solo reconectar si no excedemos el límite
  if (reconnectAttemptsRef.current < maxReconnectAttempts) {
    reconnectAttemptsRef.current++
    // Backoff exponencial con máximo de 10 segundos
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, delay)
  } else {
    setError('Failed to reconnect to WebSocket. Please refresh the page.')
  }
}
```

### Problema 3: Mensajes Perdidos Durante Reconexión

**Síntoma:** Los cambios de código se pierden cuando un usuario se reconecta.

**Causa:** El estado del código no se sincroniza después de la reconexión.

**Solución:** Enviar el estado actual al reconectar:

```typescript
ws.onopen = () => {
  setIsConnected(true)
  reconnectAttemptsRef.current = 0
  
  // Enviar mensaje de unión
  ws.send(JSON.stringify({
    type: 'join',
    username: 'Anonymous'
  }))
  
  // Solicitar estado actual del código
  ws.send(JSON.stringify({
    type: 'sync_request'
  }))
}
```

En el backend, agregar manejo de `sync_request`:

```python
if message_type == "sync_request":
    # Enviar estado actual del código al cliente que se reconecta
    current_code = get_current_code_for_room(room_id)  # Implementar según tu lógica
    sync_message = CodeChangeMessage(
        type="code_change",
        code=current_code,
        cursor_position=0,
        user_id=user_id
    )
    await websocket.send_text(sync_message.model_dump_json())
```

### Problema 4: Conexiones Colgadas sin Cerrar

**Síntoma:** Las conexiones permanecen abiertas pero inactivas, consumiendo recursos.

**Causa:** No hay mecanismo de "ping/pong" para detectar conexiones muertas.

**Solución:** Implementar ping/pong periódico:

```python
import asyncio

async def websocket_endpoint(websocket: WebSocket, room_id: str):
    user_id = None
    
    async def ping_task():
        """Envía ping cada 30 segundos para mantener la conexión viva."""
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except:
                break
    
    try:
        await websocket.accept()
        # ... código de conexión ...
        
        # Iniciar tarea de ping
        ping_task_handle = asyncio.create_task(ping_task())
        
        # ... código de mensajes ...
        
    finally:
        ping_task_handle.cancel()
        # ... código de limpieza ...
```

En el cliente, responder a pings:

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  if (message.type === 'ping') {
    // Responder con pong
    ws.send(JSON.stringify({ type: 'pong' }))
    return
  }
  
  // ... manejar otros mensajes ...
}
```

---

## Mejores Prácticas

### 1. Validación de Mensajes con Pydantic

Siempre valida los mensajes entrantes usando modelos Pydantic:

```python
from pydantic import BaseModel, Field, validator

class CodeChangeMessage(BaseModel):
    type: str = Field(default="code_change")
    code: str = Field(..., min_length=0, max_length=100000)  # Límite de tamaño
    cursor_position: Optional[int] = Field(default=None, ge=0)
    user_id: Optional[str] = Field(default=None)
    
    @validator('code')
    def validate_code(cls, v):
        # Validar que el código no contenga caracteres peligrosos
        if len(v) > 100000:
            raise ValueError('Code too long')
        return v
```

### 2. Rate Limiting

Implementa rate limiting para prevenir abuso:

```python
from collections import defaultdict
from datetime import datetime, timedelta

class RateLimiter:
    def __init__(self, max_messages: int = 100, window_seconds: int = 60):
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self.user_messages: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, user_id: str) -> bool:
        now = datetime.now()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        # Limpiar mensajes fuera de la ventana
        self.user_messages[user_id] = [
            msg_time for msg_time in self.user_messages[user_id]
            if msg_time > window_start
        ]
        
        # Verificar límite
        if len(self.user_messages[user_id]) >= self.max_messages:
            return False
        
        self.user_messages[user_id].append(now)
        return True

rate_limiter = RateLimiter(max_messages=100, window_seconds=60)

# En el endpoint:
if message_type == "code_change":
    if not rate_limiter.is_allowed(user_id):
        error_msg = ErrorMessage(
            type="error",
            message="Rate limit exceeded"
        )
        await websocket.send_text(error_msg.model_dump_json())
        continue
    # ... procesar mensaje ...
```

### 3. Logging y Monitoreo

Implementa logging detallado para debugging:

```python
import logging

logger = logging.getLogger(__name__)

async def websocket_endpoint(websocket: WebSocket, room_id: str):
    user_id = None
    
    try:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for room {room_id}")
        
        # ... código ...
        
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received message from user {user_id} in room {room_id}: {data[:100]}")
            
            # ... procesar mensaje ...
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id} in room {room_id}")
    except Exception as e:
        logger.error(f"WebSocket error for room {room_id}: {str(e)}", exc_info=True)
    finally:
        # ... limpieza ...
```

### 4. Manejo de Errores Robusto

Siempre maneja errores y envía mensajes informativos al cliente:

```python
try:
    message_data = json.loads(data)
    message_type = message_data.get("type")
    
    if message_type == "code_change":
        code_msg = CodeChangeMessage(**message_data)
        # ... procesar ...
except json.JSONDecodeError as e:
    error_msg = ErrorMessage(
        type="error",
        message=f"Invalid JSON: {str(e)}"
    )
    await websocket.send_text(error_msg.model_dump_json())
except ValidationError as e:
    error_msg = ErrorMessage(
        type="error",
        message=f"Validation error: {str(e)}"
    )
    await websocket.send_text(error_msg.model_dump_json())
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    error_msg = ErrorMessage(
        type="error",
        message="An unexpected error occurred"
    )
    await websocket.send_text(error_msg.model_dump_json())
```

### 5. Testing de WebSockets

Usa TestClient de FastAPI para testear WebSockets:

```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_websocket_connection(client):
    """Test WebSocket connection."""
    with client.websocket_connect("/ws/test-room-123") as websocket:
        # Enviar mensaje de unión
        join_message = {"type": "join", "username": "testuser"}
        websocket.send_text(json.dumps(join_message))
        
        # La conexión debe estar establecida
        assert websocket is not None

def test_code_change_broadcast(client):
    """Test that code changes are broadcasted to other clients."""
    room_id = "test-room-broadcast"
    
    # Conectar primer cliente
    with client.websocket_connect(f"/ws/{room_id}") as websocket1:
        join_message1 = {"type": "join", "username": "user1"}
        websocket1.send_text(json.dumps(join_message1))
        
        # Conectar segundo cliente
        with client.websocket_connect(f"/ws/{room_id}") as websocket2:
            join_message2 = {"type": "join", "username": "user2"}
            websocket2.send_text(json.dumps(join_message2))
            
            # Enviar cambio de código desde cliente 1
            code_change = {
                "type": "code_change",
                "code": "print('Hello')",
                "cursor_position": 0
            }
            websocket1.send_text(json.dumps(code_change))
            
            # Cliente 2 debe recibir el mensaje
            data = websocket2.receive_text()
            message = json.loads(data)
            assert message["type"] == "code_change"
            assert message["code"] == "print('Hello')"
```

---

## Conclusión

Implementar WebSockets en producción requiere atención a detalles que van más allá de simplemente abrir una conexión. El `ConnectionManager` que hemos visto proporciona una base sólida para gestionar múltiples conexiones, pero hay varios aspectos críticos a considerar:

**Takeaways principales:**

1. **Gestión de Conexiones**: Un `ConnectionManager` bien diseñado es esencial para escalar y mantener la aplicación estable.

2. **Limpieza Automática**: Siempre limpia las conexiones desconectadas para prevenir memory leaks.

3. **Reconexión Inteligente**: Implementa reconexión automática con backoff exponencial y límites de intentos.

4. **Validación y Seguridad**: Valida todos los mensajes y implementa rate limiting para prevenir abuso.

5. **Testing**: Usa TestClient de FastAPI para testear tus WebSockets de manera confiable.

6. **Monitoreo**: Implementa logging detallado para poder debuggear problemas en producción.

La implementación que hemos visto está basada en una aplicación real desplegada en producción y ha sido probada con múltiples usuarios simultáneos. Los patrones y soluciones presentados aquí te ayudarán a construir aplicaciones colaborativas robustas y escalables.

---

## Referencias

- [FastAPI WebSockets Documentation](https://fastapi.tiangolo.com/advanced/websockets/) - Documentación oficial de FastAPI sobre WebSockets
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) - Referencia completa de la API WebSocket en navegadores
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455) - Especificación oficial del protocolo WebSocket
- [React Hooks Documentation](https://react.dev/reference/react) - Documentación oficial de React Hooks
- [Pydantic Documentation](https://docs.pydantic.dev/) - Validación de datos con Pydantic
- [WebSockets para desarrolladores Full-Stack](https://www.uphop.ai/app/c/82951504-7771-4fdf-806b-65a7563b0b14) - Guía completa sobre WebSockets
- [Supervisión de aplicaciones WebSocket](https://www.dotcom-monitor.com/blog/es/websocket-application-monitoring/) - Mejores prácticas para monitoreo
- [Aplicaciones en Tiempo Real: WebSockets](https://paulogalarza.com/aplicaciones-en-tiempo-real-websockets/) - Artículo sobre implementación de WebSockets
- [Cómo WebSockets Impulsan Apps en Tiempo Real](https://www.q2bstudio.com/nuestro-blog/832/como-los-websockets-impulsan-las-aplicaciones-en-tiempo-real) - Beneficios y casos de uso



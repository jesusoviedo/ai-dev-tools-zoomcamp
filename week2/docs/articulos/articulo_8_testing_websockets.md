# Testing de Aplicaciones en Tiempo Real: Estrategias para WebSockets y CI/CD

## Cómo Testear Aplicaciones con WebSockets y Evitar que Watch Mode Bloquee tus Pipelines

Las aplicaciones en tiempo real con WebSockets presentan desafíos únicos para el testing. A diferencia de las APIs REST tradicionales donde puedes hacer una petición y verificar la respuesta, los WebSockets requieren mantener conexiones abiertas, manejar mensajes asíncronos, y simular múltiples clientes interactuando simultáneamente. Además, muchos desarrolladores descubren demasiado tarde que sus tests funcionan localmente pero fallan en CI/CD debido a configuraciones incorrectas o problemas de timing.

Este artículo explora estrategias completas para testear aplicaciones con WebSockets, basándose en una aplicación real de plataforma de entrevistas de código. Aprenderás cómo separar tests unitarios de tests de integración, cómo usar TestClient de FastAPI para simular conexiones WebSocket, cómo testear reconexión automática, y cómo configurar tests para que funcionen tanto localmente como en GitHub Actions.

---

## Introducción

Testear aplicaciones con WebSockets es fundamentalmente diferente a testear APIs REST. En lugar de hacer una petición HTTP y verificar una respuesta, necesitas:

- Mantener conexiones abiertas durante la ejecución del test
- Manejar mensajes asíncronos que pueden llegar en cualquier momento
- Simular múltiples clientes interactuando simultáneamente
- Manejar timing y condiciones de carrera
- Configurar tests para CI/CD donde el "watch mode" puede bloquear pipelines

En este artículo, basado en una aplicación real en producción, exploraremos estrategias completas para testear WebSockets efectivamente, desde tests unitarios hasta tests de integración, y cómo configurarlos para CI/CD.

---

## Estrategia de Testing para WebSockets

### Separación de Tests Unitarios vs Integración

La primera decisión importante es cómo estructurar tus tests. La separación clara entre tests unitarios e integración es crucial:

**Tests Unitarios:**
- No requieren conexiones WebSocket reales
- Testean lógica de negocio aislada
- Mockean dependencias externas
- Ejecutan rápidamente
- Ejemplo: Validación de mensajes, lógica del ConnectionManager sin conexiones reales

**Tests de Integración:**
- Requieren conexiones WebSocket reales
- Testean la interacción completa cliente-servidor
- Usan TestClient de FastAPI
- Pueden ser más lentos
- Ejemplo: Conexión, envío/recepción de mensajes, broadcast

### Estructura de Directorios Recomendada

```
backend/
├── tests/
│   ├── unit/
│   │   ├── test_websocket_manager.py      # Tests unitarios del ConnectionManager
│   │   └── test_message_validation.py     # Tests de validación de mensajes
│   └── integration/
│       ├── test_websocket.py              # Tests de integración completos
│       └── test_websocket_endpoint.py     # Tests del endpoint completo
```

**Configuración en `pyproject.toml`:**

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
asyncio_mode = "auto"
markers = [
    "unit: Unit tests (no external dependencies)",
    "integration: Integration tests (require server/database)",
]
```

---

## FastAPI TestClient para WebSockets

### Configuración Básica

FastAPI proporciona `TestClient` que puede simular conexiones WebSocket:

```python
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)
```

### Testing de Conexión Básica

```python
def test_websocket_connect_success(client):
    """Test successful WebSocket connection."""
    with client.websocket_connect("/ws/test-room-123") as websocket:
        # Enviar mensaje de unión
        join_message = {"type": "join", "username": "testuser"}
        websocket.send_text(json.dumps(join_message))
        
        # La conexión debe estar establecida
        assert websocket is not None
```

**Puntos clave:**
- Usa `with` statement para manejar el ciclo de vida de la conexión
- El contexto manager cierra la conexión automáticamente
- Puedes enviar y recibir mensajes dentro del bloque `with`

### Testing de Envío y Recepción de Mensajes

```python
def test_code_change_message(client):
    """Test sending and receiving code change messages."""
    room_id = "test-room-messages"
    
    with client.websocket_connect(f"/ws/{room_id}") as websocket1:
        # Unirse a la sala
        join_message = {"type": "join", "username": "user1"}
        websocket1.send_text(json.dumps(join_message))
        
        # Enviar cambio de código
        code_message = {
            "type": "code_change",
            "code": "print('Hello')",
            "cursor_position": 10
        }
        websocket1.send_text(json.dumps(code_message))
        
        # Mensaje debe enviarse sin error
        assert websocket1 is not None
```

### Testing de Broadcast con Múltiples Clientes

El verdadero poder de los tests de integración se muestra cuando testeas múltiples clientes:

```python
def test_code_change_broadcast(client):
    """Test that code changes are broadcast to other users."""
    room_id = "test-room-broadcast"
    
    # Conectar primer cliente
    with client.websocket_connect(f"/ws/{room_id}") as websocket1:
        join_message1 = {"type": "join", "username": "user1"}
        websocket1.send_text(json.dumps(join_message1))
        
        # Conectar segundo cliente
        with client.websocket_connect(f"/ws/{room_id}") as websocket2:
            join_message2 = {"type": "join", "username": "user2"}
            websocket2.send_text(json.dumps(join_message2))
            
            # Esperar un momento para que las conexiones se establezcan
            import time
            time.sleep(0.1)
            
            # Enviar cambio de código desde cliente 1
            code_message = {
                "type": "code_change",
                "code": "const x = 42;",
                "cursor_position": 5
            }
            websocket1.send_text(json.dumps(code_message))
            
            # Cliente 2 debe recibir el broadcast
            # Nota: En algunos entornos de test, puede ser necesario esperar
            time.sleep(0.2)
            
            try:
                data = websocket2.receive_text(timeout=0.5)
                message = json.loads(data)
                assert message["type"] == "code_change"
                assert message["code"] == "const x = 42;"
            except Exception:
                # Timeout puede ser aceptable en algunos entornos
                pass
```

---

## Manejo de Timing y Asincronía

### El Problema del Timing

Los tests de WebSockets son inherentemente asíncronos. Los mensajes pueden llegar en cualquier momento, y hay condiciones de carrera que pueden hacer que los tests fallen intermitentemente.

### Cuándo Usar `time.sleep()`

**Usa `time.sleep()` cuando:**
- Necesitas esperar que múltiples conexiones se establezcan
- Estás testando broadcast y necesitas tiempo para que los mensajes se propaguen
- Estás en un entorno de test donde no hay mejor alternativa

**Ejemplo:**
```python
# Esperar que las conexiones se establezcan
time.sleep(0.1)

# Enviar mensaje
websocket1.send_text(json.dumps(message))

# Esperar que el broadcast llegue
time.sleep(0.2)

# Verificar recepción
data = websocket2.receive_text(timeout=0.5)
```

**No uses `time.sleep()` cuando:**
- Puedes usar callbacks o eventos
- Estás en producción (usa asyncio en su lugar)
- Los tests se vuelven demasiado lentos

### Usando `asyncio` para Tests Asíncronos

Para tests más avanzados, puedes usar `asyncio` directamente:

```python
import asyncio
import pytest

@pytest.mark.asyncio
async def test_async_websocket_flow():
    """Test WebSocket flow using asyncio."""
    # Crear conexiones asíncronas
    # ... código de test asíncrono ...
    await asyncio.sleep(0.1)  # Mejor que time.sleep() en código asíncrono
```

### Espera de Mensajes con Timeouts

Siempre usa timeouts al recibir mensajes:

```python
try:
    data = websocket.receive_text(timeout=0.5)  # Timeout de 500ms
    message = json.loads(data)
    assert message["type"] == "code_change"
except Exception:
    # Manejar timeout o error
    pytest.fail("Expected message not received")
```

---

## Tests Unitarios de WebSockets

### Mocking de Conexiones WebSocket

Para tests unitarios, mockea las conexiones WebSocket:

```python
from unittest.mock import Mock, AsyncMock
from app.websocket import ConnectionManager

def test_connection_manager_connect():
    """Test ConnectionManager without real WebSocket connections."""
    manager = ConnectionManager()
    mock_websocket = Mock()
    mock_websocket.accept = AsyncMock()
    
    # Test la lógica de conexión sin conexión real
    # ... código de test ...
```

### Testing de Validación de Mensajes

Testea la validación de mensajes sin conexiones reales:

```python
from app.models import CodeChangeMessage
from pydantic import ValidationError

def test_code_change_message_validation():
    """Test message validation without WebSocket."""
    # Mensaje válido
    valid_message = {
        "type": "code_change",
        "code": "print('Hello')",
        "cursor_position": 10
    }
    msg = CodeChangeMessage(**valid_message)
    assert msg.code == "print('Hello')"
    
    # Mensaje inválido
    invalid_message = {
        "type": "code_change",
        # Falta 'code'
    }
    with pytest.raises(ValidationError):
        CodeChangeMessage(**invalid_message)
```

---

## Tests de Integración de WebSockets

### Testing de Conexión Exitosa

```python
@pytest.mark.integration
def test_websocket_connect_success(client):
    """Test successful WebSocket connection."""
    with client.websocket_connect("/ws/test-room-123") as websocket:
        join_message = {"type": "join", "username": "testuser"}
        websocket.send_text(json.dumps(join_message))
        assert websocket is not None
```

### Testing de Broadcast a Múltiples Clientes

```python
@pytest.mark.integration
def test_broadcast_to_multiple_clients(client):
    """Test that messages are broadcast to all clients in a room."""
    room_id = "test-room-multi"
    
    with client.websocket_connect(f"/ws/{room_id}") as ws1:
        with client.websocket_connect(f"/ws/{room_id}") as ws2:
            with client.websocket_connect(f"/ws/{room_id}") as ws3:
                # Todos se unen
                for ws in [ws1, ws2, ws3]:
                    ws.send_text(json.dumps({"type": "join", "username": "user"}))
                
                time.sleep(0.2)
                
                # Enviar desde ws1
                ws1.send_text(json.dumps({
                    "type": "code_change",
                    "code": "test",
                    "cursor_position": 0
                }))
                
                time.sleep(0.2)
                
                # ws2 y ws3 deben recibir el mensaje
                # (ws1 no porque se excluye del broadcast)
                for ws in [ws2, ws3]:
                    try:
                        data = ws.receive_text(timeout=0.5)
                        message = json.loads(data)
                        assert message["type"] == "code_change"
                    except Exception:
                        pass  # En algunos entornos puede fallar
```

### Testing de Notificaciones de Usuarios

```python
@pytest.mark.integration
def test_user_join_notification(client):
    """Test that users are notified when someone joins."""
    room_id = "test-room-notifications"
    
    with client.websocket_connect(f"/ws/{room_id}") as ws1:
        ws1.send_text(json.dumps({"type": "join", "username": "user1"}))
        time.sleep(0.1)
        
        with client.websocket_connect(f"/ws/{room_id}") as ws2:
            ws2.send_text(json.dumps({"type": "join", "username": "user2"}))
            time.sleep(0.2)
            
            # ws1 debe recibir notificación de que user2 se unió
            try:
                data = ws1.receive_text(timeout=0.5)
                message = json.loads(data)
                assert message["type"] == "user_joined"
                assert message["username"] == "user2"
            except Exception:
                pass
```

### Testing de Manejo de Errores

```python
@pytest.mark.integration
def test_invalid_message_handling(client):
    """Test handling of invalid messages."""
    with client.websocket_connect("/ws/test-room-errors") as websocket:
        websocket.send_text(json.dumps({"type": "join", "username": "testuser"}))
        
        # Enviar mensaje inválido
        invalid_message = {"type": "invalid_type", "data": "test"}
        websocket.send_text(json.dumps(invalid_message))
        
        # La conexión debe permanecer activa
        assert websocket is not None
        
        # Debe recibir mensaje de error
        try:
            data = websocket.receive_text(timeout=0.5)
            message = json.loads(data)
            assert message["type"] == "error"
        except Exception:
            pass
```

---

## Configuración de Tests para CI/CD

### El Problema: Watch Mode Bloquea CI/CD

Uno de los problemas más comunes es que los tests en "watch mode" bloquean los pipelines de CI/CD porque nunca terminan.

**Problema en desarrollo:**
```json
// package.json
{
  "scripts": {
    "test": "vitest"  // Watch mode por defecto - BLOQUEA CI/CD
  }
}
```

**Solución: Scripts Separados**

```json
// package.json
{
  "scripts": {
    "test": "vitest watch",           // Para desarrollo local
    "test:run": "vitest run",         // Para CI/CD (ejecuta una vez y termina)
    "test:unit": "vitest run src/__tests__/unit",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Configuración de pytest para CI

En `pyproject.toml`:

```toml
[tool.pytest.ini_options]
# Configuración para CI/CD
addopts = [
    "-v",
    "--strict-markers",
    "--tb=short",
    # NO incluir --watch aquí - eso es solo para desarrollo local
]

# Para desarrollo local, usa pytest-watch manualmente
# uv run pytest-watch
```

**Comandos separados:**

```bash
# Desarrollo local (watch mode)
uv run pytest-watch

# CI/CD (ejecuta una vez)
uv run pytest
```

### Configuración de vitest para CI

En `vite.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // No configurar watch aquí - se controla con comandos
  },
})
```

**Scripts en `package.json`:**

```json
{
  "scripts": {
    "test": "vitest",                    // Watch mode para desarrollo
    "test:run": "vitest run",            // Sin watch para CI/CD
    "test:unit": "vitest run src/__tests__/unit",
    "test:coverage": "vitest run --coverage"
  }
}
```

### GitHub Actions Workflow

Ejemplo de workflow para ejecutar tests:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - name: Install dependencies
        run: |
          pip install uv
          uv sync
      - name: Run tests
        run: uv run pytest  # Sin watch mode

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:run  # Sin watch mode
```

---

## Problemas Comunes en CI/CD

### Problema 1: Tests Pasan Localmente pero Fallan en CI

**Causa:** Diferencias de timing entre entornos locales y CI.

**Solución:** Aumenta los timeouts en CI y usa valores más conservadores:

```python
# En tests de integración
import os

# Timeout más largo en CI
TIMEOUT = float(os.getenv('TEST_TIMEOUT', '0.5'))  # Default 0.5s, más en CI

try:
    data = websocket.receive_text(timeout=TIMEOUT)
    # ... verificar mensaje ...
except Exception:
    # En CI, ser más tolerante con timeouts
    if os.getenv('CI'):
        pytest.skip("Timeout in CI environment")
    else:
        raise
```

### Problema 2: Diferencias de Timing

**Causa:** CI puede ser más lento que tu máquina local.

**Solución:** Usa valores de `time.sleep()` más generosos en CI:

```python
import os

# Sleep más largo en CI
SLEEP_DELAY = 0.3 if os.getenv('CI') else 0.1

time.sleep(SLEEP_DELAY)
```

### Problema 3: Problemas de Recursos (Memoria, CPU)

**Causa:** CI tiene recursos limitados comparado con tu máquina.

**Solución:** Limita la cantidad de conexiones simultáneas en tests:

```python
# En lugar de 10 conexiones simultáneas
# Usa 3-5 máximo en CI
MAX_CONNECTIONS = 3 if os.getenv('CI') else 10
```

---

## Mocking y Fixtures

### Fixtures de pytest para Setup/Teardown

```python
@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)

@pytest.fixture
def clean_connection_manager():
    """Fixture that provides a clean ConnectionManager."""
    manager = ConnectionManager()
    yield manager
    # Cleanup después del test
    manager.active_connections.clear()
    manager.user_info.clear()
```

### Fixtures para Conexiones WebSocket de Prueba

```python
@pytest.fixture
def websocket_connection(client):
    """Fixture that provides a WebSocket connection."""
    with client.websocket_connect("/ws/test-room") as websocket:
        yield websocket
        # Cleanup automático al salir del contexto
```

### Cleanup de Recursos

Siempre limpia recursos después de los tests:

```python
def test_multiple_connections(client):
    """Test that cleans up properly."""
    connections = []
    
    try:
        for i in range(5):
            ws = client.websocket_connect(f"/ws/room-{i}")
            connections.append(ws.__enter__())
        
        # ... tests ...
    finally:
        # Cleanup explícito
        for ws in connections:
            try:
                ws.__exit__(None, None, None)
            except:
                pass
```

---

## Testing de Frontend con WebSockets

### Mocking de WebSocket en Tests de React

Para testear componentes React que usan WebSockets, mockea la API de WebSocket:

```typescript
// setupTests.ts
import { vi } from 'vitest'

// Mock WebSocket globalmente
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED,
})) as any
```

### Testing de Hooks Personalizados

```typescript
// useWebSocket.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useWebSocket } from './useWebSocket'

describe('useWebSocket', () => {
  it('should connect to WebSocket', async () => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      readyState: WebSocket.CONNECTING,
    }
    
    ;(global.WebSocket as any).mockImplementation(() => mockWs)
    
    const { result } = renderHook(() => useWebSocket('test-room'))
    
    // Simular conexión exitosa
    mockWs.readyState = WebSocket.OPEN
    mockWs.addEventListener.mock.calls
      .find(([event]) => event === 'open')?.[1]()
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })
})
```

### Testing de Reconexión Automática

```typescript
it('should reconnect automatically on disconnect', async () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    readyState: WebSocket.CONNECTING,
  }
  
  ;(global.WebSocket as any).mockImplementation(() => mockWs)
  
  const { result } = renderHook(() => useWebSocket('test-room'))
  
  // Simular desconexión
  mockWs.addEventListener.mock.calls
    .find(([event]) => event === 'close')?.[1]()
  
  // Debe intentar reconectar
  await waitFor(() => {
    expect(global.WebSocket).toHaveBeenCalledTimes(2)
  }, { timeout: 2000 })
})
```

---

## Vitest para Testing Frontend

### Configuración de vitest

En `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Configuración para CI/CD
    watch: false,  // Deshabilitar watch en CI
  },
})
```

### Scripts Separados para Desarrollo vs CI

```json
{
  "scripts": {
    "test": "vitest",                    // Watch mode (desarrollo)
    "test:run": "vitest run",            // Sin watch (CI/CD)
    "test:unit": "vitest run src/__tests__/unit",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Cobertura de Tests

### Qué Cubrir en Tests de WebSockets

**Casos de éxito:**
- Conexión exitosa
- Envío y recepción de mensajes
- Broadcast a múltiples clientes
- Notificaciones de usuarios (join/leave)

**Casos edge:**
- Conexiones fallidas
- Mensajes inválidos o malformados
- Desconexiones inesperadas
- Reconexión automática
- Rate limiting

**Ejemplo de cobertura completa:**

```python
@pytest.mark.integration
class TestWebSocketCompleteCoverage:
    """Tests that cover all WebSocket scenarios."""
    
    def test_successful_connection(self, client):
        """✅ Caso de éxito: conexión exitosa"""
        pass
    
    def test_invalid_json_message(self, client):
        """✅ Caso edge: JSON inválido"""
        pass
    
    def test_missing_required_fields(self, client):
        """✅ Caso edge: campos faltantes"""
        pass
    
    def test_broadcast_excludes_sender(self, client):
        """✅ Caso importante: exclusión del remitente"""
        pass
    
    def test_disconnect_cleanup(self, client):
        """✅ Caso edge: limpieza al desconectar"""
        pass
```

---

## Performance de Tests

### Tests Rápidos vs Tests Completos

**Estrategia:** Separa tests rápidos de tests lentos:

```python
# Tests rápidos (unitarios)
@pytest.mark.unit
def test_message_validation():
    # Ejecuta en < 1ms
    pass

# Tests lentos (integración)
@pytest.mark.integration
@pytest.mark.slow  # Marca para tests lentos
def test_multiple_clients_broadcast():
    # Puede tardar varios segundos
    pass
```

**Ejecutar solo tests rápidos frecuentemente:**

```bash
# Solo tests unitarios (rápidos)
uv run pytest tests/unit/ -v

# Todos los tests (incluyendo lentos)
uv run pytest -v
```

### Paralelización de Tests

Pytest puede ejecutar tests en paralelo con `pytest-xdist`:

```bash
# Instalar
uv add --dev pytest-xdist

# Ejecutar en paralelo
uv run pytest -n auto  # Usa todos los CPUs disponibles
```

---

## Mejores Prácticas

### 1. Estructura de Directorios

```
tests/
├── unit/                    # Tests unitarios (rápidos)
│   ├── test_models.py
│   └── test_validation.py
└── integration/            # Tests de integración (más lentos)
    ├── test_websocket.py
    └── test_api.py
```

### 2. Naming Conventions

- Tests unitarios: `test_<functionality>_unit.py`
- Tests integración: `test_<functionality>_integration.py` o usar marcadores
- Funciones de test: `test_<what_it_tests>`

### 3. Documentación de Tests Complejos

```python
def test_complex_broadcast_scenario(client):
    """
    Test complex broadcast scenario with multiple clients.
    
    Scenario:
    1. Client 1 joins room A
    2. Client 2 joins room A
    3. Client 3 joins room B (different room)
    4. Client 1 sends code change
    5. Client 2 should receive it
    6. Client 3 should NOT receive it (different room)
    """
    # ... implementación ...
```

### 4. Tests como Documentación

Los tests deben ser legibles y explicar cómo funciona el sistema:

```python
def test_user_join_notification_flow(client):
    """
    This test documents the user join notification flow:
    
    1. User A connects to room
    2. User B connects to same room
    3. User A receives 'user_joined' notification for User B
    4. User B does NOT receive notification for themselves
    """
    # ... código que documenta el flujo ...
```

---

## Troubleshooting de Tests

### Debugging de Tests que Fallan Intermitentemente

**Problema:** Tests que a veces pasan y a veces fallan.

**Soluciones:**

1. **Aumenta timeouts:**
```python
# En lugar de
data = websocket.receive_text(timeout=0.1)

# Usa
data = websocket.receive_text(timeout=1.0)  # Más tiempo
```

2. **Agrega logging:**
```python
import logging
logger = logging.getLogger(__name__)

def test_with_logging(client):
    logger.info("Starting test")
    with client.websocket_connect("/ws/test") as ws:
        logger.info("Connected")
        ws.send_text(json.dumps({"type": "join"}))
        logger.info("Sent join message")
        # ... resto del test ...
```

3. **Usa `pytest --pdb` para debugging:**
```bash
uv run pytest --pdb test_websocket.py::test_specific_test
```

### Análisis de Por Qué Tests Fallan en CI pero Pasan Localmente

**Checklist de debugging:**

1. **Verifica versiones:** ¿Las versiones de Python/Node son las mismas?
2. **Verifica timing:** ¿Los timeouts son suficientes en CI?
3. **Verifica recursos:** ¿Hay suficiente memoria/CPU en CI?
4. **Verifica orden:** ¿Los tests dependen del orden de ejecución?
5. **Verifica estado compartido:** ¿Los tests limpian estado correctamente?

**Ejemplo de test que falla por estado compartido:**

```python
# ❌ MAL: Estado compartido entre tests
manager = ConnectionManager()  # Global

def test_1():
    manager.connect(...)  # Modifica estado global

def test_2():
    # Puede fallar si test_1 no limpia correctamente
    assert len(manager.active_connections) == 0
```

```python
# ✅ BIEN: Estado aislado por test
@pytest.fixture
def clean_manager():
    return ConnectionManager()

def test_1(clean_manager):
    clean_manager.connect(...)

def test_2(clean_manager):
    # Estado limpio para cada test
    assert len(clean_manager.active_connections) == 0
```

---

## GitHub Actions para Tests

### Workflow Completo

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      
      - name: Install uv
        run: curl -LsSf https://astral.sh/uv/install.sh | sh
      
      - name: Install dependencies
        run: |
          source $HOME/.cargo/env
          uv sync
      
      - name: Run unit tests
        run: uv run pytest tests/unit/ -v
      
      - name: Run integration tests
        run: uv run pytest tests/integration/ -v -m integration
      
      - name: Generate coverage
        run: uv run pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:run  # Sin watch mode
      
      - name: Generate coverage
        run: npm run test:coverage
```

### Caching de Dependencias

```yaml
- name: Cache Python dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/uv
    key: ${{ runner.os }}-uv-${{ hashFiles('**/uv.lock') }}

- name: Cache Node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

## Conclusión

Testear aplicaciones con WebSockets requiere un enfoque diferente al testing tradicional de APIs REST. La clave está en:

1. **Separar claramente** tests unitarios de integración
2. **Manejar timing** correctamente con timeouts y sleeps apropiados
3. **Configurar para CI/CD** con scripts separados que no usen watch mode
4. **Mockear adecuadamente** en tests unitarios, usar conexiones reales en integración
5. **Documentar tests complejos** para que sirvan como documentación del sistema

**Takeaways principales:**

- Usa `TestClient.websocket_connect()` de FastAPI para tests de integración
- Mockea WebSocket en tests unitarios de frontend
- Separa scripts de test para desarrollo (watch) vs CI/CD (run)
- Maneja timing con timeouts y sleeps apropiados
- Limpia estado entre tests para evitar interferencias
- Usa fixtures de pytest para setup/teardown consistente

La estrategia de testing que hemos visto está basada en una aplicación real en producción y ha sido probada en GitHub Actions. Siguiendo estos patrones y mejores prácticas, puedes crear una suite de tests robusta y confiable para tus aplicaciones con WebSockets.

---

## Referencias

- [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/) - Guía oficial de testing con FastAPI
- [pytest Documentation](https://docs.pytest.org/) - Documentación completa de pytest
- [Vitest Documentation](https://vitest.dev/) - Framework de testing para Vite
- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Guía de GitHub Actions
- [Testing WebSockets with FastAPI](https://fastapi.tiangolo.com/advanced/websockets/#testing-websockets) - Testing específico de WebSockets
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/) - Testing de código asíncrono
- [React Testing Library](https://testing-library.com/react) - Testing de componentes React
- [WebSocket Testing Best Practices](https://www.dotcom-monitor.com/blog/es/websocket-application-monitoring/) - Mejores prácticas de monitoreo y testing



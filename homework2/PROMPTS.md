# Prompts Utilizados

Este archivo contiene los prompts principales utilizados durante el desarrollo de la plataforma de entrevistas de código.

### Prompt 1:

**Rol:** Actúa como un Arquitecto de Software y Desarrollador Senior Full Stack.

**Objetivo:** Construir una plataforma de entrevistas de código online "End-to-End".

**Stack Tecnológico:**

- **Frontend:** React + Vite (TypeScript).
- **Backend:** FastAPI (Python).
- **Comunicación:** WebSockets (para la colaboración en tiempo real).

**Instrucciones de Implementación (Paso a Paso):**

**Paso 1: Frontend Inicial**
Inicializa el proyecto React con Vite. Crea una interfaz básica con un editor de texto (puedes usar un `textarea` simple por ahora) y un panel lateral.

**Paso 2: Especificación OpenAPI (API First)**
Antes de escribir el código del backend, genera el contrato de la API.
Crea un archivo `openapi.yaml` (o json) que defina:

- Endpoints REST básicos (health check, crear sesión).
- **Crucial:** Documenta el endpoint de WebSocket `/ws/{room_id}` (aunque OpenAPI tiene soporte limitado para sockets, descríbelo).

**Paso 3: Backend con FastAPI**
Implementa el servidor FastAPI basándote estrictamente en la especificación OpenAPI generada en el paso anterior.

- Inicializa el proyecto usando `uv init` y agrega dependencias con `uv add fastapi uvicorn`.
- Implementa el WebSocket para permitir eco de mensajes (broadcast a todos los usuarios en la sala).

Por favor, ejecuta el Paso 1, espera mi confirmación, luego el Paso 2, y finalmente el Paso 3. Comienza con el Paso 1.

---

### Prompt 2:


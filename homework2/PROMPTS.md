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

**Rol:** Actúa como un Ingeniero de QA (Automation) y Desarrollador Full Stack Senior.

**Objetivo:** Implementar una estrategia de pruebas robusta para la aplicación, separando estrictamente las Pruebas Unitarias de las Pruebas de Integración.

**Contexto:**
Necesitamos asegurar que la lógica de la aplicación sea sólida antes de ejecutarla. Debemos verificar que los componentes del backend (FastAPI) y frontend (React) funcionen de forma aislada (Unitarias) y que la interacción Cliente-Servidor a través de WebSockets y endpoints de la API funcione correctamente (Integración).

**Herramientas:**
- **Backend:** `pytest` (instalar usando `uv add --dev pytest httpx`).
- **Frontend:** `vitest` + `react-testing-library` (instalar usando `npm`).

**Tareas:**

**1. Pruebas Unitarias Backend**
- Crea una carpeta `backend/tests/unit`.
- Escribe pruebas para funciones aisladas (ej: funciones de utilidad, validación de modelos) sin simular (mockear) la base de datos completa ni el servidor si es posible.

**2. Pruebas Unitarias Frontend**
- Crea pruebas en `frontend/src/__tests__/unit`.
- Escribe pruebas para verificar que los componentes principales de React se rendericen correctamente (ej: el componente del Editor de Código se renderiza, los botones aparecen).

**3. Pruebas de Integración (Interacción Cliente-Servidor)**
- Crea una carpeta `backend/tests/integration`.
- **Crucial:** Implementa pruebas usando el `TestClient` de FastAPI.
- Verifica la conexión **WebSocket**: Simula un cliente conectándose a una sala, enviando actualizaciones de código y recibiendo el mensaje retransmitido (broadcast) de vuelta. Esto simula la interacción real entre cliente y servidor.
- Verifica los endpoints REST (creación de sesiones).

**4. Documentación (README.md)**
- Crea o actualiza el archivo `README.md` en el directorio raíz.
- Añade una sección dedicada a "Testing".
- Proporciona los comandos de terminal exactos para ejecutar:
  - Solo Pruebas Unitarias del Backend.
  - Solo Pruebas de Integración del Backend.
  - Pruebas del Frontend.
  - Todas las pruebas a la vez.

**Ejecución:**
Por favor, comienza configurando la estructura de directorios para las pruebas e instalando las dependencias necesarias con los comandos indicados. Luego, escribe el código de las pruebas.

---

### Prompt 3:
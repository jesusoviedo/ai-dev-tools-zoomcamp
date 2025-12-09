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

**Rol:** Actúa como un Ingeniero DevOps y Desarrollador Full Stack.

**Objetivo:** Mejorar la Experiencia de Desarrollo (DX) permitiendo ejecutar tanto el cliente (Frontend) como el servidor (Backend) simultáneamente con un solo comando desde la raíz del proyecto.

**Herramienta requerida:** `concurrently` (paquete de Node.js).

**Instrucciones:**

1.  **Inicialización en Raíz:** Crea un archivo `package.json` en el directorio raíz del proyecto (si no existe) para orquestar los scripts globales.
2.  **Instalación:** Agrega `concurrently` como dependencia de desarrollo (`devDependencies`).
3.  **Configuración de Scripts:** Define un script llamado `dev` en el `package.json` que ejecute ambos procesos en paralelo.
      * **Proceso Backend:** Debe usar **`uv`** para ejecutar el servidor. El comando típico debería ser similar a `uv run uvicorn backend.main:app --reload --port 8000` (ajusta la ruta `backend.main:app` según tu estructura real).
      * **Proceso Frontend:** Debe ejecutar el script de desarrollo de Vite dentro de la carpeta frontend. Usa la bandera `--prefix` o `cd`, por ejemplo: `npm run dev --prefix frontend`.
4.  **Salida:** Proporciona el contenido final del `package.json` y el comando de terminal para iniciar todo el entorno.

**Nota:** Asegúrate de que los colores de salida de `concurrently` sean distintos para diferenciar fácilmente los logs del frontend y del backend.

---

### Prompt 4:

**Rol:** Actúa como un Desarrollador Frontend Senior especializado en React y UX.

**Objetivo:** Mejorar el editor de código actual (que es un simple `textarea`) integrando una librería profesional que soporte **resaltado de sintaxis (Syntax Highlighting)**.

**Requerimientos:**

1.  **Selección de Librería:** Recomienda e implementa una librería de edición de código robusta para React. Preferiblemente **Monaco Editor** (la base de VS Code) por su familiaridad, o **CodeMirror**. Elige la que consideres mejor para una plataforma de entrevistas.
2.  **Soporte Multi-lenguaje:** La implementación debe soportar específicamente **JavaScript** y **Python**.
3.  **Selector de Lenguaje:** Añade un menú desplegable (dropdown) en la UI (encima del editor) que permita al usuario cambiar entre "JavaScript" y "Python".
4.  **Integración de Estado:** Asegúrate de que el nuevo componente del editor propague los cambios de código al estado de la aplicación (para que la lógica de WebSocket existente siga funcionando y enviando los cambios).

**Instrucciones:**

- Dime qué paquete npm debo instalar.
- Proporciona el código del nuevo componente `CodeEditor`.
- Actualiza el componente principal para usar este nuevo editor en lugar del `textarea`.
  
---

### Prompt 5:

**Rol:** Actúa como un Ingeniero de Seguridad y Desarrollador Frontend.

**Objetivo:** Implementar la ejecución de código segura ("Sandboxed Code Execution") directamente en el navegador del usuario, evitando cualquier ejecución en el servidor (backend).

**Requerimiento Técnico:**
Utiliza **WebAssembly (WASM)** para compilar y ejecutar el código.

**Instrucciones de Implementación:**

1.  **Para Python:** Integra la librería **Pyodide**.
      - Crea un mecanismo para cargar Pyodide de manera eficiente (puede ser desde un CDN o npm).
      - Implementa una función que tome el código del editor y lo ejecute usando `pyodide.runPythonAsync` o similar.
      - **Crucial:** Debes capturar la salida estándar (`stdout`) para que cuando el usuario escriba `print("Hola")`, ese texto se capture y se muestre en la interfaz.
2.  **Para JavaScript:** Puedes usar una ejecución segura con `new Function()`
3.  **Interfaz de Usuario:**
      - Añade un botón "Run Code" o "Ejecutar".
      - Añade un panel de "Consola/Output" debajo del editor para mostrar los resultados o errores.
      - Muestra un indicador de "Cargando Runtime..." mientras Pyodide se inicializa.

**Entregable:**
Dime qué librería/script debo agregar y proporciona el código actualizado para el componente del Editor o un nuevo componente `CodeRunner`.
  
---

### Prompt 6:

**Rol:** Actúa como un Ingeniero DevOps Senior experto en Docker.

**Objetivo:** "Dockerizar" la aplicación completa (Frontend + Backend) en un **único contenedor** para facilitar el despliegue.

**Estrategia Técnica:**
Utiliza un **Multi-stage Build** en el `Dockerfile` para mantener la imagen final ligera.

**Pasos requeridos en el Dockerfile:**

1.  **Stage 1: Build del Frontend (Node.js)**
 - Usa una imagen base de `node`.
 - Copia el `package.json` e instala dependencias.
 - Ejecuta el script de build (`npm run build`) para generar la carpeta de archivos estáticos (usualmente `dist` o `build`).
2.  **Stage 2: Runtime del Backend (Python)**
 - Usa una imagen base ligera de Python (ej: `python:3.11-slim`).
 - Define el directorio de trabajo (ej: `/app`).
 - Instala **`uv`** y utilízalo para instalar las dependencias del backend (`pyproject.toml` o `requirements.txt`).
 - **Copiar Artefactos:** Copia la carpeta de archivos estáticos generada en el "Stage 1" dentro de una carpeta en el contenedor (ej: `/app/static`).

**Cambios en el Código (Backend):**

- Necesito que modifiques el archivo `main.py` de FastAPI.
- Configúralo para servir los archivos estáticos copiados (HTML/CSS/JS) en la ruta raíz `/` usando `StaticFiles`.
- Asegúrate de que las rutas de la API (`/api`, `/ws`) sigan funcionando y tengan prioridad sobre los archivos estáticos.

**Entregable:**

- El código completo del `Dockerfile`.
- El código modificado de `main.py`.
- Dime explícitamente **cuál es la imagen base** que has elegido para el paso final (Python), ya que necesito este dato para responder una pregunta.
  
---

### Prompt 7:

**Rol:** Actúa como un Ingeniero DevOps Senior y Especialista en CI/CD.

**Objetivo:** Crear un pipeline de automatización completo usando **GitHub Actions** para desplegar la aplicación Dockerizada en **Render.com**.

**Requerimientos del Flujo de Trabajo (CI/CD):**
Genera un archivo `.github/workflows/deploy.yml` que se active al hacer push a la rama `main`. El pipeline debe tener 4 trabajos (jobs) estrictamente secuenciales (usa `needs` para encadenarlos):

1.  **Job 1: Backend Unit Tests**
   - Configura Python y `uv`.
   - Ejecuta las pruebas unitarias: `uv run pytest backend/tests/unit`.
2.  **Job 2: Frontend Unit Tests**
   - Configura Node.js.
   - Ejecuta las pruebas del frontend: `npm run test` (o el script correspondiente).
3.  **Job 3: Integration Tests**
   - *Este job solo debe correr si el Job 1 y 2 pasaron exitosamente.*
   - Ejecuta las pruebas de integración: `uv run pytest backend/tests/integration`.
4.  **Job 4: Continuous Deployment (Render)**
   - *Solo se ejecuta si TODOS los tests anteriores pasaron.*
   - Debe activar el despliegue en Render. Puedes usar la acción `gh-action-render-deploy` o un `curl` al Deploy Hook de Render.

**Infraestructura como Código (Render):**

- Crea un archivo `render.yaml` (Blueprint) para configurar el servicio en Render.
- Debe especificar que es un servicio **Docker** (usando el Dockerfile de la raíz).
- Debe usar el plan gratuito (free) si es posible especificarlo.

**Entregables:**

- El código de `deploy.yml`.
- El código de `render.yaml`.
- **Instrucciones de Secretos:** Dime exactamente qué secretos (ej: `RENDER_deploy_hook_url` o `RENDER_API_KEY`) debo agregar en la configuración de mi repositorio en GitHub para que esto funcione.
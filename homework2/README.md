<!-- Language Navigation -->
<div align="center">

[🇪🇸 **Español**](#desarrollo-de-aplicación-end-to-end) | [🇺🇸 **English**](#end-to-end-application-development)

</div>

---

## Desarrollo de Aplicación End-to-End

### 📋 Enunciado de la Tarea

**Enlace al enunciado oficial:** [Homework 2 - AI Dev Tools Zoomcamp 2025](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2025/02-end-to-end/homework.md)

#### Resumen del Enunciado

Esta tarea cubre el desarrollo completo de una aplicación end-to-end asistida por IA. El objetivo es construir una plataforma para entrevistas de programación en línea con las siguientes características:

- Crear un enlace y compartirlo con candidatos
- Permitir que todos los usuarios conectados editen código en el panel de código
- Mostrar actualizaciones en tiempo real a todos los usuarios conectados
- Soporte de resaltado de sintaxis para múltiples lenguajes
- Ejecutar código de forma segura en el navegador

#### ✨ Tecnologías Utilizadas

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite (JavaScript/TypeScript)
- **Comunicación en Tiempo Real:** WebSockets
- **Resaltado de Sintaxis:** Librerías especializadas
- **Ejecución de Código:** WASM (WebAssembly) para ejecución segura en el navegador
- **Containerización:** Docker
- **Despliegue:** Render

#### 🎯 Funcionalidades Implementadas

- **Colaboración en Tiempo Real:** Múltiples usuarios pueden editar código simultáneamente
- **Sincronización Automática:** Cambios reflejados instantáneamente en todos los clientes
- **Resaltado de Sintaxis:** Soporte para JavaScript, Python y otros lenguajes
- **Ejecución Segura:** Código ejecutado en el navegador usando WASM
- **Compartir Sesiones:** Generación de enlaces únicos para compartir sesiones de código
- **Tests de Integración:** Cobertura de tests para validar la interacción cliente-servidor

### 🚀 Cómo ejecutar esta tarea

#### Prerrequisitos

- **Backend:**
  - Python 3.13+
  - [uv](https://github.com/astral-sh/uv) instalado (recomendado) o pip

- **Frontend:**
  - Node.js 18+ y npm

- **Opcional:**
  - Docker (para containerización)

#### Pasos para ejecutar

1. **Clonar y navegar al proyecto:**
   ```bash
   cd application_development
   ```

2. **Configurar el Backend (FastAPI):**
   ```bash
   cd backend
   uv venv && uv sync  # o: pip install -r requirements.txt
   source .venv/bin/activate  # En Windows: .venv\Scripts\activate
   ```

3. **Configurar el Frontend (React + Vite):**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Ejecutar ambos servicios simultáneamente:**
   
   Desde la raíz del proyecto (`application_development`):
   ```bash
   npm run dev
   ```
   
   O ejecutar por separado:
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn main:app --reload --port 8000
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Acceder a la aplicación:**
   - Frontend: http://localhost:5173 (puerto por defecto de Vite)
   - Backend API: http://localhost:8000
   - Documentación API: http://localhost:8000/docs (Swagger UI)

6. **Ejecutar los tests:**
   ```bash
   # Tests del backend
   cd backend
   pytest

   # Tests del frontend
   cd frontend
   npm test
   ```

### 📁 Estructura de archivos

La estructura completa del proyecto se documentará una vez que el código esté implementado. Por ahora, el proyecto sigue esta organización básica:

```
homework2/
├── application_development/      # Código fuente del proyecto
│   ├── backend/                  # Backend FastAPI
│   ├── frontend/                 # Frontend React + Vite
│   └── agents.md                 # Instrucciones para IA
└── README.md                     # Este archivo
```

> **Nota:** La estructura detallada se actualizará conforme se complete el desarrollo del proyecto.

### 🔧 Comandos Útiles

#### Desarrollo

```bash
# Ejecutar ambos servicios con concurrently
npm run dev

# Solo backend
cd backend && uvicorn main:app --reload

# Solo frontend
cd frontend && npm run dev
```

#### Testing

```bash
# Tests del backend
cd backend && pytest

# Tests del frontend
cd frontend && npm test

# Tests de integración
cd backend && pytest tests/integration
```

#### Containerización

```bash
# Construir imagen Docker
docker build -t coding-interview-platform .

# Ejecutar contenedor
docker run -p 8000:8000 coding-interview-platform
```

#### Despliegue en Render

```bash
# 1. Asegúrate de tener un archivo render.yaml en la raíz del proyecto
# 2. Conecta tu repositorio de GitHub a Render
# 3. Render detectará automáticamente el Dockerfile y desplegará la aplicación
# 4. Configura las variables de entorno necesarias en el panel de Render
```

**Nota:** La aplicación está desplegada en Render. Puedes acceder a ella en la URL proporcionada por Render después del despliegue.

### 📝 Notas importantes

- La aplicación utiliza WebSockets para comunicación en tiempo real
- El código se ejecuta de forma segura en el navegador usando WASM
- Los tests de integración validan la interacción completa entre cliente y servidor
- El proyecto está estructurado para facilitar el desarrollo con IA
- Todas las dependencias están documentadas en `pyproject.toml` (backend) y `package.json` (frontend)

### 🤖 Configuración de Cursor IDE con agents.md

Este proyecto utiliza un archivo `agents.md` para configurar el asistente de IA de Cursor IDE. Este archivo contiene instrucciones que Cursor lee automáticamente para seguir las mejores prácticas y convenciones del proyecto.

#### ¿Qué es agents.md?

`agents.md` es un archivo de convención donde se definen instrucciones generales para el asistente de IA. Cursor IDE lo lee automáticamente, lo que permite mantener consistencia en el desarrollo sin tener que repetir instrucciones en cada prompt.

#### Contenido del agents.md del proyecto

El archivo `application_development/agents.md` contiene las siguientes instrucciones:

```markdown
# Instrucciones para el Agente de IA

## Gestión de Dependencias

- **Backend (Python):** Siempre usa `uv` para instalar paquetes Python. NUNCA uses `pip`.
  - Comando: `uv add <paquete>` para agregar dependencias
  - Comando: `uv sync` para instalar todas las dependencias
  - Comando: `uv run <comando>` para ejecutar comandos en el entorno virtual

- **Frontend (Node.js):** Usa `npm` para gestionar dependencias de Node.js.
  - Comando: `npm install <paquete>` para agregar dependencias
  - Comando: `npm run dev` para desarrollo
  - Comando: `npm test` para ejecutar tests

## Control de Versiones (Git)

- **Commits Regulares:** Realiza commits en Git después de completar cada función o parte significativa del código (backend o frontend).
- **Mensajes Descriptivos:** Los mensajes de commit deben ser claros y descriptivos:
  - Ejemplo: "feat(backend): implementar endpoint de creación de sesiones"
  - Ejemplo: "feat(frontend): agregar componente de editor de código"
  - Ejemplo: "fix(websocket): corregir sincronización en tiempo real"
- **Commits de Seguridad:** Antes de hacer cambios grandes o refactorizaciones, crea un commit de seguridad primero.
- **No commits de archivos temporales:** Nunca hagas commit de archivos como `.env`, `node_modules/`, `__pycache__/`, `.venv/`, o archivos de base de datos.

## Estructura del Proyecto

- Mantén la separación clara entre `backend/` y `frontend/`
- El backend debe estar en la carpeta `backend/` usando FastAPI
- El frontend debe estar en la carpeta `frontend/` usando React + Vite
- Los tests deben estar en carpetas `tests/` dentro de cada módulo

## Desarrollo Backend (FastAPI)

- Usa FastAPI con Python 3.13+
- Implementa documentación automática en `/docs` (Swagger UI)
- Usa type hints en todas las funciones
- Valida datos de entrada con Pydantic
- Maneja errores apropiadamente con HTTPException
- Para WebSockets, usa `fastapi.WebSocket` y maneja conexiones correctamente

## Desarrollo Frontend (React + Vite)

- Usa React con TypeScript cuando sea posible
- Organiza componentes en carpetas lógicas
- Usa hooks personalizados para lógica reutilizable
- Maneja el estado de WebSocket correctamente (conexión, desconexión, reconexión)
- Implementa manejo de errores en las llamadas a la API

## WebSockets y Tiempo Real

- Implementa reconexión automática si la conexión se pierde
- Sincroniza cambios de código en tiempo real entre todos los usuarios conectados
- Maneja conflictos cuando múltiples usuarios editan simultáneamente
- Valida datos antes de enviarlos por WebSocket

## Seguridad

- **Ejecución de Código:** El código debe ejecutarse SOLO en el navegador usando WASM. NUNCA ejecutes código del usuario en el servidor.
- **Validación:** Valida y sanitiza TODOS los inputs del usuario tanto en frontend como backend
- **Variables de Entorno:** Usa variables de entorno para secretos y configuraciones. Nunca hardcodees credenciales.

## Documentación

- Mantén el README.md actualizado con instrucciones de ejecución
- Documenta endpoints importantes en el código
- Incluye ejemplos de uso cuando sea relevante

## Prevención de Errores Comunes

- Antes de modificar código existente, lee el contexto completo del archivo
- No elimines código sin entender su propósito primero
- Si algo no funciona, revisa los logs antes de hacer cambios adicionales
- Mantén la consistencia con el estilo de código existente
```

#### Beneficios de usar agents.md con Cursor

- **Consistencia:** El agente sigue las mismas reglas en toda la sesión de desarrollo
- **Eficiencia:** No necesitas repetir instrucciones en cada prompt
- **Mejores Prácticas:** Las reglas del proyecto se aplican automáticamente
- **Prevención de Errores:** Evita commits de archivos temporales y uso incorrecto de herramientas

### 🎓 Preguntas del Homework

1. **Pregunta 1:** ¿Cuál fue el prompt inicial que le diste a la IA para comenzar la implementación?
2. **Pregunta 2:** ¿Cuál es el comando de terminal que usas para ejecutar los tests?
3. **Pregunta 3:** ¿Cuál es el comando en `package.json` para `npm dev` que ejecuta ambos servicios?
4. **Pregunta 4:** ¿Qué librería usó la IA para el resaltado de sintaxis?
5. **Pregunta 5:** ¿Qué librería usó la IA para compilar Python a WASM?
6. **Pregunta 6:** ¿Cuál es la imagen base que usaste en tu Dockerfile?
7. **Pregunta 7:** ¿Qué servicio usaste para el despliegue?

### 🔗 Enlaces relacionados

- [Curso completo - AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
- [Semana 2 - Desarrollo End-to-End](./../week2/)
- [Formulario de entrega](https://courses.datatalks.club/ai-dev-tools-2025/homework/hw2)

### 📚 Recursos de Aprendizaje

- [Documentación de FastAPI](https://fastapi.tiangolo.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de Vite](https://vitejs.dev/)
- [WebSockets en FastAPI](https://fastapi.tiangolo.com/advanced/websockets/)
- [Documentación de Render](https://render.com/docs)

---

## End-to-End Application Development

### 📋 Assignment Statement

**Official assignment link:** [Homework 2 - AI Dev Tools Zoomcamp 2025](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2025/02-end-to-end/homework.md)

#### Assignment Summary

This assignment covers complete end-to-end application development assisted by AI. The goal is to build a platform for online coding interviews with the following features:

- Create a link and share it with candidates
- Allow all connected users to edit code in the code panel
- Show real-time updates to all connected users
- Support syntax highlighting for multiple languages
- Execute code safely in the browser

#### ✨ Technologies Used

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite (JavaScript/TypeScript)
- **Real-time Communication:** WebSockets
- **Syntax Highlighting:** Specialized libraries
- **Code Execution:** WASM (WebAssembly) for safe browser execution
- **Containerization:** Docker
- **Deployment:** Render

#### 🎯 Implemented Features

- **Real-time Collaboration:** Multiple users can edit code simultaneously
- **Automatic Synchronization:** Changes reflected instantly across all clients
- **Syntax Highlighting:** Support for JavaScript, Python and other languages
- **Safe Execution:** Code executed in browser using WASM
- **Session Sharing:** Unique link generation for sharing coding sessions
- **Integration Tests:** Test coverage to validate client-server interaction

### 🚀 How to run this assignment

#### Prerequisites

- **Backend:**
  - Python 3.13+
  - [uv](https://github.com/astral-sh/uv) installed (recommended) or pip

- **Frontend:**
  - Node.js 18+ and npm

- **Optional:**
  - Docker (for containerization)

#### Execution steps

1. **Clone and navigate to the project:**
   ```bash
   cd application_development
   ```

2. **Set up Backend (FastAPI):**
   ```bash
   cd backend
   uv venv && uv sync  # or: pip install -r requirements.txt
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Set up Frontend (React + Vite):**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run both services simultaneously:**
   
   From project root (`application_development`):
   ```bash
   npm run dev
   ```
   
   Or run separately:
   
   **Terminal 1 - Backend:**
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn main:app --reload --port 8000
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173 (default Vite port)
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs (Swagger UI)

6. **Run tests:**
   ```bash
   # Backend tests
   cd backend
   pytest

   # Frontend tests
   cd frontend
   npm test
   ```

### 📁 File structure

The complete project structure will be documented once the code is implemented. For now, the project follows this basic organization:

```
homework2/
├── application_development/      # Project source code
│   ├── backend/                  # FastAPI Backend
│   ├── frontend/                 # React + Vite Frontend
│   └── agents.md                 # Instructions for AI
└── README.md                     # This file
```

> **Note:** The detailed structure will be updated as the project development is completed.

### 🔧 Useful Commands

#### Development

```bash
# Run both services with concurrently
npm run dev

# Backend only
cd backend && uvicorn main:app --reload

# Frontend only
cd frontend && npm run dev
```

#### Testing

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Integration tests
cd backend && pytest tests/integration
```

#### Containerization

```bash
# Build Docker image
docker build -t coding-interview-platform .

# Run container
docker run -p 8000:8000 coding-interview-platform
```

#### Deployment on Render

```bash
# 1. Make sure you have a render.yaml file in the project root
# 2. Connect your GitHub repository to Render
# 3. Render will automatically detect the Dockerfile and deploy the application
# 4. Configure necessary environment variables in Render dashboard
```

**Note:** The application is deployed on Render. You can access it at the URL provided by Render after deployment.

### 📝 Important notes

- The application uses WebSockets for real-time communication
- Code is executed safely in the browser using WASM
- Integration tests validate complete client-server interaction
- The project is structured to facilitate AI-assisted development
- All dependencies are documented in `pyproject.toml` (backend) and `package.json` (frontend)

### 🤖 Cursor IDE Configuration with agents.md

This project uses an `agents.md` file to configure Cursor IDE's AI assistant. This file contains instructions that Cursor reads automatically to follow project best practices and conventions.

#### What is agents.md?

`agents.md` is a convention file where general instructions for the AI assistant are defined. Cursor IDE reads it automatically, allowing consistency in development without having to repeat instructions in each prompt.

#### Project agents.md Content

The `application_development/agents.md` file contains the following instructions:

```markdown
# Instrucciones para el Agente de IA

## Gestión de Dependencias

- **Backend (Python):** Siempre usa `uv` para instalar paquetes Python. NUNCA uses `pip`.
  - Comando: `uv add <paquete>` para agregar dependencias
  - Comando: `uv sync` para instalar todas las dependencias
  - Comando: `uv run <comando>` para ejecutar comandos en el entorno virtual

- **Frontend (Node.js):** Usa `npm` para gestionar dependencias de Node.js.
  - Comando: `npm install <paquete>` para agregar dependencias
  - Comando: `npm run dev` para desarrollo
  - Comando: `npm test` para ejecutar tests

## Control de Versiones (Git)

- **Commits Regulares:** Realiza commits en Git después de completar cada función o parte significativa del código (backend o frontend).
- **Mensajes Descriptivos:** Los mensajes de commit deben ser claros y descriptivos:
  - Ejemplo: "feat(backend): implementar endpoint de creación de sesiones"
  - Ejemplo: "feat(frontend): agregar componente de editor de código"
  - Ejemplo: "fix(websocket): corregir sincronización en tiempo real"
- **Commits de Seguridad:** Antes de hacer cambios grandes o refactorizaciones, crea un commit de seguridad primero.
- **No commits de archivos temporales:** Nunca hagas commit de archivos como `.env`, `node_modules/`, `__pycache__/`, `.venv/`, o archivos de base de datos.

## Estructura del Proyecto

- Mantén la separación clara entre `backend/` y `frontend/`
- El backend debe estar en la carpeta `backend/` usando FastAPI
- El frontend debe estar en la carpeta `frontend/` usando React + Vite
- Los tests deben estar en carpetas `tests/` dentro de cada módulo

## Desarrollo Backend (FastAPI)

- Usa FastAPI con Python 3.13+
- Implementa documentación automática en `/docs` (Swagger UI)
- Usa type hints en todas las funciones
- Valida datos de entrada con Pydantic
- Maneja errores apropiadamente con HTTPException
- Para WebSockets, usa `fastapi.WebSocket` y maneja conexiones correctamente

## Desarrollo Frontend (React + Vite)

- Usa React con TypeScript cuando sea posible
- Organiza componentes en carpetas lógicas
- Usa hooks personalizados para lógica reutilizable
- Maneja el estado de WebSocket correctamente (conexión, desconexión, reconexión)
- Implementa manejo de errores en las llamadas a la API

## WebSockets y Tiempo Real

- Implementa reconexión automática si la conexión se pierde
- Sincroniza cambios de código en tiempo real entre todos los usuarios conectados
- Maneja conflictos cuando múltiples usuarios editan simultáneamente
- Valida datos antes de enviarlos por WebSocket

## Seguridad

- **Ejecución de Código:** El código debe ejecutarse SOLO en el navegador usando WASM. NUNCA ejecutes código del usuario en el servidor.
- **Validación:** Valida y sanitiza TODOS los inputs del usuario tanto en frontend como backend
- **Variables de Entorno:** Usa variables de entorno para secretos y configuraciones. Nunca hardcodees credenciales.

## Documentación

- Mantén el README.md actualizado con instrucciones de ejecución
- Documenta endpoints importantes en el código
- Incluye ejemplos de uso cuando sea relevante

## Prevención de Errores Comunes

- Antes de modificar código existente, lee el contexto completo del archivo
- No elimines código sin entender su propósito primero
- Si algo no funciona, revisa los logs antes de hacer cambios adicionales
- Mantén la consistencia con el estilo de código existente
```

#### Benefits of using agents.md with Cursor

- **Consistency:** The agent follows the same rules throughout the development session
- **Efficiency:** You don't need to repeat instructions in each prompt
- **Best Practices:** Project rules are applied automatically
- **Error Prevention:** Prevents commits of temporary files and incorrect tool usage

### 🎓 Homework Questions

1. **Question 1:** What was the initial prompt you gave to AI to start the implementation?
2. **Question 2:** What terminal command do you use to execute tests?
3. **Question 3:** What command in `package.json` for `npm dev` runs both services?
4. **Question 4:** Which library did AI use for syntax highlighting?
5. **Question 5:** Which library did AI use to compile Python to WASM?
6. **Question 6:** What base image did you use in your Dockerfile?
7. **Question 7:** Which service did you use for deployment?

### 🔗 Related links

- [Complete course - AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
- [Week 2 - End-to-End Development](./../week2/)
- [Submission form](https://courses.datatalks.club/ai-dev-tools-2025/homework/hw2)

### 📚 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [WebSockets in FastAPI](https://fastapi.tiangolo.com/advanced/websockets/)
- [Render Documentation](https://render.com/docs)


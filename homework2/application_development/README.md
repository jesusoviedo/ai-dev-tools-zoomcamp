# Plataforma de Entrevistas de Código

Plataforma de entrevistas de código online con colaboración en tiempo real desarrollada con FastAPI (backend) y React + Vite + TypeScript (frontend).

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Testing](#testing)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Documentación API](#documentación-api)

## 🔧 Requisitos

### Backend
- Python 3.13+
- [uv](https://github.com/astral-sh/uv) instalado

### Frontend
- **Node.js 18+** (requerido)
- [nvm](https://www.nvmnode.com/) instalado 

## 🚀 Instalación

### Backend

```bash
cd backend
# Crear entorno virtual e instalar dependencias
uv venv && uv sync
```

### Frontend

**Opción 1: Script automático (recomendado)**
```bash
cd frontend
./install.sh
```
Este script carga nvm automáticamente, usa la versión de Node.js especificada en `.nvmrc` (si existe), e instala todas las dependencias.

**Opción 2: Instalación manual (requiere nvm cargado)**
```bash
cd frontend
# Asegúrate de que nvm esté cargado en tu terminal
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar la versión especificada en .nvmrc
nvm use

# Instalar dependencias
npm install
```

> **Nota:** Si usas nvm, normalmente se carga automáticamente en nuevas terminales desde `.bashrc` o `.zshrc`. El script `install.sh` detecta y usa la versión correcta de Node.js automáticamente.

## 💻 Desarrollo

### Ejecutar ambos servicios simultáneamente

Desde la raíz del proyecto (`application_development`):

```bash
npm run dev
```

### Ejecutar por separado

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
uv run uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
nvm use  # Cargar la versión de Node.js especificada en .nvmrc
npm run dev
```

### Acceder a la aplicación

- Frontend: http://localhost:5173 (puerto por defecto de Vite)
- Backend API: http://localhost:8000
- Documentación API: http://localhost:8000/docs (Swagger UI)

### Build del Frontend

```bash
cd frontend
nvm use  # Cargar la versión de Node.js especificada en .nvmrc
npm run build
```

## 🧪 Testing

El proyecto incluye una estrategia completa de pruebas separando pruebas unitarias de integración.

### Backend Testing

#### Estructura de Tests

- `backend/tests/unit/` - Pruebas unitarias (no dependen de servidor HTTP, base de datos o WebSocket reales)
- `backend/tests/integration/` - Pruebas de integración (usan TestClient de FastAPI)

#### Comandos de Testing

```bash
cd backend

# Ejecutar todas las pruebas
uv run pytest

# Ejecutar solo pruebas unitarias
uv run pytest tests/unit/ -v

# Ejecutar solo pruebas de integración
uv run pytest tests/integration/ -v -m integration

# Ejecutar pruebas con cobertura
uv run pytest --cov=app --cov-report=html

# Ejecutar pruebas con cobertura (sin reporte HTML)
uv run pytest --cov=app

# Ejecutar pruebas en modo watch (ejecuta automáticamente al detectar cambios)
# Nota: pytest-watch requiere pytest.ini (limitación conocida de la herramienta)
# La configuración principal está en pyproject.toml
# pytest.ini existe solo para compatibilidad con pytest-watch
uv run pytest-watch

# Opciones útiles de pytest-watch:
# - Limpiar pantalla antes de cada ejecución
uv run pytest-watch --clear

# - Ejecutar solo pruebas unitarias en modo watch
uv run pytest-watch tests/unit/

# - Ejecutar solo pruebas de integración en modo watch
uv run pytest-watch tests/integration/
```

#### Tipos de Pruebas Backend

**Pruebas Unitarias:**
- Validación de modelos Pydantic
- Validación de datos de entrada
- Lógica pura sin dependencias externas

**Pruebas de Integración:**
- Endpoints REST API (GET /health, POST /api/sessions, GET /api/sessions/{session_id})
- Conexiones WebSocket
- Broadcast de mensajes
- Notificaciones de usuarios conectados/desconectados
- Manejo de errores

### Frontend Testing

#### Estructura de Tests

- `frontend/src/__tests__/unit/` - Pruebas unitarias de componentes React

#### Comandos de Testing

```bash
cd frontend

# Asegúrate de que nvm esté cargado y usar la versión correcta
nvm use

# Ejecutar todas las pruebas una vez
npm run test:run

# Ejecutar pruebas en modo watch (detecta cambios automáticamente)
npm test

# Ejecutar solo pruebas unitarias
npm run test:unit

# Ejecutar pruebas con cobertura
npm run test:coverage
```

> **Nota:** Si nvm está configurado en tu `.bashrc`, se cargará automáticamente al iniciar sesión. Si `npm` no se encuentra, carga nvm manualmente: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"`

#### Requisitos Frontend Testing

- Node.js 18+ (se usa automáticamente la versión de `.nvmrc`)

#### Tipos de Pruebas Frontend

**Pruebas Unitarias:**
- Renderizado de componentes
- Interacciones del usuario (typing, clicks)
- Verificación de elementos en el DOM
- Estado de componentes

## 📁 Estructura del Proyecto

```
application_development/
├── backend/                  # FastAPI Backend
│   ├── main.py              # Punto de entrada de FastAPI
│   ├── pyproject.toml       # Configuración y dependencias (uv)
│   ├── uv.lock              # Dependency lock file (uv)
│   ├── app/                 # Módulo principal de la aplicación
│   │   ├── __init__.py
│   │   ├── models.py        # Modelos Pydantic para validación
│   │   ├── routes.py        # Rutas REST API
│   │   └── websocket.py     # Manejo de WebSockets
│   └── tests/               # Tests del backend
│       ├── unit/            # Pruebas unitarias
│       └── integration/     # Pruebas de integración
├── frontend/                # React + Vite Frontend
│   ├── index.html           # HTML principal
│   ├── package.json         # Dependencias y scripts npm
│   ├── vite.config.ts       # Configuración de Vite
│   ├── src/                 # Código fuente del frontend
│   │   ├── App.tsx          # Componente principal
│   │   ├── main.tsx         # Punto de entrada React
│   │   ├── components/      # Componentes React
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # Definiciones de tipos TypeScript
│   │   ├── utils/           # Utilidades y helpers
│   │   └── __tests__/       # Tests del frontend
│   │       └── unit/        # Pruebas unitarias
│   └── public/              # Archivos estáticos públicos
├── openapi.yaml             # Especificación OpenAPI de la API
├── AGENTS.md                # Instrucciones para AI (Cursor IDE)
└── README.md                # Este archivo
```

## 📚 Documentación API

Una vez que el servidor backend esté ejecutándose, puedes acceder a la documentación interactiva de la API:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

La especificación OpenAPI completa está disponible en `openapi.yaml`.

## 🔗 Enlaces Útiles

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Pytest Documentation](https://docs.pytest.org/)


# Stack Backend Moderno: FastAPI, SQLAlchemy y Buenas Prácticas con IA

## Construyendo APIs Robustas y Escalables con Python Moderno

El desarrollo backend moderno requiere más que solo elegir un framework. Necesitas entender cómo diferentes tecnologías trabajan juntas para crear aplicaciones robustas, escalables y mantenibles. FastAPI ha emergido como uno de los frameworks más modernos de Python, combinando alto rendimiento con facilidad de desarrollo, mientras que SQLAlchemy proporciona una abstracción poderosa sobre bases de datos.

Este artículo explora cómo construir un stack backend moderno combinando FastAPI y SQLAlchemy, mostrando cómo estas tecnologías se complementan perfectamente. Aprenderás sobre las características que hacen a FastAPI especial: documentación automática, validación de tipos, soporte nativo para async/await, y rendimiento comparable a Node.js y Go. Veremos cómo SQLAlchemy permite trabajar con diferentes bases de datos sin cambiar tu código, facilitando el desarrollo con SQLite y el despliegue con PostgreSQL.

---

## Introducción

Cuando construyes una API backend moderna, necesitas más que un framework web. Necesitas:
- Validación automática de datos
- Documentación interactiva
- Soporte para programación asíncrona
- Abstracción de base de datos
- Type safety
- Alto rendimiento

FastAPI y SQLAlchemy juntos proporcionan todo esto y más. FastAPI maneja la capa HTTP con validación automática y documentación, mientras que SQLAlchemy maneja la persistencia de datos con una abstracción poderosa que funciona con múltiples bases de datos.

---

## ¿Por Qué FastAPI?

FastAPI es un framework web moderno para Python que combina lo mejor de varios mundos:

### Características Principales

**1. Alto Rendimiento:**
- Basado en Starlette (framework ASGI)
- Rendimiento comparable a Node.js y Go
- Soporte nativo para async/await

**2. Validación Automática:**
- Basado en Pydantic
- Validación de tipos automática
- Mensajes de error claros

**3. Documentación Automática:**
- Swagger UI en `/docs`
- ReDoc en `/redoc`
- Generado automáticamente desde tu código

**4. Type Hints:**
- Soporte completo para type hints de Python
- Mejor IDE support
- Menos errores en tiempo de ejecución

**5. Estándares Modernos:**
- Basado en OpenAPI
- Compatible con JSON Schema
- WebSockets nativos

### Comparación con Otros Frameworks

**FastAPI vs Django:**
- ✅ FastAPI: Más rápido y ligero
- ✅ FastAPI: Mejor para APIs
- ✅ FastAPI: Async nativo
- ❌ Django: Mejor para aplicaciones completas con admin
- ❌ Django: Más maduro y establecido

**FastAPI vs Flask:**
- ✅ FastAPI: Validación automática
- ✅ FastAPI: Documentación automática
- ✅ FastAPI: Mejor rendimiento
- ✅ FastAPI: Async nativo
- ❌ Flask: Más simple para proyectos pequeños
- ❌ Flask: Más control manual

**FastAPI vs Express.js:**
- ✅ FastAPI: Type safety con Python
- ✅ FastAPI: Validación automática
- ✅ Express.js: Ecosistema más grande
- ✅ Express.js: Más desarrolladores familiarizados

---

## Arquitectura de FastAPI

### Estructura de Proyecto Recomendada

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Punto de entrada
│   ├── models.py            # Modelos Pydantic
│   ├── database.py          # Configuración SQLAlchemy
│   ├── schemas.py           # Schemas de base de datos
│   ├── routes.py            # Endpoints de API
│   └── websocket.py         # WebSocket handlers
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
└── README.md
```

### Aplicación Básica FastAPI

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Coding Interview Platform API",
    description="API para plataforma de entrevistas de código",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

---

## Pydantic y Validación de Datos

Pydantic es la biblioteca que hace la validación automática en FastAPI. Define modelos de datos con type hints y Pydantic valida automáticamente.

### Modelos Pydantic Básicos

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

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
    active_users: int = Field(default=0, ge=0, description="Número de usuarios activos")
```

### Uso en Endpoints

```python
from fastapi import APIRouter, HTTPException, status
from app.models import CreateSessionRequest, SessionResponse

router = APIRouter()

@router.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: CreateSessionRequest = CreateSessionRequest()):
    """
    Crear nueva sesión de código.
    
    Crea una nueva sesión de código y retorna el ID de la sesión
    y el enlace para compartir.
    """
    # FastAPI valida automáticamente el request
    # Si es inválido, retorna 422 con detalles del error
    
    # Tu lógica aquí...
    return SessionResponse(...)
```

**Ventajas:**
- Validación automática de tipos
- Mensajes de error claros
- Documentación automática en Swagger
- Type safety en tiempo de desarrollo

---

## Async/Await en Python

FastAPI aprovecha completamente async/await de Python, permitiendo manejar muchas conexiones concurrentes eficientemente.

### Endpoints Asíncronos

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/slow-endpoint")
async def slow_endpoint():
    # Operación asíncrona (ej: llamada a API externa)
    await asyncio.sleep(1)
    return {"message": "Done"}

@app.get("/fast-endpoint")
def fast_endpoint():
    # Operación síncrona rápida
    return {"message": "Done"}
```

**Cuándo usar async:**
- ✅ Llamadas a APIs externas
- ✅ Operaciones de I/O (archivos, red)
- ✅ Consultas a base de datos (con SQLAlchemy async)
- ❌ Operaciones CPU-intensivas (usa background tasks)

### Operaciones de Base de Datos Asíncronas

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Crear engine asíncrono
engine = create_async_engine("postgresql+asyncpg://...")

# Crear session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    return session
```

---

## SQLAlchemy ORM

SQLAlchemy es el ORM más popular de Python. Proporciona una abstracción poderosa sobre bases de datos SQL.

### ¿Qué es un ORM?

Un ORM (Object-Relational Mapping) permite interactuar con bases de datos usando objetos y métodos en lugar de escribir SQL directamente.

**Ventajas:**
- Código más legible
- Prevención de SQL injection
- Abstracción de base de datos
- Migraciones facilitadas

**Desventajas:**
- Puede ser más lento que SQL directo
- Curva de aprendizaje
- Menos control sobre queries complejas

### Configuración Básica de SQLAlchemy

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Crear engine
engine = create_engine(
    "sqlite:///./app.db",  # o "postgresql://user:pass@localhost/dbname"
    connect_args={"check_same_thread": False}  # Solo para SQLite
)

# Crear session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()
```

### Modelos SQLAlchemy

```python
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, unique=True, index=True)
    language = Column(String, default="python")
    initial_code = Column(String)
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    active_users = Column(Integer, default=0)
```

### Dependency Injection con FastAPI

```python
from fastapi import Depends
from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
```

---

## Integración FastAPI + SQLAlchemy

### Patrón Completo

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import SessionCreate, SessionResponse
from app.models import Session as SessionModel

router = APIRouter()

@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db)
):
    """Crear nueva sesión."""
    db_session = SessionModel(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Obtener sesión por ID."""
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    return db_session
```

### Manejo de Transacciones

```python
from sqlalchemy.exc import SQLAlchemyError

@router.post("/sessions")
async def create_session(session: SessionCreate, db: Session = Depends(get_db)):
    try:
        db_session = SessionModel(**session.dict())
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
```

---

## Abstracción de Base de Datos

Una de las mayores ventajas de SQLAlchemy es que puedes cambiar de base de datos sin cambiar tu código.

### SQLite para Desarrollo

```python
# Desarrollo local
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

### PostgreSQL para Producción

```python
# Producción
DATABASE_URL = "postgresql://user:password@localhost/dbname"
engine = create_engine(DATABASE_URL)
```

**El mismo código funciona con ambas!**

### Configuración Dinámica

```python
import os
from sqlalchemy import create_engine

database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Parchear URL de Render (postgres:// -> postgresql://)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(database_url)
```

---

## Desarrollo con IA

Las herramientas de IA pueden acelerar significativamente el desarrollo de este stack.

### Generar Modelos Pydantic

**Prompt ejemplo:**
```
Crea un modelo Pydantic para una sesión de código con estos campos:
- session_id: string requerido
- room_id: string requerido
- language: string opcional, default "python"
- initial_code: string opcional
- created_at: datetime requerido
- active_users: integer, mínimo 0, default 0

Incluye validaciones y descripciones.
```

### Generar Endpoints FastAPI

**Prompt ejemplo:**
```
Crea un endpoint FastAPI POST /api/sessions que:
- Acepta CreateSessionRequest
- Retorna SessionResponse
- Usa SQLAlchemy para guardar en base de datos
- Maneja errores apropiadamente
- Incluye documentación
```

### Refactorizar Código

**Prompt ejemplo:**
```
Refactoriza este endpoint para usar async/await y SQLAlchemy async:

[pegar código actual]
```

---

## Mejores Prácticas

### 1. Organización de Código

**Separar responsabilidades:**
- `models.py`: Modelos Pydantic (validación)
- `schemas.py`: Modelos SQLAlchemy (base de datos)
- `routes.py`: Endpoints de API
- `database.py`: Configuración de base de datos

### 2. Manejo de Errores

```python
from fastapi import HTTPException, status

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    return session
```

### 3. Validación de Datos

Usa Pydantic para validación:
- Type hints claros
- Validadores personalizados cuando sea necesario
- Mensajes de error descriptivos

### 4. Logging

```python
import logging

logger = logging.getLogger(__name__)

@app.post("/sessions")
async def create_session(session: SessionCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating session with language: {session.language}")
    try:
        # ... código ...
        logger.info(f"Session created: {db_session.id}")
        return db_session
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}", exc_info=True)
        raise
```

### 5. Testing

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_session():
    response = client.post(
        "/api/sessions",
        json={"language": "python", "initial_code": "# Test"}
    )
    assert response.status_code == 201
    assert "session_id" in response.json()
```

---

## Migraciones con Alembic

Alembic es la herramienta de migraciones de SQLAlchemy.

### Configuración Inicial

```bash
# Instalar Alembic
pip install alembic

# Inicializar
alembic init alembic

# Configurar alembic.ini
sqlalchemy.url = sqlite:///./app.db
```

### Crear Migración

```bash
# Generar migración automática
alembic revision --autogenerate -m "Create sessions table"

# Aplicar migración
alembic upgrade head
```

### Migraciones Manuales

```python
# alembic/versions/xxx_create_sessions.py
def upgrade():
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('room_id', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('sessions')
```

---

## Performance y Optimización

### 1. Usa Async para I/O

```python
# ✅ BIEN: Async para operaciones de I/O
@app.get("/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session))
    return result.scalars().all()

# ❌ MAL: Sync para operaciones de I/O
@app.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return db.query(Session).all()  # Bloquea el hilo
```

### 2. Eager Loading

```python
from sqlalchemy.orm import joinedload

# Cargar relaciones en una query
sessions = db.query(Session).options(joinedload(Session.users)).all()
```

### 3. Paginación

```python
from fastapi import Query

@app.get("/sessions")
async def get_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    sessions = db.query(Session).offset(skip).limit(limit).all()
    return sessions
```

---

## Conclusión

FastAPI y SQLAlchemy forman un stack backend moderno y poderoso que combina:
- Alto rendimiento con async/await
- Validación automática con Pydantic
- Documentación automática
- Abstracción de base de datos flexible
- Type safety con Python

**Takeaways principales:**

1. **FastAPI** proporciona validación automática y documentación
2. **SQLAlchemy** abstrae la base de datos permitiendo cambiar fácilmente
3. **Async/await** mejora el rendimiento para operaciones I/O
4. **Pydantic** valida datos automáticamente
5. **IA** puede acelerar el desarrollo de este stack
6. **Mejores prácticas** mejoran mantenibilidad y performance

Este stack es ideal para aplicaciones modernas que necesitan APIs rápidas, bien documentadas y fáciles de mantener.

---

## Referencias

- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Documentación oficial de FastAPI
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/) - Guía completa del ORM
- [Pydantic Documentation](https://docs.pydantic.dev/) - Validación de datos
- [Alembic Documentation](https://alembic.sqlalchemy.org/) - Migraciones de base de datos
- [Python Async/Await Guide](https://docs.python.org/3/library/asyncio.html) - Programación asíncrona
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/) - Mejores prácticas
- [SQLAlchemy Performance](https://docs.sqlalchemy.org/en/14/faq/performance.html) - Optimización de performance



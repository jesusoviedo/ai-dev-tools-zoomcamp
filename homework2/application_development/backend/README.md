# Backend - Plataforma de Entrevistas de Código

Backend desarrollado con FastAPI (Python 3.13+).

## Instalación

```bash
# Crear entorno virtual e instalar dependencias
uv venv && uv sync
```

## Desarrollo

```bash
# Activar entorno virtual
source .venv/bin/activate  # En Windows: .venv\Scripts\activate

# Ejecutar servidor de desarrollo
uv run uvicorn main:app --reload --port 8000
```

El servidor estará disponible en http://localhost:8000

## Documentación API

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
# Ejecutar tests
uv run pytest
```

## Estructura

- `main.py` - Punto de entrada de FastAPI
- `app/models.py` - Modelos Pydantic para validación
- `app/routes.py` - Rutas REST API
- `app/websocket.py` - Manejo de WebSockets


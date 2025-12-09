# Backend - Plataforma de Entrevistas de Código

Backend desarrollado con FastAPI (Python 3.13+).

> 📖 **Documentación completa**: Consulta el [README principal](../README.md) para información detallada sobre instalación, desarrollo y testing.

## Inicio Rápido

```bash
# Instalación
uv venv && uv sync

# Desarrollo
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
uv run uvicorn main:app --reload --port 8000

# Testing
uv run pytest
```

## Estructura

- `main.py` - Punto de entrada de FastAPI
- `app/models.py` - Modelos Pydantic para validación
- `app/routes.py` - Rutas REST API
- `app/websocket.py` - Manejo de WebSockets
- `tests/` - Pruebas unitarias e integración


"""Main FastAPI application entry point."""

from pathlib import Path
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import router
from app.websocket import websocket_endpoint

# Create FastAPI app
app = FastAPI(
    title="Coding Interview Platform API",
    description="API para plataforma de entrevistas de código online con colaboración en tiempo real",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# En producción, como frontend y backend están en el mismo origen, podemos ser más permisivos
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative frontend port
        "*",  # Permitir todos los orígenes en producción (ajustar según necesidades de seguridad)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routes PRIMERO (tienen mayor prioridad)
app.include_router(router)


# WebSocket endpoint (también tiene prioridad sobre archivos estáticos)
@app.websocket("/ws/{room_id}")
async def websocket_route(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for real-time collaboration.
    
    Establece una conexión WebSocket para colaboración en tiempo real.
    Los usuarios pueden enviar y recibir cambios de código en tiempo real.
    """
    await websocket_endpoint(websocket, room_id)


# Montar archivos estáticos del frontend AL FINAL (baja prioridad)
# Esto permite que las rutas /api y /ws tengan prioridad
static_dir = Path(__file__).parent.parent / "static"

if static_dir.exists():
    # Montar archivos estáticos en la ruta raíz
    # html=True permite que FastAPI sirva index.html automáticamente para rutas no encontradas
    # Esto es necesario para que React Router funcione correctamente en una SPA
    # Las rutas de API (/api/*) y WebSocket (/ws/*) tienen prioridad porque se definieron antes
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""Main FastAPI application entry point."""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative frontend port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routes
app.include_router(router)


# WebSocket endpoint
@app.websocket("/ws/{room_id}")
async def websocket_route(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for real-time collaboration.
    
    Establece una conexión WebSocket para colaboración en tiempo real.
    Los usuarios pueden enviar y recibir cambios de código en tiempo real.
    """
    await websocket_endpoint(websocket, room_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

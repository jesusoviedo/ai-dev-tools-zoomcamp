# Multi-stage build para aplicación completa (Frontend + Backend)

# ============================================
# Stage 1: Build del Frontend (Node.js)
# ============================================
FROM node:24-slim AS frontend-builder

WORKDIR /app/frontend

# Copiar archivos de dependencias
COPY frontend/package.json frontend/package-lock.json ./

# Instalar dependencias (usar npm ci para builds reproducibles)
RUN npm ci

# Copiar código fuente del frontend
COPY frontend/ ./

# Build del frontend (genera archivos estáticos en dist/)
RUN npm run build

# ============================================
# Stage 2: Runtime del Backend (Python)
# ============================================
FROM python:3.13-slim AS runtime

# Instalar dependencias del sistema necesarias y uv de forma liviana
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.cargo/bin/uv /usr/local/bin/uv && \
    chmod +x /usr/local/bin/uv && \
    rm -rf /root/.cargo && \
    # Eliminar curl después de instalar uv (ya no se necesita)
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Agregar /usr/local/bin al PATH (ya está por defecto, pero lo dejamos explícito)
ENV PATH="/usr/local/bin:$PATH"

# Crear usuario no privilegiado para ejecutar la aplicación
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copiar archivos de configuración del backend
COPY backend/pyproject.toml ./
COPY backend/uv.lock* ./

# Instalar dependencias del backend (sin dev dependencies) como root
# Usar --frozen solo si existe uv.lock, de lo contrario sync normal
RUN if [ -f uv.lock ]; then \
        uv sync --no-dev --frozen; \
    else \
        uv sync --no-dev; \
    fi

# Copiar código fuente del backend
COPY backend/ ./

# Copiar archivos estáticos del frontend desde Stage 1
COPY --from=frontend-builder /app/frontend/dist ./static

# Cambiar ownership de todos los archivos al usuario no privilegiado
# Esto incluye el entorno virtual creado por uv
RUN chown -R appuser:appuser /app && \
    # Limpiar archivos temporales y cachés para reducir tamaño de imagen
    find /app -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
    find /app -type f -name "*.pyc" -delete 2>/dev/null || true && \
    find /app -type f -name "*.pyo" -delete 2>/dev/null || true

# Cambiar al usuario no privilegiado
USER appuser

# Configurar variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Exponer puerto 8000
EXPOSE 8000

# Comando por defecto: ejecutar FastAPI con uvicorn
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


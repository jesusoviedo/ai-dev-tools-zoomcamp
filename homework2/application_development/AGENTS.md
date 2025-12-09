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
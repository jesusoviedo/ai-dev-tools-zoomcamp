#!/bin/bash
# Script de instalación simplificado para el frontend
# Este script carga nvm automáticamente y ejecuta npm install

set -e  # Salir si hay errores

# Función para cargar nvm
load_nvm() {
    local nvm_paths=(
        "${HOME}/.nvm/nvm.sh"
        "${NVM_DIR:-}/nvm.sh"
        "/root/.nvm/nvm.sh"
    )
    
    # Si se ejecuta con sudo, usar el HOME del usuario original
    if [ -n "${SUDO_USER:-}" ]; then
        local sudo_home=$(eval echo ~"$SUDO_USER")
        nvm_paths=("${sudo_home}/.nvm/nvm.sh" "${nvm_paths[@]}")
    fi
    
    for nvm_path in "${nvm_paths[@]}"; do
        if [ -s "$nvm_path" ]; then
            export NVM_DIR="$(dirname "$nvm_path")"
            # shellcheck source=/dev/null
            . "$nvm_path"
            return 0
        fi
    done
    
    return 1
}

# Intentar cargar nvm
if ! load_nvm; then
    echo "❌ Error: nvm no encontrado." >&2
    echo "" >&2
    echo "Por favor, instala nvm primero:" >&2
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash" >&2
    echo "" >&2
    echo "O asegúrate de tener Node.js 18+ instalado y disponible en el PATH." >&2
    exit 1
fi

echo "✅ nvm cargado desde $NVM_DIR"

# Usar la versión especificada en .nvmrc si existe
if [ -f .nvmrc ]; then
    nvm use >/dev/null 2>&1 || {
        echo "⚠️  No se pudo usar la versión de .nvmrc, instalando..." >&2
        nvm install >/dev/null 2>&1 || true
        nvm use >/dev/null 2>&1 || true
    }
    echo "✅ Usando Node.js $(node --version) (especificado en .nvmrc)"
else
    # Intentar usar default o node
    nvm use default >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true
    echo "✅ Usando Node.js $(node --version)"
fi

# Verificar que node y npm estén disponibles
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "❌ Error: node o npm no están disponibles después de cargar nvm" >&2
    exit 1
fi

# Verificar versión de Node.js (debe ser 18+)
NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Se requiere Node.js 18 o superior. Versión actual: $(node --version)" >&2
    exit 1
fi

# Verificar si ya está instalado (para evitar reinstalar innecesariamente)
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo "📦 Dependencias ya instaladas. Para reinstalar, elimina node_modules y package-lock.json"
    echo ""
    echo "✅ Verificación completada!"
    echo "   Node.js: $(node --version)"
    echo "   npm: $(npm --version)"
    exit 0
fi

echo ""
echo "📦 Instalando dependencias..."
npm install

echo ""
echo "✅ Instalación completada!"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"

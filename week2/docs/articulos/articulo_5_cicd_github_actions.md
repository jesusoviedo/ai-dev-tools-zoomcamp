# CI/CD con GitHub Actions y Alternativas: Automatizando el Despliegue desde el Primer Commit

## Cómo Configurar Pipelines Completos que Ejecutan Tests y Despliegan Automáticamente

La automatización de pruebas y despliegues se ha convertido en un estándar en el desarrollo moderno de software. GitHub Actions ha democratizado el CI/CD al integrar pipelines directamente en el repositorio, pero ¿es la mejor opción para tu proyecto? Este artículo explora GitHub Actions en profundidad, pero también presenta alternativas y herramientas para ejecutar workflows localmente antes de hacer push.

Aprenderás cómo configurar pipelines completos de CI/CD con GitHub Actions, desde pruebas unitarias hasta despliegue automático en producción. Veremos cómo estructurar workflows, gestionar secretos de forma segura, y crear pipelines que se adapten a diferentes necesidades. El artículo también cubrirá herramientas como `act` y `nektos/act` que permiten ejecutar workflows de GitHub Actions localmente, facilitando el desarrollo y debugging antes de hacer commit.

---

## Introducción

Imagina este flujo ideal: haces un commit, lo haces push, y automáticamente:
1. Se ejecutan todos los tests
2. Se valida el código (linting, type checking)
3. Se construye la aplicación
4. Si todo pasa, se despliega automáticamente a producción

Esto es CI/CD (Continuous Integration / Continuous Deployment), y GitHub Actions lo hace posible directamente en tu repositorio, sin necesidad de servicios externos complejos.

---

## ¿Qué es CI/CD?

### Continuous Integration (CI)

**Definición:** Práctica de integrar código frecuentemente, donde cada integración se verifica automáticamente mediante builds y tests.

**Beneficios:**
- Detecta errores temprano
- Reduce tiempo de integración
- Mejora calidad del código
- Facilita colaboración

### Continuous Deployment (CD)

**Definición:** Automatización del proceso de despliegue, donde cada cambio que pasa las pruebas se despliega automáticamente a producción.

**Beneficios:**
- Despliegues más frecuentes
- Menos errores humanos
- Feedback rápido
- Rollback más fácil

### Componentes de un Pipeline CI/CD

1. **Build**: Compilar el código
2. **Test**: Ejecutar pruebas
3. **Lint**: Validar calidad de código
4. **Deploy**: Desplegar a producción

---

## GitHub Actions: Fundamentos

### ¿Qué es GitHub Actions?

GitHub Actions es una plataforma de automatización integrada en GitHub que permite crear workflows personalizados directamente en tu repositorio.

**Características:**
- Integrado en GitHub (sin servicios externos)
- Gratis para repositorios públicos
- Minutos gratuitos para repositorios privados
- Marketplace de acciones pre-construidas

### Estructura de Workflows

Los workflows se definen en archivos YAML en `.github/workflows/`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: pytest
```

### Eventos que Disparan Workflows

```yaml
on:
  # Push a cualquier rama
  push:
    branches: [ main, develop ]
  
  # Pull request
  pull_request:
    branches: [ main ]
  
  # Manual (desde GitHub UI)
  workflow_dispatch:
  
  # Horario (cron)
  schedule:
    - cron: '0 0 * * *'  # Diario a medianoche
  
  # Múltiples eventos
  push:
    paths:
      - 'backend/**'  # Solo cuando cambian archivos en backend/
```

---

## Workflow Completo: Tests y Despliegue

### Workflow Básico para Backend Python

```yaml
name: Backend CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install uv
          uv sync
      
      - name: Run linting
        run: uv run ruff check .
      
      - name: Run unit tests
        run: uv run pytest tests/unit/ -v
      
      - name: Run integration tests
        run: uv run pytest tests/integration/ -v
      
      - name: Generate coverage
        run: uv run pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Workflow para Frontend

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run linting
        working-directory: ./frontend
        run: npm run lint
      
      - name: Run tests
        working-directory: ./frontend
        run: npm run test:run
      
      - name: Build
        working-directory: ./frontend
        run: npm run build
```

---

## Gestión de Secretos

Los secretos son información sensible que no debe estar en el código.

### Configurar Secretos en GitHub

1. Ve a Settings > Secrets and variables > Actions
2. Click en "New repository secret"
3. Agrega nombre y valor
4. Usa en workflows con `${{ secrets.SECRET_NAME }}`

### Usar Secretos en Workflows

```yaml
jobs:
  deploy:
    steps:
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl -X POST \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Mejores Prácticas de Secretos

**✅ Hacer:**
- Usar secretos para información sensible
- Rotar secretos regularmente
- Usar diferentes secretos por entorno
- Limitar acceso a secretos

**❌ No hacer:**
- Hardcodear secretos en código
- Commitear archivos `.env` con secretos
- Compartir secretos en logs
- Usar el mismo secreto en múltiples proyectos

---

## Deploy Hooks y Webhooks

### Deploy Hooks de Render

Render proporciona deploy hooks que puedes llamar para desplegar:

```yaml
jobs:
  deploy:
    steps:
      - name: Trigger Render deployment
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

**Configuración:**
1. En Render, ve a tu servicio
2. Settings > Deploy Hooks
3. Crea un nuevo hook
4. Copia la URL al secreto de GitHub

### Webhooks Personalizados

Para plataformas sin deploy hooks:

```yaml
jobs:
  deploy:
    steps:
      - name: Deploy via webhook
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.WEBHOOK_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}' \
            ${{ secrets.DEPLOY_WEBHOOK_URL }}
```

---

## Ejecución Local de Workflows

### Act: Ejecutar GitHub Actions Localmente

`act` permite ejecutar workflows de GitHub Actions localmente usando Docker.

**Instalación:**
```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (con Chocolatey)
choco install act-cli
```

**Uso básico:**
```bash
# Listar workflows
act -l

# Ejecutar workflow específico
act -W .github/workflows/ci.yml

# Ejecutar job específico
act -j test

# Con secretos
act --secret-file .secrets
```

**Limitaciones:**
- No todos los actions funcionan localmente
- Requiere Docker
- Puede ser más lento que GitHub

**Ventajas:**
- Debugging local
- Testing de workflows antes de push
- Desarrollo más rápido

### Ejemplo de Uso

```bash
# Crear archivo de secretos
echo "RENDER_DEPLOY_HOOK=https://api.render.com/deploy/..." > .secrets

# Ejecutar workflow
act push -W .github/workflows/deploy.yml --secret-file .secrets
```

---

## Alternativas a GitHub Actions

### GitLab CI/CD

**Ventajas:**
- Más minutos gratuitos
- Mejor para proyectos self-hosted
- CI/CD más avanzado

**Desventajas:**
- Menos integrado con GitHub
- Curva de aprendizaje

**Ejemplo:**
```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

test:
  stage: test
  script:
    - pip install -r requirements.txt
    - pytest

deploy:
  stage: deploy
  script:
    - curl -X POST $RENDER_DEPLOY_HOOK
  only:
    - main
```

### CircleCI

**Ventajas:**
- Interfaz excelente
- Paralelización avanzada
- Buen soporte

**Desventajas:**
- Plan gratuito limitado
- Más complejo para proyectos simples

### Jenkins

**Ventajas:**
- Control total
- Self-hosted
- Muy flexible

**Desventajas:**
- Requiere servidor propio
- Configuración más compleja
- Mantenimiento necesario

### Comparación Rápida

| Plataforma | Gratis | Self-Hosted | Facilidad | Integración GitHub |
|------------|--------|-------------|-----------|-------------------|
| GitHub Actions | ✅ | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| GitLab CI | ✅ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| CircleCI | ⚠️ | ❌ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Jenkins | ✅ | ✅ | ⭐⭐ | ⭐⭐ |

---

## Optimización de Pipelines

### Caching de Dependencias

```yaml
jobs:
  test:
    steps:
      - uses: actions/checkout@v3
      
      - name: Cache pip packages
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
      
      - name: Install dependencies
        run: pip install -r requirements.txt
```

### Paralelización de Jobs

```yaml
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: pytest tests/unit/
  
  test-integration:
    runs-on: ubuntu-latest
    steps:
      - run: pytest tests/integration/
  
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: ruff check .
  
  # Todos se ejecutan en paralelo
```

### Matrices para Múltiples Versiones

```yaml
jobs:
  test:
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
```

---

## Testing en CI/CD

### Tests Unitarios

```yaml
- name: Run unit tests
  run: |
    uv run pytest tests/unit/ -v --cov=app --cov-report=xml
```

### Tests de Integración

```yaml
- name: Start services
  run: docker-compose up -d
  
- name: Wait for services
  run: |
    timeout 30 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done'
  
- name: Run integration tests
  run: uv run pytest tests/integration/ -v
```

### Coverage Reports

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
    flags: unittests
    name: codecov-umbrella
```

---

## Despliegue Automatizado

### Estrategia: Desplegar Solo en Main

```yaml
deploy:
  needs: test
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy
      run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Blue-Green Deployment

```yaml
deploy:
  steps:
    - name: Deploy to staging
      run: ./deploy.sh staging
    
    - name: Run smoke tests
      run: ./smoke-tests.sh staging
    
    - name: Deploy to production
      if: success()
      run: ./deploy.sh production
```

### Rollback Automático

```yaml
deploy:
  steps:
    - name: Deploy
      id: deploy
      run: ./deploy.sh
    
    - name: Health check
      run: |
        timeout 60 bash -c 'until curl -f https://api.example.com/health; do sleep 5; done'
    
    - name: Rollback on failure
      if: failure()
      run: ./rollback.sh
```

---

## Troubleshooting

### Tests Pasan Localmente pero Fallan en CI

**Causas comunes:**
- Versiones diferentes de dependencias
- Variables de entorno faltantes
- Diferencias de timing
- Recursos limitados en CI

**Soluciones:**
```yaml
- name: Set up Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.13'  # Especificar versión exacta

- name: Install exact versions
  run: |
    pip install -r requirements.txt
    pip freeze > requirements.lock  # Versionar dependencias
```

### Deploy Hook No Funciona

**Verificaciones:**
1. ¿El secreto está configurado correctamente?
2. ¿La URL del hook es correcta?
3. ¿El servicio está activo en Render?
4. ¿Hay logs de error en Render?

**Debug:**
```yaml
- name: Test deploy hook
  run: |
    echo "Testing deploy hook..."
    curl -v -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Workflows Lentos

**Optimizaciones:**
- Usar caching
- Paralelizar jobs
- Usar matrices solo cuando necesario
- Optimizar Docker builds

---

## Mejores Prácticas

### 1. Estructura de Workflows

```yaml
# Naming: descriptivo y claro
name: Backend Tests and Deploy

# Triggers: específicos
on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'

# Jobs: separados por responsabilidad
jobs:
  test:
    # ...
  lint:
    # ...
  deploy:
    needs: [test, lint]
```

### 2. Reutilización de Workflows

```yaml
# .github/workflows/test.yml
name: Test

on:
  workflow_call:
    inputs:
      python-version:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ inputs.python-version }}
```

**Usar en otro workflow:**
```yaml
jobs:
  test:
    uses: ./.github/workflows/test.yml
    with:
      python-version: '3.13'
```

### 3. Documentación

Documenta workflows complejos:

```yaml
name: Complex Deployment

# Este workflow despliega a producción después de:
# 1. Ejecutar todos los tests
# 2. Validar que no hay vulnerabilidades
# 3. Ejecutar smoke tests en staging
# 4. Desplegar a producción
# 5. Ejecutar smoke tests en producción
```

### 4. Notificaciones

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment failed!'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Workflow Completo de Ejemplo

```yaml
name: Full CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - run: pip install ruff
      - run: ruff check .

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      - uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
      - run: pip install -r requirements.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

  deploy:
    needs: [build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## Conclusión

GitHub Actions ha democratizado el CI/CD, haciendo que la automatización sea accesible para todos los proyectos en GitHub. Con workflows bien estructurados, puedes automatizar tests, builds y despliegues, mejorando significativamente la calidad y velocidad de desarrollo.

**Takeaways principales:**

1. **GitHub Actions** integra CI/CD directamente en GitHub
2. **Workflows** se definen en YAML y son versionables
3. **Secretos** gestionan información sensible de forma segura
4. **Act** permite ejecutar workflows localmente
5. **Alternativas** como GitLab CI ofrecen diferentes ventajas
6. **Optimización** mejora velocidad y costo de pipelines

La automatización completa de tests y despliegues no es un lujo, es una necesidad en el desarrollo moderno. GitHub Actions hace que sea fácil comenzar y escalar según tus necesidades.

---

## Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Documentación oficial
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions) - Acciones pre-construidas
- [Act - Local GitHub Actions](https://github.com/nektos/act) - Ejecutar workflows localmente
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/) - Alternativa a GitHub Actions
- [CircleCI Documentation](https://circleci.com/docs/) - Otra alternativa
- [Jenkins Documentation](https://www.jenkins.io/doc/) - CI/CD self-hosted
- [CI/CD Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices) - Mejores prácticas



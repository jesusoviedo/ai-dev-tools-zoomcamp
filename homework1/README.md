<!-- Language Navigation -->
<div align="center">

[🇪🇸 **Español**](#introducción-al-desarrollo-asistido-por-ia) | [🇺🇸 **English**](#introduction-to-ai-assisted-development)

</div>

---

## Introducción al Desarrollo Asistido por IA

### 📋 Enunciado de la Tarea

**Enlace al enunciado oficial:** [Homework 1 - AI Dev Tools Zoomcamp 2025](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2025/01-overview/homework.md)

#### Resumen del Enunciado

Esta tarea cubre los fundamentos del desarrollo asistido por IA creando una aplicación TODO con Django, incluyendo:
- Instalación de Django y configuración del entorno
- Creación de Proyecto y Aplicación Django
- Definición de Modelos y Migraciones
- Implementación de Lógica y Vistas
- Creación de Templates
- Pruebas (Tests) asistidas por IA

#### ✨ Características Avanzadas Implementadas
- **Panel de Control (Dashboard):** Estadísticas y gráficos en tiempo real
- **Internacionalización (i18n):** Soporte completo para Inglés y Español
- **Gestión de Tareas:** Estados personalizados, dependencias y asignación de usuarios
- **Auditoría Automática:** Registro de cambios mediante Django Signals
- **Papelera (Soft Delete):** Eliminación lógica con posibilidad de recuperación
- **Sistema de Notificaciones:** Notificaciones automáticas cuando te asignan tareas o se completan dependencias
- **Comentarios y Adjuntos:** Sistema completo de comentarios con archivos adjuntos
- **Gestión de Usuarios:** Panel admin para crear y gestionar usuarios (solo superusuarios)
- **Módulo de Reportes:** Filtros avanzados y exportación a CSV
- **Autenticación Completa:** Sistema de login/logout con templates modernos

### 🚀 Cómo ejecutar esta tarea

#### Prerrequisitos
- Python 3.13+
- [uv](https://github.com/astral-sh/uv) instalado

#### Pasos para ejecutar

1. **Configurar el entorno virtual y dependencias:**
   ```bash
   uv venv && uv sync
   ```

2. **Activar el entorno virtual:**
   ```bash
   source .venv/bin/activate
   ```

3. **Ejecutar las migraciones:**
   ```bash
   python manage.py migrate
   ```

4. **Crear usuario administrador:**
   ```bash
   python manage.py create_default_admin --username=admin --email=admin@example.com --password=TuPasswordSeguro123
   ```

5. **Ejecutar el servidor de desarrollo:**
   ```bash
   python manage.py runserver
   ```

6. **Acceder a la aplicación:**
   - Abrir navegador en: http://127.0.0.1:8000/
   - Login con las credenciales que creaste en el paso 4

7. **Ejecutar los tests:**
   ```bash
   python manage.py test todo_app
   ```

### 📁 Estructura de archivos

```
homework1/
├── manage.py                  # Script de gestión de Django
├── todo_project/              # Configuración del proyecto
│   ├── settings.py           # Configuración (DB, i18n, auth)
│   ├── urls.py               # URLs principales
│   └── wsgi.py               # Entry point para WSGI
├── todo_app/                  # Aplicación TODO
│   ├── admin.py              # Configuración del admin
│   ├── apps.py               # Configuración de la app
│   ├── context_processors.py # Procesadores de contexto (Notificaciones)
│   ├── forms.py              # Formularios (Todo, Comment, User)
│   ├── middleware.py         # Middleware (PasswordChange, ThreadLocal)
│   ├── models.py             # Modelos (Todo, AuditLog, Comment, Notification)
│   ├── signals.py            # Signals (Audit logs, Notificaciones)
│   ├── tests.py              # 70 tests unitarios
│   ├── urls.py               # URLs de la aplicación
│   ├── views.py              # Vistas (Dashboard, CRUD, Reportes)
│   ├── management/           # Comandos de gestión
│   │   └── commands/         # create_default_admin
│   ├── migrations/           # Migraciones de base de datos
│   └── templates/            # Templates HTML
│       └── todo_app/         # Templates específicos de la app
├── locale/                    # Traducciones (es/en)
├── attachments/               # Archivos adjuntos (media)
├── db.sqlite3                 # Base de datos SQLite
├── pyproject.toml            # Dependencias del proyecto
├── uv.lock                   # Lockfile de dependencias
├── .python-version           # Versión de Python requerida
├── GUIA_DJANGO.md            # Guía completa (español/inglés)
└── README.md                 # Este archivo
```

### 📝 Notas importantes

- La aplicación es un gestor de tareas enterprise completo
- **70 tests unitarios** verifican todas las funcionalidades
- Sistema de autenticación completo (debes crear usuario admin primero)
- Interfaz moderna con Bootstrap 5
- Todas las dependencias están en `pyproject.toml`

### 🔗 Enlaces relacionados

- [Curso completo - AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
- [Semana 1 - Introducción](./../week1/)
- [📖 Guía para Principiantes (Paso a Paso)](./GUIA_DJANGO.md)

---

## Introduction to AI-Assisted Development

### 📋 Assignment Statement

**Official assignment link:** [Homework 1 - AI Dev Tools Zoomcamp 2025](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2025/01-overview/homework.md)

#### Assignment Summary

This assignment covers the fundamentals of AI-assisted development by creating a TODO app with Django, including:
- Django installation and environment setup
- Creating a Django Project and App
- Defining Models and Migrations
- Implementing Logic and Views
- Creating Templates
- AI-assisted Testing

#### ✨ Implemented Advanced Features
- **Dashboard:** Real-time statistics and charts
- **Internationalization (i18n):** Full support for English and Spanish
- **Task Management:** Custom statuses, dependencies, and user assignment
- **Automated Audit Logging:** Change tracking via Django Signals
- **Soft Delete:** Logical deletion with recovery capability
- **Notification System:** Automatic notifications when tasks are assigned or dependencies completed
- **Comments & Attachments:** Complete comment system with file attachments
- **User Management:** Admin panel to create and manage users (superusers only)
- **Reports Module:** Advanced filters and CSV export
- **Complete Authentication:** Login/logout system with modern templates

### 🚀 How to run this assignment

#### Prerequisites
- Python 3.13+
- [uv](https://github.com/astral-sh/uv) installed

#### Execution steps

1. **Set up virtual environment and dependencies:**
   ```bash
   uv venv && uv sync
   ```

2. **Activate virtual environment:**
   ```bash
   source .venv/bin/activate
   ```

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Create admin user:**
   ```bash
   python manage.py create_default_admin --username=admin --email=admin@example.com --password=YourSecurePassword123
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

6. **Access the application:**
   - Open browser at: http://127.0.0.1:8000/
   - Login with credentials created in step 4

7. **Run tests:**
   ```bash
   python manage.py test todo_app
   ```

### 📁 File structure

```
homework1/
├── manage.py                  # Django management script
├── todo_project/              # Project configuration
│   ├── settings.py           # Configuration (DB, i18n, auth)
│   ├── urls.py               # Main URLs
│   └── wsgi.py               # WSGI entry point
├── todo_app/                  # TODO application
│   ├── admin.py              # Admin configuration
│   ├── apps.py               # App configuration
│   ├── context_processors.py # Context processors (Notifications)
│   ├── forms.py              # Forms (Todo, Comment, User)
│   ├── middleware.py         # Middleware (PasswordChange, ThreadLocal)
│   ├── models.py             # Models (Todo, AuditLog, Comment, Notification)
│   ├── signals.py            # Signals (Audit logs, Notifications)
│   ├── tests.py              # 70 unit tests
│   ├── urls.py               # App URLs
│   ├── views.py              # Views (Dashboard, CRUD, Reports)
│   ├── management/           # Management commands
│   │   └── commands/         # create_default_admin
│   ├── migrations/           # Database migrations
│   └── templates/            # HTML templates
│       └── todo_app/         # App-specific templates
├── locale/                    # Translations (es/en)
├── attachments/               # Attachments (media)
├── db.sqlite3                 # SQLite database
├── pyproject.toml            # Project dependencies
├── uv.lock                   # Dependency lockfile
├── .python-version           # Required Python version
├── GUIA_DJANGO.md            # Complete guide (Spanish/English)
└── README.md                 # This file
```

### 📝 Important notes

- The application is a complete enterprise task manager
- **70 unit tests** verify all functionalities
- Complete authentication system (must create admin user first)
- Modern interface with Bootstrap 5
- All dependencies are in `pyproject.toml`

### 🔗 Related links

- [Complete course - AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
- [Week 1 - Introduction](./../week1/)
- [📖 Beginner's Guide (Step-by-Step)](./GUIA_DJANGO.md)

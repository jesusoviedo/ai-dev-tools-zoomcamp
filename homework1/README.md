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

3. **Ejecutar las migraciones (si es necesario):**
   ```bash
   python manage.py migrate
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   python manage.py runserver
   ```

5. **Ejecutar los tests:**
   ```bash
   python manage.py test
   ```

### 📁 Estructura de archivos

```
homework1/
├── manage.py           # Script de gestión de Django
├── todo_project/       # Configuración del proyecto
├── todo_app/           # Aplicación TODO
├── pyproject.toml      # Dependencias del proyecto
├── .python-version     # Versión de Python requerida
└── README.md           # Este archivo
```

### 📝 Notas importantes

- La aplicación es un gestor de tareas (TODO list) básico.
- Todas las dependencias están definidas en `pyproject.toml`.
- Esta tarea corresponde a la Semana 1 del curso.
- Asegúrate de seguir los pasos de migración antes de iniciar el servidor.

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

3. **Run migrations (if necessary):**
   ```bash
   python manage.py migrate
   ```

4. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

5. **Run tests:**
   ```bash
   python manage.py test
   ```

### 📁 File structure

```
homework1/
├── manage.py           # Django management script
├── todo_project/       # Project configuration
├── todo_app/           # TODO application
├── pyproject.toml      # Project dependencies
├── .python-version     # Required Python version
└── README.md           # This file
```

### 📝 Important notes

- The application is a basic TODO list manager.
- All dependencies are defined in `pyproject.toml`.
- This assignment corresponds to Week 1 of the course.
- Make sure to follow the migration steps before starting the server.

### 🔗 Related links

- [Complete course - AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp)
- [Week 1 - Introduction](./../week1/)
- [📖 Beginner's Guide (Step-by-Step)](./GUIA_DJANGO.md)

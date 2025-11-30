<!-- Language Navigation -->
<div align="center">

[🇪🇸 **Español**](#guía-profesional-de-desarrollo-con-django) | [🇺🇸 **English**](#professional-django-development-guide)

</div>

---

# Guía Profesional de Desarrollo con Django

Esta guía técnica detalla la arquitectura y los patrones de diseño implementados en la aplicación **TODO App**. Está dirigida a desarrolladores que deseen comprender no solo el *cómo*, sino el *porqué* de las decisiones arquitectónicas en un proyecto Django de nivel empresarial.

## 0. Fundamentos y Configuración Inicial

Antes de profundizar en la arquitectura, repasemos cómo levantar el proyecto desde cero.

### 0.1 Preparación del Entorno
Usamos `uv` para una gestión de dependencias rápida y moderna.

```bash
# 1. Inicializar proyecto
uv init
uv add django

# 2. Crear proyecto Django (el punto . es importante para no crear subcarpetas extra)
uv run django-admin startproject todo_project .

# 3. Crear la aplicación (donde vivirá nuestra lógica)
uv run python manage.py startapp todo_app
```

### 0.2 Conexión Proyecto-Aplicación
Es el paso que más olvidan los principiantes: registrar la app.
*   **Archivo:** `todo_project/settings.py`
*   **Variable:** `INSTALLED_APPS`
*   **Acción:** Agregar `'todo_app'` a la lista.

### 0.3 Estructura de Archivos Estándar
Al crear el proyecto y la app, Django genera varios archivos automáticamente. Es vital entender qué hace cada uno:

#### Carpeta del Proyecto (`todo_project/`)
*   **`settings.py`:** El centro de control. Aquí se configura la base de datos, aplicaciones instaladas, idioma, zona horaria y seguridad.
*   **`urls.py`:** La "tabla de contenidos" de tu sitio. Define las rutas globales.
*   **`wsgi.py` / `asgi.py`:** Puntos de entrada para que el servidor web (como Gunicorn o Uvicorn) sirva tu proyecto. WSGI es el estándar clásico, ASGI es para aplicaciones asíncronas.

#### Carpeta de la Aplicación (`todo_app/`)
*   **`models.py`:** Define la estructura de tus datos (tablas de base de datos).
*   **`views.py`:** Contiene la lógica que procesa las peticiones y devuelve respuestas.
*   **`admin.py`:** Aquí registras tus modelos para que aparezcan en el panel de administración automático de Django.
*   **`apps.py`:** Configuración de metadatos de la aplicación (como el nombre legible).
*   **`tests.py`:** Donde escribes tus pruebas unitarias.
*   **`migrations/`:** Carpeta que guarda el historial de cambios de tu base de datos.

#### Raíz
*   **`manage.py`:** Una utilidad de línea de comandos para interactuar con este proyecto Django (correr el servidor, crear migraciones, etc.).

## 1. Arquitectura del Proyecto

Django sigue el patrón **MVT (Model-View-Template)**, una variación del MVC. En este proyecto, hemos estructurado la aplicación para maximizar la escalabilidad y el desacoplamiento.

### 1.1 Ciclo de Vida de una Petición (Request/Response Cycle)
Entender el flujo es crítico para depurar y extender la aplicación:
1.  **Request:** Llega al servidor (WSGI).
2.  **Middleware:** La petición atraviesa capas de seguridad, sesión y localización.
3.  **URL Dispatcher:** `urls.py` decide qué vista maneja la petición.
4.  **View:** La lógica de negocio procesa los datos (Modelos).
5.  **Template/Response:** Se renderiza la respuesta HTML o JSON.

## 2. Componentes Avanzados Implementados

Más allá del CRUD básico, este proyecto implementa patrones avanzados:

### 2.1 Middleware Personalizado (`middleware.py`)
Los middleware son "hooks" que se ejecutan en cada petición/respuesta.

*   **`ThreadLocalUserMiddleware`:**
    *   **Problema:** Los `Signals` (ver 2.3) no tienen acceso al objeto `request`, por lo que no sabemos *quién* realizó una acción en el modelo.
    *   **Solución:** Usamos `threading.local` para almacenar el usuario actual globalmente durante el ciclo de vida del hilo. Esto permite que el modelo `AuditLog` capture el usuario automáticamente sin pasar `request` por todas partes.
    
*   **`PasswordChangeRequiredMiddleware`:**
    *   **Seguridad:** Intercepta cada petición para verificar si el usuario tiene el flag `must_change_password`. Si es así, lo redirige forzosamente al cambio de contraseña, bloqueando el acceso al resto de la app hasta que cumpla el requisito.

### 2.2 Context Processors (`context_processors.py`)
*   **Concepto:** Inyectan datos en el contexto de *todos* los templates automáticamente.
*   **Implementación:** `notifications(request)` consulta las notificaciones no leídas del usuario y las hace disponibles como la variable `{{ notifications }}` en el navbar (`base.html`). Esto evita tener que consultar la DB en cada una de las vistas.

### 2.3 Signals & Desacoplamiento (`signals.py`)
Usamos el patrón Observador de Django para desacoplar la lógica secundaria de la principal.

*   **Audit Logging:** En lugar de ensuciar las Vistas con llamadas a `AuditLog.objects.create()`, usamos señales `post_save` y `post_delete`. Cada vez que un modelo `Todo` se guarda, el signal se dispara y registra el cambio.
*   **Notificaciones:** Cuando una tarea cambia de estado o se asigna, un signal crea la notificación correspondiente. Esto mantiene el método `save()` del modelo limpio y enfocado en la integridad de datos.

### 2.4 Class-Based Views (CBV) y Mixins
Las CBV ofrecen mayor reutilización de código que las Function-Based Views (FBV).

*   **Mixins de Seguridad:**
    *   `LoginRequiredMixin`: Asegura que solo usuarios autenticados accedan.
    *   `SuperUserRequiredMixin` (Personalizado): Hereda de `UserPassesTestMixin` para restringir vistas administrativas (como Reportes y Gestión de Usuarios) solo a superusuarios.
*   **Generic Views:** Usamos `ListView`, `CreateView`, `UpdateView` para estandarizar el comportamiento CRUD y reducir el código repetitivo (boilerplate).

### 2.5 Internacionalización (i18n)
La aplicación es nativamente bilingüe.

*   **`LocaleMiddleware`:** Detecta el idioma preferido del navegador o la sesión del usuario.
*   **`gettext_lazy`:** Usado en `models.py` y `forms.py` para marcar cadenas para traducción. Se usa la versión "lazy" porque estas definiciones se ejecutan al inicio del proceso, antes de saber el idioma del usuario actual.
*   **URLs:** Usamos `i18n_patterns` en `urls.py` para prefijar las rutas con el idioma (ej: `/es/dashboard/`, `/en/dashboard/`).

## 3. Gestión de Datos y Formularios

### 3.1 Modelos y Managers
*   **Soft Delete:** Sobrescribimos el método `delete()` y usamos un `Manager` personalizado (`TodoManager`) para filtrar por defecto los registros marcados como eliminados (`deleted_at`). Esto preserva la integridad referencial y permite auditoría.
*   **Lógica en Modelos:** La lógica de "completado automático" (setear `completed_at` cuando status es `COMPLETED`) reside en el método `save()` del modelo, no en la vista. Esto es el principio de "Fat Models, Thin Views".

### 3.2 Formularios Avanzados (`forms.py`)
*   **Widgets Personalizados:** Configuramos clases de Bootstrap (`form-control`) directamente en los widgets para asegurar un renderizado consistente.
*   **Validación Dinámica:** En `__init__`, filtramos los usuarios asignables (`queryset`) para mostrar solo usuarios activos y excluimos la propia tarea de sus dependencias para evitar referencias circulares.

## 4. Testing y Calidad

Una suite de pruebas robusta es innegociable en desarrollo profesional.

*   **Isolation:** Cada test corre en una transacción aislada que se revierte al finalizar.
*   **Testing i18n:** Es crucial probar que la traducción funciona. Usamos `activate('es')` en `setUp` para simular un entorno en español y verificar que las claves de traducción se resuelven correctamente.
*   **Integration Tests:** Probamos flujos completos (Ciclo de vida: Crear -> Editar -> Comentar -> Borrar) para asegurar que los componentes interactúan correctamente.

## 5. Automatización

### 5.1 Management Commands
*   **`create_default_admin`:** Un comando personalizado para facilitar el despliegue (deployment) y la configuración inicial en entornos de CI/CD, permitiendo crear un superusuario de forma no interactiva.

---

# Professional Django Development Guide

This technical guide details the architecture and design patterns implemented in the **TODO App**. It is aimed at developers who want to understand not just the *how*, but the *why* of architectural decisions in an enterprise-level Django project.

## 0. Fundamentals and Initial Setup

Before diving into architecture, let's review how to bootstrap the project.

### 0.1 Environment Preparation
We use `uv` for fast and modern dependency management.

```bash
# 1. Initialize project
uv init
uv add django

# 2. Create Django project (the dot . is important to avoid extra nesting)
uv run django-admin startproject todo_project .

# 3. Create the application (where our logic lives)
uv run python manage.py startapp todo_app
```

### 0.2 Project-App Connection
The step beginners forget most often: registering the app.
*   **File:** `todo_project/settings.py`
*   **Variable:** `INSTALLED_APPS`
*   **Action:** Add `'todo_app'` to the list.

### 0.3 Standard File Structure
When creating the project and app, Django generates several files automatically. It is vital to understand what each one does:

#### Project Folder (`todo_project/`)
*   **`settings.py`:** The control center. Here you configure the database, installed apps, language, time zone, and security.
*   **`urls.py`:** The "table of contents" of your site. Defines global routes.
*   **`wsgi.py` / `asgi.py`:** Entry points for the web server (like Gunicorn or Uvicorn) to serve your project. WSGI is the classic standard, ASGI is for asynchronous applications.

#### Application Folder (`todo_app/`)
*   **`models.py`:** Defines your data structure (database tables).
*   **`views.py`:** Contains the logic that processes requests and returns responses.
*   **`admin.py`:** Here you register your models so they appear in Django's automatic admin panel.
*   **`apps.py`:** Application metadata configuration (like the readable name).
*   **`tests.py`:** Where you write your unit tests.
*   **`migrations/`:** Folder that keeps the history of your database changes.

#### Root
*   **`manage.py`:** A command-line utility to interact with this Django project (run server, create migrations, etc.).

## 1. Project Architecture

Django follows the **MVT (Model-View-Template)** pattern. In this project, we have structured the application to maximize scalability and decoupling.

### 1.1 Request/Response Cycle
Understanding the flow is critical for debugging and extending the application:
1.  **Request:** Arrives at the server (WSGI).
2.  **Middleware:** The request passes through security, session, and localization layers.
3.  **URL Dispatcher:** `urls.py` decides which view handles the request.
4.  **View:** Business logic processes data (Models).
5.  **Template/Response:** HTML or JSON response is rendered.

## 2. Advanced Components Implemented

Beyond basic CRUD, this project implements advanced patterns:

### 2.1 Custom Middleware (`middleware.py`)
Middleware are hooks that run on every request/response.

*   **`ThreadLocalUserMiddleware`:**
    *   **Problem:** `Signals` (see 2.3) do not have access to the `request` object, so we don't know *who* performed an action on the model.
    *   **Solution:** We use `threading.local` to store the current user globally during the thread lifecycle. This allows the `AuditLog` model to capture the user automatically without passing `request` everywhere.
    
*   **`PasswordChangeRequiredMiddleware`:**
    *   **Security:** Intercepts every request to verify if the user has the `must_change_password` flag. If so, it forcibly redirects them to the password change page, blocking access to the rest of the app until the requirement is met.

### 2.2 Context Processors (`context_processors.py`)
*   **Concept:** Inject data into the context of *all* templates automatically.
*   **Implementation:** `notifications(request)` queries the user's unread notifications and makes them available as the `{{ notifications }}` variable in the navbar (`base.html`). This avoids having to query the DB in every single view.

### 2.3 Signals & Decoupling (`signals.py`)
We use Django's Observer pattern to decouple secondary logic from primary logic.

*   **Audit Logging:** Instead of cluttering Views with `AuditLog.objects.create()` calls, we use `post_save` and `post_delete` signals. Whenever a `Todo` model is saved, the signal fires and logs the change.
*   **Notifications:** When a task changes status or is assigned, a signal creates the corresponding notification. This keeps the model's `save()` method clean and focused on data integrity.

### 2.4 Class-Based Views (CBV) and Mixins
CBVs offer greater code reuse than Function-Based Views (FBV).

*   **Security Mixins:**
    *   `LoginRequiredMixin`: Ensures only authenticated users access the view.
    *   `SuperUserRequiredMixin` (Custom): Inherits from `UserPassesTestMixin` to restrict administrative views (like Reports and User Management) to superusers only.
*   **Generic Views:** We use `ListView`, `CreateView`, `UpdateView` to standardize CRUD behavior and reduce boilerplate code.

### 2.5 Internationalization (i18n)
The application is natively bilingual.

*   **`LocaleMiddleware`:** Detects the preferred language from the browser or user session.
*   **`gettext_lazy`:** Used in `models.py` and `forms.py` to mark strings for translation. The "lazy" version is used because these definitions run at startup, before the current user's language is known.
*   **URLs:** We use `i18n_patterns` in `urls.py` to prefix routes with the language (e.g., `/es/dashboard/`, `/en/dashboard/`).

## 3. Data Management and Forms

### 3.1 Models and Managers
*   **Soft Delete:** We override the `delete()` method and use a custom `Manager` (`TodoManager`) to filter out records marked as deleted (`deleted_at`) by default. This preserves referential integrity and allows auditing.
*   **Logic in Models:** The "auto-complete" logic (setting `completed_at` when status is `COMPLETED`) resides in the model's `save()` method, not the view. This follows the "Fat Models, Thin Views" principle.

### 3.2 Advanced Forms (`forms.py`)
*   **Custom Widgets:** We configure Bootstrap classes (`form-control`) directly in widgets to ensure consistent rendering.
*   **Dynamic Validation:** In `__init__`, we filter the assignable users (`queryset`) to show only active users and exclude the task itself from its dependencies to avoid circular references.

## 4. Testing and Quality

A robust test suite is non-negotiable in professional development.

*   **Isolation:** Each test runs in an isolated transaction that is rolled back upon completion.
*   **i18n Testing:** It is crucial to test that translation works. We use `activate('es')` in `setUp` to simulate a Spanish environment and verify that translation keys resolve correctly.
*   **Integration Tests:** We test complete flows (Lifecycle: Create -> Edit -> Comment -> Delete) to ensure components interact correctly.

## 5. Automation

### 5.1 Management Commands
*   **`create_default_admin`:** A custom command to facilitate deployment and initial configuration in CI/CD environments, allowing non-interactive superuser creation.

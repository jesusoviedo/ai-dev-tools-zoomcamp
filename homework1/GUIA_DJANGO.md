<!-- Language Navigation -->
<div align="center">

[🇪🇸 **Español**](#guía-completa-de-django-para-principiantes) | [🇺🇸 **English**](#comprehensive-django-guide-for-beginners)

</div>

---

# Guía Completa de Django para Principiantes

Esta guía está diseñada para personas sin conocimientos previos de Django. Te llevará paso a paso a través del proceso de creación de una aplicación web, utilizando como ejemplo la **App de Tareas (TODO)** que hemos creado.

## 1. Conceptos Básicos

Antes de empezar, es importante entender dos conceptos clave en Django:

*   **Proyecto (Project):** Es el contenedor global de tu sitio web. Contiene la configuración (base de datos, idioma, seguridad) que aplica a todo el sitio.
*   **Aplicación (App):** Es un módulo que hace algo específico (ej: un blog, un foro, una lista de tareas). Un proyecto puede tener muchas aplicaciones.

## 2. Configuración del Entorno

Usamos `uv` como gestor de paquetes moderno para Python.

### Pasos Iniciales:
1.  **Inicializar el entorno:**
    ```bash
    uv init
    ```
2.  **Instalar Django:**
    ```bash
    uv add django
    ```

## 3. Creando la Estructura

### Paso 3.1: Crear el Proyecto
El comando para crear la configuración global. El punto `.` al final indica que se cree en la carpeta actual.
```bash
uv run django-admin startproject todo_project .
```

### Paso 3.2: Crear la Aplicación
Creamos nuestra funcionalidad específica (la lista de tareas).
```bash
uv run python manage.py startapp todo_app
```

### Paso 3.3: Conectar la App al Proyecto (¡CRÍTICO!)
Django no sabe que tu nueva app existe hasta que la registras.
*   **Archivo:** `todo_project/settings.py`
*   **Acción:** Buscar `INSTALLED_APPS` y agregar `'todo_app'`.

```python
INSTALLED_APPS = [
    ...
    'django.contrib.staticfiles',
    'todo_app', # <--- Agregado aquí
]
```

## 4. Definición de Datos (Modelos)

Los **Modelos** definen la estructura de tu base de datos usando clases de Python.

*   **Archivo:** `todo_app/models.py`
*   **Ejemplo:**
    ```python
    class Todo(models.Model):
        title = models.CharField(max_length=200) # Texto corto
        is_resolved = models.BooleanField(default=False) # Verdadero/Falso
    ```

### Aplicando los cambios (Migraciones)
Cada vez que modificas `models.py`, debes ejecutar estos dos comandos para actualizar la base de datos real:

1.  **Crear la migración (el plano de los cambios):**
    ```bash
    python manage.py makemigrations
    ```
2.  **Migrar (construir los cambios):**
    ```bash
    python manage.py migrate
    ```

## 5. Creando la Lógica (Vistas)

Las **Vistas** deciden qué mostrar al usuario. Usamos "Vistas Basadas en Clases" (CBV) que facilitan tareas comunes como Crear, Leer, Actualizar y Borrar (CRUD).

*   **Archivo:** `todo_app/views.py`
*   **Concepto:**
    *   `ListView`: Para mostrar una lista de objetos.
    *   `CreateView`: Para mostrar un formulario de creación.
    *   `UpdateView`: Para editar.
    *   `DeleteView`: Para borrar.

## 6. Configurando las Rutas (URLs)

Las URLs le dicen a Django qué vista ejecutar cuando un usuario visita una dirección.

1.  **URLs de la App (`todo_app/urls.py`):** Define las rutas internas (ej: `/new`, `/edit`).
2.  **URLs del Proyecto (`todo_project/urls.py`):** Conecta las rutas de la app al sitio principal usando `include()`.

## 7. La Interfaz (Templates)

Los **Templates** son archivos HTML que muestran los datos al usuario.

*   **Ubicación:** `todo_app/templates/todo_app/`
*   **Herencia:** Usamos un `base.html` que contiene la estructura común (cabecera, pie de página, estilos CSS) y los otros templates "heredan" de él usando `{% extends 'todo_app/base.html' %}`.

## 8. Pruebas Unitarias (Testing)

Las pruebas aseguran que tu código funcione y no se rompa en el futuro.

*   **Archivo:** `todo_app/tests.py`
*   **Qué probar:**
    *   **Modelos:** ¿Se guardan bien los datos? ¿Funcionan las restricciones?
    *   **Vistas:** ¿La página carga (código 200)? ¿Muestra el contenido correcto? ¿Los formularios funcionan?
    *   **Casos Borde:** ¿Qué pasa si envío un título vacío? (Debería fallar).

### Ejecutar las pruebas
El comando mágico para correr todas tus pruebas:
```bash
python manage.py test
```

### 🧪 Pruebas e Internacionalización (i18n)
Dado que nuestra app soporta múltiples idiomas, las pruebas deben tener esto en cuenta:
*   **Pruebas de Lógica:** Se ejecutan en inglés por defecto (usando `activate('en')` en `setUp`) para asegurar consistencia.
*   **Pruebas de Traducción:** Hemos creado una clase específica `TodoViewTestSpanish` que activa el español (`activate('es')`) para verificar que los textos se traduzcan correctamente en la interfaz.

## 9. Ejecutar la Aplicación

Finalmente, para ver tu obra maestra en el navegador:

```bash
python manage.py runserver
```
Visita `http://127.0.0.1:8000/` en tu navegador.

## 10. Características Avanzadas

Hemos mejorado la aplicación con funcionalidades potentes:

1.  **Estados de Tarea:** Ahora las tareas pueden estar en estado Pendiente, Activa, Pausada, Bloqueada o Completada.
2.  **Dependencias:** Puedes marcar que una tarea "bloquea" a otra. No podrás completar una tarea si sus dependencias no están listas.
3.  **Auditoría (Audit Logs):** Cada vez que creas, editas o eliminas algo, el sistema guarda un registro de quién lo hizo y cuándo.
4.  **Papelera de Reciclaje (Soft Delete):** Cuando eliminas una tarea, no se borra de verdad. Se marca como "eliminada" para que pueda ser recuperada si fue un error.
5.  **Idiomas (i18n):** ¡La app habla español e inglés! Puedes cambiar el idioma en la barra superior.
6.  **Reportes:** Un panel de control (Dashboard) con gráficos y estadísticas en tiempo real.
7.  **Asignación de Usuarios:** Puedes asignar tareas a usuarios específicos.

---
**¡Felicidades!** Ahora tienes las bases para construir cualquier aplicación web con Django.

---

# Comprehensive Django Guide for Beginners

This guide is designed for people with no prior knowledge of Django. It will take you step-by-step through the process of creating a web application, using the **TODO App** we created as an example.

## 1. Basic Concepts

Before starting, it is important to understand two key concepts in Django:

*   **Project:** It is the global container for your website. It contains the configuration (database, language, security) that applies to the entire site.
*   **Application (App):** It is a module that does something specific (e.g., a blog, a forum, a todo list). A project can have many applications.

## 2. Environment Setup

We use `uv` as a modern package manager for Python.

### Initial Steps:
1.  **Initialize the environment:**
    ```bash
    uv init
    ```
2.  **Install Django:**
    ```bash
    uv add django
    ```

## 3. Creating the Structure

### Step 3.1: Create the Project
The command to create the global configuration. The `.` at the end indicates that it should be created in the current folder.
```bash
uv run django-admin startproject todo_project .
```

### Step 3.2: Create the Application
We create our specific functionality (the todo list).
```bash
uv run python manage.py startapp todo_app
```

### Step 3.3: Connect the App to the Project (CRITICAL!)
Django doesn't know your new app exists until you register it.
*   **File:** `todo_project/settings.py`
*   **Action:** Find `INSTALLED_APPS` and add `'todo_app'`.

```python
INSTALLED_APPS = [
    ...
    'django.contrib.staticfiles',
    'todo_app', # <--- Added here
]
```

## 4. Data Definition (Models)

**Models** define the structure of your database using Python classes.

*   **File:** `todo_app/models.py`
*   **Example:**
    ```python
    class Todo(models.Model):
        title = models.CharField(max_length=200) # Short text
        is_resolved = models.BooleanField(default=False) # True/False
    ```

### Applying changes (Migrations)
Every time you modify `models.py`, you must run these two commands to update the real database:

1.  **Create the migration (the blueprint of changes):**
    ```bash
    python manage.py makemigrations
    ```
2.  **Migrate (build the changes):**
    ```bash
    python manage.py migrate
    ```

## 5. Creating Logic (Views)

**Views** decide what to show the user. We use "Class-Based Views" (CBV) which facilitate common tasks like Create, Read, Update, and Delete (CRUD).

*   **File:** `todo_app/views.py`
*   **Concept:**
    *   `ListView`: To show a list of objects.
    *   `CreateView`: To show a creation form.
    *   `UpdateView`: To edit.
    *   `DeleteView`: To delete.

## 6. Configuring Routes (URLs)

URLs tell Django which view to execute when a user visits an address.

1.  **App URLs (`todo_app/urls.py`):** Defines internal routes (e.g., `/new`, `/edit`).
2.  **Project URLs (`todo_project/urls.py`):** Connects the app routes to the main site using `include()`.

## 7. The Interface (Templates)

**Templates** are HTML files that display data to the user.

*   **Location:** `todo_app/templates/todo_app/`
*   **Inheritance:** We use a `base.html` that contains the common structure (header, footer, CSS styles) and other templates "inherit" from it using `{% extends 'todo_app/base.html' %}`.

## 8. Unit Testing

Tests ensure your code works and doesn't break in the future.

*   **File:** `todo_app/tests.py`
*   **What to test:**
    *   **Models:** Is data saved correctly? do constraints work?
    *   **Views:** Does the page load (code 200)? Does it show correct content? Do forms work?
    *   **Edge Cases:** What happens if I send an empty title? (It should fail).

### Running tests
The magic command to run all your tests:
```bash
python manage.py test
```

### 🧪 Testing and Internationalization (i18n)
Since our app supports multiple languages, tests must account for this:
*   **Logic Tests:** Run in English by default (using `activate('en')` in `setUp`) to ensure consistency.
*   **Translation Tests:** We created a specific class `TodoViewTestSpanish` that activates Spanish (`activate('es')`) to verify that texts are correctly translated in the interface.

## 9. Running the Application

Finally, to see your masterpiece in the browser:

```bash
python manage.py runserver
```
Visit `http://127.0.0.1:8000/` in your browser.

## 10. Características Enterprise Implementadas

Esta aplicación va más allá de un simple gestor de tareas. Incluye características avanzadas típicas de aplicaciones empresariales:

### 10.1 Sistema de Auditoría Automática (Signals)
- **Qué es:** Registro automático de todas las acciones (crear, editar, eliminar)
- **Tecnología:** Django Signals (`post_save`, `post_delete`, `pre_save`)
- **Beneficio:** No necesitas escribir código de logging manualmente en cada vista
- **Archivo:** `todo_app/signals.py`

### 10.2 Comentarios y Archivos Adjuntos
- **Qué es:** Sistema completo para agregar comentarios con archivos a las tareas
- **Funcionalidad:** Cada tarea tiene su sección de comentarios con soporte para adjuntos
- **Archivos:** `todo_app/forms.py` (CommentForm), `templates/todo_app/todo_detail.html`

### 10.3 Sistema de Notificaciones
- **Qué es:** Notificaciones automáticas en tiempo real
- **Casos de uso:**
  - Te asignan una tarea nueva
  - Se completa una dependencia de tus tareas
- **Interfaz:** Badge con contador + dropdown en navbar
- **Archivo:** `todo_app/context_processors.py`

### 10.4 Gestión de Usuarios (Admin Panel)
- **Qué es:** Panel completo para gestionar usuarios
- **Funcionalidad:**
  - Listar todos los usuarios
  - Crear nuevos usuarios
  - Editar permisos (admin, staff, activo/inactivo)
- **Acceso:** Solo superusuarios
- **Archivos:** `todo_app/views.py` (UserListView, UserCreateView, UserUpdateView)

### 10.5 Módulo de Reportes
- **Qué es:** Sistema de filtros y exportación de datos
- **Funcionalidad:**
  - Filtrar tareas por estado y usuario
  - Ver tabla responsive
  - Exportar a CSV con un click
- **Acceso:** Solo superusuarios
- **Archivo:** `todo_app/views.py` (ReportView)

### 10.6 Sistema de Autenticación
- **Qué es:** Login/logout completo con templates modernos
- **Funcionalidad:**
  - Página de login con diseño profesional
  - Protección de todas las vistas (LoginRequiredMixin)
  - Redirección automática al dashboard
- **Comando especial:**
  ```bash
  python manage.py create_default_admin --username=admin --email=admin@example.com --password=TuPassword123
  ```

### 10.7 Internacionalización (i18n)
- **Qué es:** Soporte completo para múltiples idiomas
- **Idiomas disponibles:** Español e Inglés
- **Interfaz:** Language switcher en la navbar
- **Archivos:** `locale/es/`, `locale/en/`

### 10.8 Soft Delete (Eliminación Suave)
- **Qué es:** Las tareas no se borran físicamente
- **Funcionalidad:** Se marcan con `deleted_at` y pueden recuperarse
- **Beneficio:** Protección contra eliminaciones accidentales

### 10.9 Estados y Dependencias de Tareas
- **Estados:** PENDING, ACTIVE, ON_HOLD, BLOCKED, COMPLETED
- **Dependencias:** Una tarea puede depender de otras
- **Notificaciones:** Se avisa automáticamente cuando se completan dependencias

### 📊 Resumen Técnico
- **29 tests unitarios** verifican todas las funcionalidades
- **4 modelos:** Todo, AuditLog, Comment, Notification
- **10+ vistas:** Dashboard, CRUD de tareas, gestión de usuarios, reportes
- **Signals:** Automatización de audit logs y notificaciones
- **Middleware personalizado:** ThreadLocalUserMiddleware para capturar usuario en signals
- **Context processors:** Notificaciones disponibles globalmente
- **Bootstrap 5:** Interfaz moderna y responsive

---
**¡Felicidades!** Ahora tienes las bases para construir cualquier aplicación web enterprise con Django.


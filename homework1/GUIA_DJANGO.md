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
        # Relación de muchos a muchos para dependencias
        dependencies = models.ManyToManyField('self', symmetrical=False, blank=True)
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
    *   `TemplateView`: Para páginas estáticas o dashboards personalizados.

## 6. Configurando las Rutas (URLs)

Las URLs le dicen a Django qué vista ejecutar cuando un usuario visita una dirección.

1.  **URLs de la App (`todo_app/urls.py`):** Define las rutas internas (ej: `/new`, `/edit`).
2.  **URLs del Proyecto (`todo_project/urls.py`):** Conecta las rutas de la app al sitio principal usando `include()`.

## 7. La Interfaz (Templates)

Los **Templates** son archivos HTML que muestran los datos al usuario.

*   **Ubicación:** `todo_app/templates/todo_app/`
*   **Herencia:** Usamos un `base.html` que contiene la estructura común (cabecera, pie de página, estilos CSS) y los otros templates "heredan" de él usando `{% extends 'todo_app/base.html' %}`.
*   **Estilos:** Puedes usar frameworks CSS como Bootstrap para mejorar la apariencia rápidamente.

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

## 9. Características Avanzadas (Nuevo)

Hemos añadido funcionalidades avanzadas a nuestra aplicación:

*   **Dashboard:** Una vista personalizada que muestra estadísticas y gráficos.
*   **Dependencias:** Las tareas pueden depender de otras tareas (relación ManyToMany).
*   **Estilos Profesionales:** Uso de Bootstrap y CSS personalizado para una interfaz moderna.

## 10. Ejecutar la Aplicación

Finalmente, para ver tu obra maestra en el navegador:

```bash
python manage.py runserver
```
Visita `http://127.0.0.1:8000/` en tu navegador.

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
        # Many-to-many relationship for dependencies
        dependencies = models.ManyToManyField('self', symmetrical=False, blank=True)
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
    *   `TemplateView`: For static pages or custom dashboards.

## 6. Configuring Routes (URLs)

URLs tell Django which view to execute when a user visits an address.

1.  **App URLs (`todo_app/urls.py`):** Defines internal routes (e.g., `/new`, `/edit`).
2.  **Project URLs (`todo_project/urls.py`):** Connects the app routes to the main site using `include()`.

## 7. The Interface (Templates)

**Templates** are HTML files that display data to the user.

*   **Location:** `todo_app/templates/todo_app/`
*   **Inheritance:** We use a `base.html` that contains the common structure (header, footer, CSS styles) and other templates "inherit" from it using `{% extends 'todo_app/base.html' %}`.
*   **Styling:** You can use CSS frameworks like Bootstrap to quickly improve the look and feel.

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

## 9. Advanced Features (New)

We have added advanced features to our application:

*   **Dashboard:** A custom view showing statistics and charts.
*   **Dependencies:** Tasks can depend on other tasks (ManyToMany relationship).
*   **Professional Styling:** Using Bootstrap and custom CSS for a modern interface.

## 10. Running the Application

Finally, to see your masterpiece in the browser:

```bash
python manage.py runserver
```
Visit `http://127.0.0.1:8000/` in your browser.

---
**Congratulations!** You now have the foundation to build any web application with Django.

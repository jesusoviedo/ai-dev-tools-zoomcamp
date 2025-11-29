from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from django.utils.translation import activate
from .models import Todo, AuditLog, Notification
import datetime

class TodoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')

    def test_create_todo_normal(self):
        """Test creating a Todo with valid data."""
        todo = Todo.objects.create(
            title="Buy milk",
            description="Go to the store",
            due_date=timezone.now(),
            created_by=self.user
        )
        self.assertEqual(str(todo), "Buy milk")
        self.assertEqual(todo.status, 'ACTIVE')
        self.assertIsNone(todo.completed_at)

    def test_create_todo_edge_max_length(self):
        """Test creating a Todo with max length title."""
        max_title = "a" * 200
        todo = Todo.objects.create(title=max_title, created_by=self.user)
        self.assertEqual(todo.title, max_title)

    def test_create_todo_empty_description(self):
        """Test creating a Todo with empty description (should be allowed)."""
        todo = Todo.objects.create(title="No description", created_by=self.user)
        self.assertIsNone(todo.description)

    def test_completion_logic(self):
        """Test that completed_at is set when status is COMPLETED."""
        todo = Todo.objects.create(title="Task", created_by=self.user)
        todo.status = 'COMPLETED'
        todo.save()
        self.assertIsNotNone(todo.completed_at)
        
        # Revert status
        todo.status = 'ACTIVE'
        todo.save()
        self.assertIsNone(todo.completed_at)

    def test_soft_delete(self):
        """Test soft delete functionality."""
        todo = Todo.objects.create(title="To Delete", created_by=self.user)
        todo.delete()
        
        # Should not be in default manager
        self.assertFalse(Todo.objects.filter(pk=todo.pk).exists())
        # Should be in all_objects manager
        self.assertTrue(Todo.all_objects.filter(pk=todo.pk).exists())
        self.assertIsNotNone(Todo.all_objects.get(pk=todo.pk).deleted_at)

class TodoViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_login(self.user)
        self.todo = Todo.objects.create(title="Test Task", created_by=self.user)

    def test_list_view_normal(self):
        """Test that list view returns 200 and contains todos."""
        response = self.client.get(reverse('todo-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Task")
        self.assertTemplateUsed(response, 'todo_app/todo_list.html')

    def test_list_view_empty(self):
        """Test list view when no todos exist."""
        Todo.objects.all().delete()
        response = self.client.get(reverse('todo-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No tasks found.")

    def test_create_view_normal(self):
        """Test creating a new todo via POST."""
        initial_count = Todo.objects.count()
        response = self.client.post(reverse('todo-create'), {
            'title': 'New Task',
            'description': 'New Description',
            'status': 'ACTIVE',
            'due_date': timezone.now().date().isoformat()
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Todo.objects.count(), initial_count + 1)

    def test_create_view_audit_log(self):
        """Test that creating a task creates an audit log."""
        initial_logs = AuditLog.objects.count()
        response = self.client.post(reverse('todo-create'), {
            'title': 'New Audited Task',
            'status': 'ACTIVE',
        }, follow=True)
        
        if response.status_code != 200:
            print(response.content)

        self.assertEqual(AuditLog.objects.count(), initial_logs + 1)
        log = AuditLog.objects.last()
        self.assertEqual(log.action, 'CREATE')
        self.assertEqual(log.user, self.user)

    def test_create_view_invalid_empty_title(self):
        """Test creating todo with empty title (should fail)."""
        response = self.client.post(reverse('todo-create'), {
            'title': '',
            'description': 'Should fail'
        })
        self.assertEqual(response.status_code, 200) # Re-renders form
        form = response.context['form']
        self.assertTrue(form.errors)
        self.assertIn('title', form.errors)

    def test_update_view_normal(self):
        """Test updating an existing todo."""
        response = self.client.post(reverse('todo-update', args=[self.todo.pk]), {
            'title': 'Updated Task',
            'description': 'Updated Description',
            'status': 'COMPLETED',
            'due_date': timezone.now().date().isoformat()
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.title, 'Updated Task')
        self.assertEqual(self.todo.status, 'COMPLETED')

    def test_update_view_audit_log(self):
        """Test that updating a task creates an audit log."""
        initial_logs = AuditLog.objects.count()
        response = self.client.post(reverse('todo-update', args=[self.todo.pk]), {
            'title': 'Updated Title',
            'status': 'ACTIVE',
        }, follow=True)
        
        self.assertEqual(AuditLog.objects.count(), initial_logs + 1)
        log = AuditLog.objects.last()
        self.assertEqual(log.action, 'UPDATE')

    def test_update_view_not_found(self):
        """Test updating a non-existent todo."""
        response = self.client.get(reverse('todo-update', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_delete_view_normal(self):
        """Test deleting a todo (soft delete)."""
        response = self.client.post(reverse('todo-delete', args=[self.todo.pk]), follow=True)
        self.assertEqual(response.status_code, 200)
        # Check soft delete
        self.assertFalse(Todo.objects.filter(pk=self.todo.pk).exists())
        self.assertTrue(Todo.all_objects.filter(pk=self.todo.pk).exists())

    def test_delete_view_audit_log(self):
        """Test that deleting via view logs it."""
        initial_logs = AuditLog.objects.count()
        response = self.client.post(reverse('todo-delete', args=[self.todo.pk]), follow=True)
        self.assertEqual(AuditLog.objects.count(), initial_logs + 1)
        log = AuditLog.objects.last()
        self.assertEqual(log.action, 'DELETE')

    def test_delete_view_not_found(self):
        """Test deleting a non-existent todo."""
        response = self.client.post(reverse('todo-delete', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_dashboard_view(self):
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('total_tasks', response.context)

    def test_i18n_spanish(self):
        """Test that Spanish translation works."""
        activate('es')
        response = self.client.get(reverse('todo-list'))
        self.assertContains(response, "Todas las Tareas")

class TodoViewTestSpanish(TestCase):
    def setUp(self):
        activate('es')
        self.user = User.objects.create_user(username='testuser_es', password='password')
        self.client.force_login(self.user)
        self.todo = Todo.objects.create(title="Tarea de Prueba", created_by=self.user)

    def test_list_view_spanish(self):
        """Test that list view returns 200 and contains Spanish text."""
        response = self.client.get(reverse('todo-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Todas las Tareas")
        self.assertContains(response, "Nueva Tarea")

    def test_list_view_empty_spanish(self):
        """Test list view when no todos exist in Spanish."""
        Todo.objects.all().delete()
        response = self.client.get(reverse('todo-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No se encontraron tareas.")

    def test_create_view_spanish(self):
        """Test create view renders in Spanish."""
        response = self.client.get(reverse('todo-create'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Nueva Tarea")
        self.assertContains(response, "Guardar Tarea")

    def test_dashboard_view_spanish(self):
        """Test dashboard view renders in Spanish."""
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Panel de Control")
        self.assertContains(response, "Pendiente")

    def test_detail_view_comment(self):
        """Test detail view and comment submission."""
        response = self.client.get(reverse('todo-detail', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.todo.title)
        
        # Post a comment
        response = self.client.post(reverse('todo-detail', args=[self.todo.pk]), {
            'text': 'This is a test comment'
        })
        self.assertRedirects(response, reverse('todo-detail', args=[self.todo.pk]))
        
        # Verify comment exists
        response = self.client.get(reverse('todo-detail', args=[self.todo.pk]))
        self.assertContains(response, 'This is a test comment')

    def test_notification_trigger(self):
        """Test notification creation on assignment."""
        # Create a second user
        user2 = User.objects.create_user(username='user2', password='password')
        
        # Assign task to user2
        self.todo.assigned_to = user2
        self.todo.save()
        
        # Check notification
        self.assertEqual(Notification.objects.count(), 1)
        notification = Notification.objects.first()
        self.assertEqual(notification.user, user2) # Notification should be for user2
        self.assertIn('assigned to task', notification.message)
        self.assertFalse(notification.is_read)

    def test_mark_notification_read(self):
        # Create a notification
        notification = Notification.objects.create(
            user=self.user,
            message="Test Notification",
            link=reverse('dashboard')
        )
        
        # Access the mark read view
        response = self.client.get(reverse('mark-notification-read', args=[notification.pk]))
        
        # Verify redirect
        self.assertRedirects(response, reverse('dashboard'))
        
        # Verify marked as read
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_user_management_access(self):
        # Regular user should get 403
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 403)

        # Superuser should get 200
        admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        self.client.force_login(admin_user)
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'admin')

    def test_report_view_access(self):
        # Regular user should get 403
        response = self.client.get(reverse('report'))
        self.assertEqual(response.status_code, 403)

        # Superuser should get 200
        admin_user = User.objects.create_superuser('admin_report', 'admin_report@example.com', 'password')
        self.client.force_login(admin_user)
        response = self.client.get(reverse('report'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Task Report')

    def test_report_csv_export(self):
        admin_user = User.objects.create_superuser('admin_csv', 'admin_csv@example.com', 'password')
        self.client.force_login(admin_user)
        
        # Create a task to export
        Todo.objects.create(title="Export Task", created_by=admin_user)
        
        response = self.client.get(reverse('report') + '?export=csv')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertContains(response, 'Export Task')

    def test_create_default_admin_command(self):
        # Test that the command creates a default admin
        from django.core.management import call_command
        from io import StringIO
        
        out = StringIO()
        call_command(
            'create_default_admin',
            username='testadmin',
            email='testadmin@example.com',
            password='testpass123',
            stdout=out
        )
        
        # Verify admin user was created
        admin = User.objects.get(username='testadmin')
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertEqual(admin.email, 'testadmin@example.com')
        
        # Test that running again skips creation
        out2 = StringIO()
        call_command(
            'create_default_admin',
            username='testadmin',
            email='testadmin@example.com',
            password='testpass123',
            stdout=out2
        )
        self.assertIn('already exists', out2.getvalue())

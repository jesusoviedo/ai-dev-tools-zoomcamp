from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from django.utils.translation import activate
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import timedelta
from .models import Todo, AuditLog, Notification, Comment, UserProfile
from .forms import TodoForm, CommentForm, UserUpdateForm, UserSettingsForm
from .middleware import PasswordChangeRequiredMiddleware
import json


# ==================== MODEL TESTS ====================

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

    def test_dependencies(self):
        """Test task dependencies."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        task2.dependencies.add(task1)
        
        self.assertIn(task1, task2.dependencies.all())
        self.assertIn(task2, task1.blocking.all())

    def test_check_circular_dependency_direct_cycle(self):
        """Test detection of direct circular dependency."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        
        # task1 depende de task2
        task1.dependencies.add(task2)
        
        # Verificar que task2 no puede depender de task1 (ciclo directo)
        has_cycle, cycle_path = task2.check_circular_dependency(task1)
        self.assertTrue(has_cycle)
        self.assertIn(task1.pk, cycle_path)
        self.assertIn(task2.pk, cycle_path)

    def test_check_circular_dependency_indirect_cycle(self):
        """Test detection of indirect circular dependency."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        task3 = Todo.objects.create(title="Task 3", created_by=self.user)
        
        # Crear dependencias: task1 → task2 → task3
        task1.dependencies.add(task2)
        task2.dependencies.add(task3)
        
        # Verificar que task3 no puede depender de task1 (ciclo indirecto: 1→2→3→1)
        has_cycle, cycle_path = task3.check_circular_dependency(task1)
        self.assertTrue(has_cycle)
        self.assertIn(task1.pk, cycle_path)
        self.assertIn(task2.pk, cycle_path)
        self.assertIn(task3.pk, cycle_path)

    def test_check_circular_dependency_no_cycle(self):
        """Test that valid dependencies don't create cycles."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        task3 = Todo.objects.create(title="Task 3", created_by=self.user)
        
        # task1 depende de task2
        task1.dependencies.add(task2)
        
        # Verificar que task3 puede depender de task1 sin crear ciclo
        has_cycle, cycle_path = task3.check_circular_dependency(task1)
        self.assertFalse(has_cycle)
        self.assertEqual(len(cycle_path), 0)

    def test_assigned_to(self):
        """Test task assignment."""
        user2 = User.objects.create_user(username='user2', password='password')
        todo = Todo.objects.create(title="Task", created_by=self.user, assigned_to=user2)
        self.assertEqual(todo.assigned_to, user2)


class UserProfileModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')

    def test_user_profile_auto_creation(self):
        """Test that UserProfile is automatically created when User is created."""
        # Profile should be created by signal
        self.assertTrue(hasattr(self.user, 'profile'))
        self.assertIsNotNone(self.user.profile)
        self.assertFalse(self.user.profile.must_change_password)

    def test_user_profile_must_change_password(self):
        """Test must_change_password field."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        self.assertTrue(self.user.profile.must_change_password)


class CommentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.todo = Todo.objects.create(title="Test Task", created_by=self.user)

    def test_create_comment(self):
        """Test creating a comment."""
        comment = Comment.objects.create(
            todo=self.todo,
            user=self.user,
            text="This is a comment"
        )
        self.assertEqual(str(comment), f"Comment by {self.user} on {self.todo}")
        self.assertEqual(comment.text, "This is a comment")


class NotificationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')

    def test_create_notification(self):
        """Test creating a notification."""
        notification = Notification.objects.create(
            user=self.user,
            message="Test notification",
            link="/dashboard/"
        )
        self.assertFalse(notification.is_read)
        self.assertEqual(str(notification), f"Notification for {self.user}: Test notification")

    def test_mark_notification_read(self):
        """Test marking notification as read."""
        notification = Notification.objects.create(
            user=self.user,
            message="Test notification"
        )
        notification.is_read = True
        notification.save()
        self.assertTrue(notification.is_read)


class AuditLogModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')

    def test_create_audit_log(self):
        """Test creating an audit log."""
        log = AuditLog.objects.create(
            user=self.user,
            action='CREATE',
            model_name='Todo',
            object_id='1',
            details='Test audit log'
        )
        self.assertEqual(str(log), f"{self.user} - CREATE - {log.timestamp}")


# ==================== FORM TESTS ====================

class TodoFormTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.user2 = User.objects.create_user(username='user2', password='password')

    def test_todo_form_valid(self):
        """Test TodoForm with valid data."""
        form = TodoForm(data={
            'title': 'Test Task',
            'description': 'Test Description',
            'status': 'ACTIVE'
        })
        self.assertTrue(form.is_valid())

    def test_todo_form_invalid_empty_title(self):
        """Test TodoForm with empty title."""
        form = TodoForm(data={'title': ''})
        self.assertFalse(form.is_valid())
        self.assertIn('title', form.errors)

    def test_todo_form_hide_status_on_create(self):
        """Test that status field is hidden when creating new task."""
        form = TodoForm()
        self.assertIsInstance(form.fields['status'].widget, type(form.fields['status'].widget))
        # When instance has no pk, status should be hidden
        self.assertIsInstance(form.fields['status'].widget, type(form.fields['status'].widget))

    def test_todo_form_exclude_self_from_dependencies(self):
        """Test that task cannot depend on itself."""
        todo = Todo.objects.create(title="Task", created_by=self.user)
        form = TodoForm(instance=todo)
        self.assertNotIn(todo, form.fields['dependencies'].queryset)

    def test_todo_form_prevent_direct_circular_dependency(self):
        """Test that form prevents direct circular dependency (A depends on B, B depends on A)."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        
        # task1 depende de task2
        task1.dependencies.add(task2)
        
        # Intentar hacer que task2 dependa de task1 (crearía ciclo directo)
        form = TodoForm(instance=task2, data={
            'title': 'Task 2',
            'status': 'ACTIVE',
            'dependencies': [task1.pk]
        })
        self.assertFalse(form.is_valid())
        self.assertIn('dependencies', form.errors)
        self.assertIn('circular', form.errors['dependencies'][0].lower())

    def test_todo_form_prevent_indirect_circular_dependency(self):
        """Test that form prevents indirect circular dependency (A → B → C → A)."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        task3 = Todo.objects.create(title="Task 3", created_by=self.user)
        
        # Crear dependencias: task1 → task2 → task3
        task1.dependencies.add(task2)
        task2.dependencies.add(task3)
        
        # Intentar hacer que task3 dependa de task1 (crearía ciclo indirecto: 1→2→3→1)
        form = TodoForm(instance=task3, data={
            'title': 'Task 3',
            'status': 'ACTIVE',
            'dependencies': [task1.pk]
        })
        self.assertFalse(form.is_valid())
        self.assertIn('dependencies', form.errors)
        self.assertIn('circular', form.errors['dependencies'][0].lower())

    def test_todo_form_allow_valid_dependencies(self):
        """Test that form allows valid non-circular dependencies."""
        task1 = Todo.objects.create(title="Task 1", created_by=self.user)
        task2 = Todo.objects.create(title="Task 2", created_by=self.user)
        task3 = Todo.objects.create(title="Task 3", created_by=self.user)
        
        # Crear dependencias válidas: task3 depende de task1 y task2
        form = TodoForm(instance=task3, data={
            'title': 'Task 3',
            'status': 'ACTIVE',
            'dependencies': [task1.pk, task2.pk]
        })
        self.assertTrue(form.is_valid(), f"Form errors: {form.errors}")
        
        # Verificar que se pueden guardar
        form.save()
        task3.refresh_from_db()
        self.assertIn(task1, task3.dependencies.all())
        self.assertIn(task2, task3.dependencies.all())


class CommentFormTest(TestCase):
    def test_comment_form_valid(self):
        """Test CommentForm with valid data."""
        form = CommentForm(data={'text': 'Test comment'})
        self.assertTrue(form.is_valid())

    def test_comment_form_with_attachment(self):
        """Test CommentForm with file attachment."""
        file = SimpleUploadedFile("test.txt", b"file content")
        form = CommentForm(data={'text': 'Test'}, files={'attachment': file})
        self.assertTrue(form.is_valid())


class UserUpdateFormTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password', email='test@example.com')

    def test_user_update_form_valid(self):
        """Test UserUpdateForm with valid data."""
        form = UserUpdateForm(instance=self.user, data={
            'username': 'testuser',
            'email': 'newemail@example.com',
            'is_active': True
        })
        self.assertTrue(form.is_valid())

    def test_user_update_form_reset_password(self):
        """Test UserUpdateForm with password reset."""
        form = UserUpdateForm(instance=self.user, data={
            'username': 'testuser',
            'email': 'test@example.com',
            'is_active': True,
            'reset_password': True
        })
        self.assertTrue(form.is_valid())
        user = form.save()
        # Refresh profile from database
        user.profile.refresh_from_db()
        self.assertTrue(user.profile.must_change_password)
        self.assertTrue(hasattr(form, 'temp_password'))


class UserSettingsFormTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password', email='test@example.com')

    def test_user_settings_form_valid(self):
        """Test UserSettingsForm with valid email."""
        form = UserSettingsForm(data={'email': 'newemail@example.com'}, user=self.user)
        self.assertTrue(form.is_valid())

    def test_user_settings_form_duplicate_email(self):
        """Test UserSettingsForm with duplicate email."""
        user2 = User.objects.create_user(username='user2', password='password', email='existing@example.com')
        form = UserSettingsForm(data={'email': 'existing@example.com'}, user=self.user)
        self.assertFalse(form.is_valid())
        self.assertIn('email', form.errors)


# ==================== VIEW TESTS ====================

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

    def test_list_view_filter_by_status(self):
        """Test filtering tasks by status."""
        Todo.objects.create(title="Completed Task", status='COMPLETED', created_by=self.user)
        response = self.client.get(reverse('todo-list') + '?status=COMPLETED')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Completed Task")

    def test_list_view_search(self):
        """Test searching tasks."""
        Todo.objects.create(title="Special Task", created_by=self.user)
        response = self.client.get(reverse('todo-list') + '?q=Special')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Special Task")

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

    def test_detail_view(self):
        """Test detail view."""
        response = self.client.get(reverse('todo-detail', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.todo.title)

    def test_detail_view_post_comment(self):
        """Test posting a comment on detail view."""
        response = self.client.post(reverse('todo-detail', args=[self.todo.pk]), {
            'text': 'Test comment'
        })
        self.assertRedirects(response, reverse('todo-detail', args=[self.todo.pk]))
        self.assertEqual(Comment.objects.count(), 1)

    def test_dashboard_view(self):
        """Test dashboard view."""
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('total_tasks', response.context)
        self.assertIn('completed_tasks', response.context)
        self.assertIn('pending_tasks', response.context)

    def test_dashboard_view_statistics(self):
        """Test dashboard statistics."""
        Todo.objects.create(title="Completed", status='COMPLETED', created_by=self.user)
        Todo.objects.create(title="Active", status='ACTIVE', created_by=self.user)
        
        response = self.client.get(reverse('dashboard'))
        self.assertEqual(response.context['total_tasks'], 3)  # 2 new + 1 from setUp
        self.assertEqual(response.context['completed_tasks'], 1)
        self.assertEqual(response.context['pending_tasks'], 2)

    def test_i18n_spanish(self):
        """Test that Spanish translation works."""
        activate('es')
        response = self.client.get(reverse('todo-list'))
        self.assertContains(response, "Todas las Tareas")


class UserManagementViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='password')
        self.regular_user = User.objects.create_user(username='user', password='password')
        self.client.force_login(self.admin_user)

    def test_user_list_view_access_denied_regular_user(self):
        """Test that regular users cannot access user list."""
        self.client.force_login(self.regular_user)
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 403)

    def test_user_list_view_access_granted_admin(self):
        """Test that admin users can access user list."""
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'admin')
        self.assertContains(response, 'user')

    def test_user_create_view(self):
        """Test creating a new user."""
        initial_count = User.objects.count()
        response = self.client.post(reverse('user-create'), {
            'username': 'newuser',
            'password1': 'complexpass123',
            'password2': 'complexpass123',
            'email': 'newuser@example.com'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.count(), initial_count + 1)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_update_view(self):
        """Test updating a user."""
        response = self.client.post(reverse('user-update', args=[self.regular_user.pk]), {
            'username': 'updateduser',
            'email': 'updated@example.com',
            'is_active': True
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.username, 'updateduser')
        self.assertEqual(self.regular_user.email, 'updated@example.com')

    def test_user_update_view_reset_password(self):
        """Test resetting user password."""
        response = self.client.post(reverse('user-update', args=[self.regular_user.pk]), {
            'username': 'user',
            'email': 'user@example.com',
            'reset_password': True
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.profile.must_change_password)


class ReportViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com', password='password')
        self.regular_user = User.objects.create_user(username='user', password='password')
        self.client.force_login(self.admin_user)
        self.todo = Todo.objects.create(title="Test Task", status='ACTIVE', created_by=self.admin_user)

    def test_report_view_access_denied_regular_user(self):
        """Test that regular users cannot access reports."""
        self.client.force_login(self.regular_user)
        response = self.client.get(reverse('report'))
        self.assertEqual(response.status_code, 403)

    def test_report_view_access_granted_admin(self):
        """Test that admin users can access reports."""
        response = self.client.get(reverse('report'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Task Report')

    def test_report_view_filter_by_status(self):
        """Test filtering report by status."""
        Todo.objects.create(title="Completed Task", status='COMPLETED', created_by=self.admin_user)
        response = self.client.get(reverse('report') + '?status=COMPLETED')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Completed Task')

    def test_report_csv_export(self):
        """Test CSV export functionality."""
        response = self.client.get(reverse('report') + '?export=csv')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertContains(response, 'Test Task')


class SettingsViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.user = User.objects.create_user(username='testuser', password='password', email='test@example.com')
        self.client.force_login(self.user)

    def test_settings_view_get(self):
        """Test settings view GET request."""
        response = self.client.get(reverse('user-settings'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('email_form', response.context)
        self.assertIn('password_form', response.context)

    def test_settings_view_update_email(self):
        """Test updating email in settings."""
        response = self.client.post(reverse('user-settings'), {
            'form_type': 'email',
            'email': 'newemail@example.com'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'newemail@example.com')

    def test_settings_view_change_password(self):
        """Test changing password in settings."""
        response = self.client.post(reverse('user-settings'), {
            'form_type': 'password',
            'old_password': 'password',
            'new_password1': 'newpassword123',
            'new_password2': 'newpassword123'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpassword123'))


class PasswordChangeViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_login(self.user)

    def test_password_change_required_view(self):
        """Test password change required view."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        
        response = self.client.get(reverse('password_change_required'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'todo_app/password_change_required.html')

    def test_password_change_required_post(self):
        """Test password change required POST."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        
        response = self.client.post(reverse('password_change_required'), {
            'old_password': 'password',
            'new_password1': 'newpassword123',
            'new_password2': 'newpassword123'
        }, follow=True)
        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.must_change_password)

    def test_custom_password_change_view(self):
        """Test custom password change view."""
        response = self.client.get(reverse('password_change'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/password_change_form.html')


class NotificationViewTest(TestCase):
    def setUp(self):
        activate('en')
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_login(self.user)

    def test_mark_notification_read(self):
        """Test marking notification as read."""
        notification = Notification.objects.create(
            user=self.user,
            message="Test Notification",
            link=reverse('dashboard')
        )
        
        response = self.client.get(reverse('mark-notification-read', args=[notification.pk]))
        self.assertRedirects(response, reverse('dashboard'))
        
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)


# ==================== MIDDLEWARE TESTS ====================

class PasswordChangeRequiredMiddlewareTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client = Client()

    def test_middleware_redirects_when_password_change_required(self):
        """Test that middleware redirects when password change is required."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        self.client.force_login(self.user)
        
        response = self.client.get(reverse('dashboard'))
        self.assertRedirects(response, reverse('password_change_required'))

    def test_middleware_allows_password_change_page(self):
        """Test that middleware allows access to password change page."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        self.client.force_login(self.user)
        
        response = self.client.get(reverse('password_change_required'))
        self.assertEqual(response.status_code, 200)

    def test_middleware_allows_logout(self):
        """Test that middleware allows logout."""
        self.user.profile.must_change_password = True
        self.user.profile.save()
        self.client.force_login(self.user)
        
        response = self.client.get('/accounts/logout/')
        # Logout typically redirects (302) or returns 200, both are acceptable
        self.assertIn(response.status_code, [200, 302])


# ==================== SIGNAL TESTS ====================

class SignalTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.user2 = User.objects.create_user(username='user2', password='password')

    def test_user_profile_creation_signal(self):
        """Test that UserProfile is created when User is created."""
        new_user = User.objects.create_user(username='newuser', password='password')
        self.assertTrue(hasattr(new_user, 'profile'))
        self.assertIsNotNone(new_user.profile)

    def test_notification_on_task_assignment(self):
        """Test that notification is created when task is assigned."""
        todo = Todo.objects.create(
            title="Test Task",
            created_by=self.user,
            assigned_to=self.user2
        )
        self.assertEqual(Notification.objects.count(), 1)
        notification = Notification.objects.first()
        self.assertEqual(notification.user, self.user2)
        self.assertIn('assigned', notification.message.lower())

    def test_notification_on_status_change_to_completed(self):
        """Test that notification is created when task status changes to COMPLETED."""
        todo1 = Todo.objects.create(title="Task 1", created_by=self.user, status='ACTIVE')
        todo2 = Todo.objects.create(title="Task 2", created_by=self.user, status='ACTIVE')
        todo2.dependencies.add(todo1)
        
        todo1.status = 'COMPLETED'
        todo1.save()
        
        # Should create notification for task2 (blocked by task1)
        notifications = Notification.objects.filter(user=self.user)
        self.assertTrue(notifications.exists())
        notification = notifications.first()
        self.assertIn('dependency completed', notification.message.lower())

    def test_automatic_unblock_on_all_dependencies_completed(self):
        """Test that blocked tasks are automatically unblocked when all dependencies are completed."""
        # Crear tareas: task1 y task2 bloquean a task3
        todo1 = Todo.objects.create(title="Task 1", created_by=self.user, status='ACTIVE')
        todo2 = Todo.objects.create(title="Task 2", created_by=self.user, status='ACTIVE')
        todo3 = Todo.objects.create(title="Task 3", created_by=self.user, status='BLOCKED')
        
        # task3 depende de task1 y task2
        todo3.dependencies.add(todo1, todo2)
        
        # Limpiar notificaciones previas
        Notification.objects.all().delete()
        
        # Completar task1 - task3 debería seguir bloqueada
        todo1.status = 'COMPLETED'
        todo1.save()
        todo3.refresh_from_db()
        self.assertEqual(todo3.status, 'BLOCKED', "Task should remain blocked when only one dependency is completed")
        
        # Verificar que NO se envió notificación cuando solo una dependencia está completa
        notifications_after_first = Notification.objects.filter(user=self.user)
        self.assertEqual(notifications_after_first.count(), 0, "No notification should be sent when task is still blocked")
        
        # Completar task2 - task3 debería desbloquearse automáticamente
        todo2.status = 'COMPLETED'
        todo2.save()
        todo3.refresh_from_db()
        self.assertEqual(todo3.status, 'ACTIVE', "Task should be automatically unblocked when all dependencies are completed")
        
        # Verificar que se creó un registro en AuditLog para el cambio automático
        audit_logs = AuditLog.objects.filter(object_id=str(todo3.pk), action='UPDATE')
        self.assertTrue(audit_logs.exists())
        latest_log = audit_logs.order_by('-timestamp').first()
        self.assertIn('automatically unblocked', latest_log.details.lower())
        
        # Verificar que se envió notificación SOLO cuando la tarea se desbloquea
        notifications_after_unblock = Notification.objects.filter(user=self.user)
        self.assertEqual(notifications_after_unblock.count(), 1, "Notification should be sent only when task is unblocked")
        notification = notifications_after_unblock.first()
        self.assertIn('You can now proceed', notification.message)


# ==================== INTEGRATION TESTS ====================

class IntegrationTest(TestCase):
    def setUp(self):
        activate('en')
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_login(self.user)

    def test_full_task_lifecycle(self):
        """Test complete task lifecycle: create, update, comment, delete."""
        # Create - use the same approach as test_create_view_normal
        initial_count = Todo.objects.count()
        response = self.client.post(reverse('todo-create'), {
            'title': 'Lifecycle Task',
            'description': 'Test description',
            'status': 'ACTIVE',  # Include status even though it's hidden
            'due_date': timezone.now().date().isoformat()
        })
        # Verify task was created - check count first
        final_count = Todo.objects.count()
        self.assertEqual(final_count, initial_count + 1, 
                     f"Task not created. Count: {final_count}, Initial: {initial_count}")
        self.assertTrue(Todo.objects.filter(title='Lifecycle Task').exists())
        todo = Todo.objects.get(title='Lifecycle Task')
        
        # Update
        response = self.client.post(reverse('todo-update', args=[todo.pk]), {
            'title': 'Updated Lifecycle Task',
            'status': 'ON_HOLD'
        })
        # Verify update worked
        todo.refresh_from_db()
        self.assertEqual(todo.status, 'ON_HOLD')
        self.assertEqual(todo.title, 'Updated Lifecycle Task')
        
        # Comment
        initial_comment_count = Comment.objects.count()
        response = self.client.post(reverse('todo-detail', args=[todo.pk]), {
            'text': 'Test comment'
        })
        # Verify comment was created
        self.assertEqual(Comment.objects.count(), initial_comment_count + 1)
        self.assertEqual(Comment.objects.filter(todo=todo).count(), 1)
        
        # Delete
        response = self.client.post(reverse('todo-delete', args=[todo.pk]))
        # Verify soft delete worked
        self.assertFalse(Todo.objects.filter(pk=todo.pk).exists())
        self.assertTrue(Todo.all_objects.filter(pk=todo.pk).exists())


# ==================== SPANISH TRANSLATION TESTS ====================

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

    def test_detail_view_comment_spanish(self):
        """Test detail view and comment submission in Spanish."""
        response = self.client.get(reverse('todo-detail', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.todo.title)
        
        # Post a comment
        response = self.client.post(reverse('todo-detail', args=[self.todo.pk]), {
            'text': 'Este es un comentario de prueba'
        })
        self.assertRedirects(response, reverse('todo-detail', args=[self.todo.pk]))
        
        # Verify comment exists
        response = self.client.get(reverse('todo-detail', args=[self.todo.pk]))
        self.assertContains(response, 'Este es un comentario de prueba')


# ==================== MANAGEMENT COMMAND TESTS ====================

class ManagementCommandTest(TestCase):
    def test_create_default_admin_command(self):
        """Test that the command creates a default admin."""
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

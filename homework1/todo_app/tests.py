from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from .models import Todo
import datetime

class TodoModelTest(TestCase):
    def test_create_todo_normal(self):
        """Test creating a Todo with valid data."""
        todo = Todo.objects.create(
            title="Buy milk",
            description="Go to the store",
            due_date=timezone.now()
        )
        self.assertEqual(str(todo), "Buy milk")
        self.assertFalse(todo.is_resolved)

    def test_create_todo_edge_max_length(self):
        """Test creating a Todo with max length title."""
        max_title = "a" * 200
        todo = Todo.objects.create(title=max_title)
        self.assertEqual(todo.title, max_title)

    def test_create_todo_empty_description(self):
        """Test creating a Todo with empty description (should be allowed)."""
        todo = Todo.objects.create(title="No description")
        self.assertIsNone(todo.description)

class TodoViewTest(TestCase):
    def setUp(self):
        self.todo = Todo.objects.create(title="Test Task")

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
        self.assertContains(response, "No tasks yet")

    def test_create_view_normal(self):
        """Test creating a new todo via POST."""
        response = self.client.post(reverse('todo-create'), {
            'title': 'New Task',
            'description': 'New Description',
            'due_date': '' # Optional field
        })
        self.assertEqual(response.status_code, 302) # Redirects on success
        self.assertEqual(Todo.objects.count(), 2)

    def test_create_view_invalid_empty_title(self):
        """Test creating todo with empty title (should fail)."""
        response = self.client.post(reverse('todo-create'), {
            'title': '',
            'description': 'Should fail'
        })
        self.assertEqual(response.status_code, 200) # Re-renders form
        # Check if 'form' is in context and has errors
        form = response.context['form']
        self.assertTrue(form.errors)
        self.assertIn('title', form.errors)
        self.assertEqual(form.errors['title'], ['This field is required.'])

    def test_update_view_normal(self):
        """Test updating an existing todo."""
        response = self.client.post(reverse('todo-update', args=[self.todo.pk]), {
            'title': 'Updated Task',
            'description': 'Updated Description',
            'is_resolved': True
        })
        self.assertEqual(response.status_code, 302)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.title, 'Updated Task')
        self.assertTrue(self.todo.is_resolved)

    def test_update_view_not_found(self):
        """Test updating a non-existent todo."""
        response = self.client.get(reverse('todo-update', args=[999]))
        self.assertEqual(response.status_code, 404)

    def test_delete_view_normal(self):
        """Test deleting a todo."""
        response = self.client.post(reverse('todo-delete', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Todo.objects.count(), 0)

    def test_delete_view_not_found(self):
        """Test deleting a non-existent todo."""
        response = self.client.post(reverse('todo-delete', args=[999]))
        self.assertEqual(response.status_code, 404)

from django.urls import reverse_lazy
from django.views.generic import ListView, CreateView, UpdateView, DeleteView, TemplateView
from django.db.models import Count, Q
from django.utils import timezone
from .models import Todo

class DashboardView(TemplateView):
    template_name = 'todo_app/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        now = timezone.now()
        
        # Statistics
        context['total_tasks'] = Todo.objects.count()
        context['completed_tasks'] = Todo.objects.filter(is_resolved=True).count()
        context['pending_tasks'] = Todo.objects.filter(is_resolved=False).count()
        
        # Upcoming tasks (pending, ordered by due date)
        context['upcoming_tasks'] = Todo.objects.filter(
            is_resolved=False,
            due_date__gte=now
        ).order_by('due_date')[:5]
        
        # Overdue tasks (pending, due date passed)
        context['overdue_tasks'] = Todo.objects.filter(
            is_resolved=False,
            due_date__lt=now
        ).order_by('due_date')

        return context

class TodoListView(ListView):
    model = Todo
    template_name = 'todo_app/todo_list.html'
    context_object_name = 'todos'
    
    def get_queryset(self):
        queryset = Todo.objects.all()
        status = self.request.GET.get('status')
        if status == 'completed':
            queryset = queryset.filter(is_resolved=True)
        elif status == 'pending':
            queryset = queryset.filter(is_resolved=False)
            
        # Order by: Overdue first, then upcoming, then no due date, then completed
        return queryset.order_by('is_resolved', 'due_date')

class TodoCreateView(CreateView):
    model = Todo
    fields = ['title', 'description', 'due_date', 'dependencies']
    template_name = 'todo_app/todo_form.html'
    success_url = reverse_lazy('todo-list')

class TodoUpdateView(UpdateView):
    model = Todo
    fields = ['title', 'description', 'due_date', 'is_resolved', 'dependencies']
    template_name = 'todo_app/todo_form.html'
    success_url = reverse_lazy('todo-list')

class TodoDeleteView(DeleteView):
    model = Todo
    template_name = 'todo_app/todo_confirm_delete.html'
    success_url = reverse_lazy('todo-list')

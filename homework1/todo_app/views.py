from django.urls import reverse_lazy, reverse
from django.shortcuts import redirect, get_object_or_404
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, TemplateView, View
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from collections import defaultdict
import json
from django.utils import timezone
from django.http import HttpResponse
from django import forms
import csv
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, UserChangeForm, PasswordChangeForm
from django.contrib.auth.views import PasswordChangeView, PasswordChangeDoneView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext_lazy as _
from django.contrib import messages
from .models import Todo, AuditLog, Notification
from .forms import TodoForm, CommentForm, UserUpdateForm, UserSettingsForm

class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'todo_app/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        now = timezone.now()
        
        # Statistics (using new status field)
        context['total_tasks'] = Todo.objects.count()
        context['completed_tasks'] = Todo.objects.filter(status='COMPLETED').count()
        context['pending_tasks'] = Todo.objects.filter(status__in=['ACTIVE', 'ON_HOLD', 'BLOCKED']).count()
        
        # Upcoming tasks (active/pending, ordered by due date)
        context['upcoming_tasks'] = Todo.objects.filter(
            status__in=['ACTIVE'],
            due_date__gte=now
        ).order_by('due_date')[:5]
        
        # Overdue tasks
        context['overdue_tasks'] = Todo.objects.filter(
            status__in=['ACTIVE'],
            due_date__lt=now
        ).order_by('due_date')
        
        # Tasks by creation date (last 30 days)
        from datetime import timedelta
        thirty_days_ago = now - timedelta(days=30)
        tasks_by_date = Todo.objects.filter(
            created_at__gte=thirty_days_ago
        ).extra(
            select={'date': 'date(created_at)'}
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        context['tasks_by_date_labels'] = json.dumps([str(item['date']) for item in tasks_by_date])
        context['tasks_by_date_data'] = json.dumps([item['count'] for item in tasks_by_date])
        
        # Tasks by status per month (last 6 months)
        six_months_ago = now - timedelta(days=180)
        tasks_by_month_status = Todo.objects.filter(
            created_at__gte=six_months_ago
        ).extra(
            select={'month': "strftime('%%Y-%%m', created_at)"}
        ).values('month', 'status').annotate(
            count=Count('id')
        ).order_by('month')
        
        # Organize by month and status
        monthly_data = defaultdict(lambda: {'ACTIVE': 0, 'COMPLETED': 0, 'ON_HOLD': 0, 'BLOCKED': 0})
        for item in tasks_by_month_status:
            monthly_data[item['month']][item['status']] = item['count']
        
        monthly_labels = sorted(monthly_data.keys())
        context['monthly_labels'] = json.dumps(monthly_labels)
        context['monthly_active'] = json.dumps([monthly_data[month]['ACTIVE'] for month in monthly_labels])
        context['monthly_completed'] = json.dumps([monthly_data[month]['COMPLETED'] for month in monthly_labels])
        context['monthly_on_hold'] = json.dumps([monthly_data[month]['ON_HOLD'] for month in monthly_labels])
        context['monthly_blocked'] = json.dumps([monthly_data[month]['BLOCKED'] for month in monthly_labels])
        
        # Tasks completed by user
        tasks_by_user = Todo.objects.filter(
            status='COMPLETED',
            assigned_to__isnull=False
        ).values('assigned_to__username').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        context['user_labels'] = json.dumps([item['assigned_to__username'] for item in tasks_by_user])
        context['user_data'] = json.dumps([item['count'] for item in tasks_by_user])

        return context

class TodoListView(LoginRequiredMixin, ListView):
    model = Todo
    template_name = 'todo_app/todo_list.html'
    context_object_name = 'todos'
    paginate_by = 10  # Pagination
    
    def get_queryset(self):
        queryset = Todo.objects.all()
        
        # Filtering
        status = self.request.GET.get('status')
        if status and status != 'all':
            if status == 'pending':
                queryset = queryset.filter(status__in=['ACTIVE', 'ON_HOLD', 'BLOCKED'])
            elif status == 'completed':
                queryset = queryset.filter(status='COMPLETED')
            else:
                queryset = queryset.filter(status=status.upper())

        # Search
        search_query = self.request.GET.get('q')
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(description__icontains=search_query)
            )
            
        return queryset.order_by('status', 'due_date')

class TodoDetailView(LoginRequiredMixin, DetailView):
    model = Todo
    template_name = 'todo_app/todo_detail.html'
    context_object_name = 'todo'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['comment_form'] = CommentForm()
        context['comments'] = self.object.comments.all().order_by('-created_at')
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = CommentForm(request.POST, request.FILES)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.todo = self.object
            comment.user = request.user
            comment.save()
            return redirect('todo-detail', pk=self.object.pk)
        
        context = self.get_context_data()
        context['comment_form'] = form
        return self.render_to_response(context)

class TodoCreateView(LoginRequiredMixin, CreateView):
    model = Todo
    form_class = TodoForm
    template_name = 'todo_app/todo_form.html'
    success_url = reverse_lazy('todo-list')

    def form_valid(self, form):
        # Set created_by if user is authenticated
        form.instance.created_by = self.request.user
            
        response = super().form_valid(form)
        
        # Audit Log handled by signals
        return response

class TodoUpdateView(LoginRequiredMixin, UpdateView):
    model = Todo
    form_class = TodoForm
    template_name = 'todo_app/todo_form.html'
    success_url = reverse_lazy('todo-list')

    def form_valid(self, form):
        response = super().form_valid(form)
        
        # Audit Log handled by signals
        return response

class TodoDeleteView(LoginRequiredMixin, DeleteView):
    model = Todo
    template_name = 'todo_app/todo_confirm_delete.html'
    success_url = reverse_lazy('todo-list')

    def form_valid(self, form):
        # Audit Log handled by signals
        return super().form_valid(form)

@login_required
def mark_notification_read(request, pk):
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    notification.is_read = True
    notification.save()
    return redirect(notification.link if notification.link else 'dashboard')

class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser

class UserListView(LoginRequiredMixin, SuperUserRequiredMixin, ListView):
    model = User
    template_name = 'todo_app/user_list.html'
    context_object_name = 'users'
    paginate_by = 20

class UserCreateView(LoginRequiredMixin, SuperUserRequiredMixin, CreateView):
    model = User
    form_class = UserCreationForm
    template_name = 'todo_app/user_form.html'
    success_url = reverse_lazy('user-list')
    
    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Add Bootstrap classes to form fields
        for field_name, field in form.fields.items():
            if isinstance(field.widget, forms.CheckboxInput):
                field.widget.attrs['class'] = 'form-check-input'
            else:
                field.widget.attrs['class'] = 'form-control'
        return form

class UserUpdateView(LoginRequiredMixin, SuperUserRequiredMixin, UpdateView):
    model = User
    form_class = UserUpdateForm
    template_name = 'todo_app/user_form.html'
    success_url = reverse_lazy('user-list')
    
    def form_valid(self, form):
        response = super().form_valid(form)
        
        # If password was reset, show temporary password
        if hasattr(form, 'temp_password'):
            messages.success(
                self.request,
                _('Password reset successfully. Temporary password: %(password)s') % {'password': form.temp_password}
            )
        
        return response

class ReportView(LoginRequiredMixin, SuperUserRequiredMixin, TemplateView):
    template_name = 'todo_app/report.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = Todo.objects.all()
        
        # Filters
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        user_id = self.request.GET.get('user')
        if user_id:
            queryset = queryset.filter(assigned_to_id=user_id)
            
        context['tasks'] = queryset
        context['users'] = User.objects.all()
        return context

    def get(self, request, *args, **kwargs):
        if request.GET.get('export') == 'csv':
            return self.export_csv(request)
        return super().get(request, *args, **kwargs)

    def export_csv(self, request):
        queryset = Todo.objects.all()
        
        # Apply filters (duplicate logic, could be refactored)
        status = request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        user_id = request.GET.get('user')
        if user_id:
            queryset = queryset.filter(assigned_to_id=user_id)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="task_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Title', 'Status', 'Assigned To', 'Due Date', 'Created At'])
        
        for task in queryset:
            writer.writerow([
                task.title,
                task.status,
                task.assigned_to.username if task.assigned_to else 'Unassigned',
                task.due_date,
                task.created_at
            ])
            
        return response

class PasswordChangeRequiredView(PasswordChangeView):
    """View for mandatory password change when user has temporary password"""
    template_name = 'todo_app/password_change_required.html'
    form_class = PasswordChangeForm
    success_url = reverse_lazy('dashboard')
    
    def form_valid(self, form):
        response = super().form_valid(form)
        # Mark that password has been changed
        try:
            profile = self.request.user.profile
            profile.must_change_password = False
            profile.save()
            messages.success(self.request, _('Password changed successfully. You can now access all features.'))
        except AttributeError:
            pass
        return response
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['is_required'] = True
        return context

class CustomPasswordChangeView(LoginRequiredMixin, PasswordChangeView):
    """Custom password change view that uses our styled template"""
    template_name = 'registration/password_change_form.html'
    success_url = reverse_lazy('password_change_done')
    
    def form_valid(self, form):
        messages.success(self.request, _('Your password has been changed successfully.'))
        return super().form_valid(form)

class CustomPasswordChangeDoneView(LoginRequiredMixin, PasswordChangeDoneView):
    """Custom password change done view that uses our styled template"""
    template_name = 'registration/password_change_done.html'

class UserSettingsView(LoginRequiredMixin, TemplateView):
    """View for users to change their own email and password"""
    template_name = 'todo_app/settings.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context['user'] = user
        context['email_form'] = UserSettingsForm(instance=user, user=user)
        context['password_form'] = PasswordChangeForm(user=user)
        return context
    
    def post(self, request, *args, **kwargs):
        user = request.user
        form_type = request.POST.get('form_type', 'email')
        
        if form_type == 'email':
            email_form = UserSettingsForm(request.POST, instance=user, user=user)
            if email_form.is_valid():
                email_form.save()
                messages.success(request, _('Email updated successfully.'))
                return redirect('user-settings')
            else:
                context = self.get_context_data()
                context['email_form'] = email_form
                return self.render_to_response(context)
        
        elif form_type == 'password':
            password_form = PasswordChangeForm(user=user, data=request.POST)
            if password_form.is_valid():
                password_form.save()
                messages.success(request, _('Password changed successfully.'))
                return redirect('user-settings')
            else:
                context = self.get_context_data()
                context['password_form'] = password_form
                return self.render_to_response(context)
        
        return redirect('user-settings')

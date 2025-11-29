from django.urls import path
from . import views # Changed import to use 'views' alias

urlpatterns = [
    path('', views.DashboardView.as_view(), name='dashboard'),
    path('tasks/', views.TodoListView.as_view(), name='todo-list'),
    path('new/', views.TodoCreateView.as_view(), name='todo-create'),
    path('todo/<int:pk>/', views.TodoDetailView.as_view(), name='todo-detail'), # Modified path and view reference
    path('todo/<int:pk>/edit/', views.TodoUpdateView.as_view(), name='todo-update'), # Modified path and view reference
    path('todo/<int:pk>/delete/', views.TodoDeleteView.as_view(), name='todo-delete'), # Modified path and view reference
    path('notifications/<int:pk>/read/', views.mark_notification_read, name='mark-notification-read'),
    
    # User Management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/new/', views.UserCreateView.as_view(), name='user-create'),
    path('users/<int:pk>/edit/', views.UserUpdateView.as_view(), name='user-update'),
    
    # Reports
    path('report/', views.ReportView.as_view(), name='report'),
    
    # Password change required
    path('password_change_required/', views.PasswordChangeRequiredView.as_view(), name='password_change_required'),
    
    # User Settings
    path('settings/', views.UserSettingsView.as_view(), name='user-settings'),
]

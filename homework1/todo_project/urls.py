"""
URL configuration for todo_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.i18n import i18n_patterns
from todo_app import views

# URLs that don't need i18n
urlpatterns = [
    path('i18n/', include('django.conf.urls.i18n')),
    # Override password_change view with our custom styled view (must be before django.contrib.auth.urls)
    # These need to be outside i18n_patterns to work with both /accounts/password_change/ and /es/accounts/password_change/
    path('accounts/password_change/', views.CustomPasswordChangeView.as_view(), name='password_change'),
    path('accounts/password_change/done/', views.CustomPasswordChangeDoneView.as_view(), name='password_change_done'),
]

# URLs with i18n support
urlpatterns += i18n_patterns(
    # Also override within i18n_patterns for language-prefixed URLs
    path('accounts/password_change/', views.CustomPasswordChangeView.as_view(), name='password_change'),
    path('accounts/password_change/done/', views.CustomPasswordChangeDoneView.as_view(), name='password_change_done'),
    path('accounts/', include('django.contrib.auth.urls')),  # Login, logout, password reset, etc.
    path('admin/', admin.site.urls),
    path('', include('todo_app.urls')),
)

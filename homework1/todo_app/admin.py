from django.contrib import admin
from django.urls import path
from django.http import HttpResponseRedirect
from django.contrib.auth.views import PasswordChangeView, PasswordChangeDoneView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'must_change_password']
    list_filter = ['must_change_password']
    search_fields = ['user__username', 'user__email']

# Override admin's password change to use our custom template
class AdminPasswordChangeView(LoginRequiredMixin, PasswordChangeView):
    """Admin password change view that uses our styled template"""
    template_name = 'registration/password_change_form.html'
    success_url = '/admin/password_change/done/'

class AdminPasswordChangeDoneView(LoginRequiredMixin, PasswordChangeDoneView):
    """Admin password change done view that uses our styled template"""
    template_name = 'registration/password_change_done.html'

# Override admin's password change URLs
original_get_urls = admin.site.get_urls

def get_urls_with_custom_password_change():
    urls = original_get_urls()
    # Find and replace the password_change URLs
    for i, url_pattern in enumerate(urls):
        if hasattr(url_pattern, 'name'):
            if url_pattern.name == 'auth_password_change':
                urls[i] = path('password_change/', AdminPasswordChangeView.as_view(), name='auth_password_change')
            elif url_pattern.name == 'auth_password_change_done':
                urls[i] = path('password_change/done/', AdminPasswordChangeDoneView.as_view(), name='auth_password_change_done')
    return urls

admin.site.get_urls = get_urls_with_custom_password_change

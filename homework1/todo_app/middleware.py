import threading
from django.shortcuts import redirect
from django.urls import reverse

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class ThreadLocalUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user
        response = self.get_response(request)
        return response

class PasswordChangeRequiredMiddleware:
    """
    Middleware to redirect users who must change their password
    to the password change page.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # URLs that should be excluded from password change requirement
        excluded_paths = [
            '/accounts/logout/',
            '/accounts/password_change/',
            '/accounts/password_change/done/',
            '/i18n/',
        ]
        
        # Check if user is authenticated and must change password
        if (request.user.is_authenticated and 
            not any(request.path.startswith(path) for path in excluded_paths)):
            try:
                profile = request.user.profile
                if profile.must_change_password:
                    # Redirect to password change page
                    password_change_url = reverse('password_change_required')
                    if request.path != password_change_url:
                        return redirect(password_change_url)
            except AttributeError:
                # UserProfile doesn't exist yet, create it
                from .models import UserProfile
                UserProfile.objects.get_or_create(user=request.user)
        
        response = self.get_response(request)
        return response

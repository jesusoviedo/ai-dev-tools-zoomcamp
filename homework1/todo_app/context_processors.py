from .models import Notification

def notifications(request):
    if request.user.is_authenticated:
        return {
            'notifications': request.user.notifications.filter(is_read=False).order_by('-created_at'),
            'unread_count': request.user.notifications.filter(is_read=False).count()
        }
    return {}

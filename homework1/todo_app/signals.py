from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.urls import reverse
from django.contrib.auth.models import User
from .models import Todo, AuditLog, Notification, UserProfile
from .middleware import get_current_user

@receiver(pre_save, sender=Todo)
def capture_changes(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Todo.objects.get(pk=instance.pk)
            instance._old_assigned_to = old_instance.assigned_to
            instance._old_status = old_instance.status
        except Todo.DoesNotExist:
            pass

@receiver(post_save, sender=Todo)
def log_todo_save(sender, instance, created, **kwargs):
    user = get_current_user()
    if user and not user.is_authenticated:
        user = None
    
    if getattr(instance, '_soft_deleted', False):
        action = 'DELETE'
        details = f"Soft deleted task: {instance.title}"
    else:
        action = 'CREATE' if created else 'UPDATE'
        details = f"Task {action.lower()}d: {instance.title}"
        if not created:
            details += f". Status: {instance.status}"
        
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name='Todo',
        object_id=str(instance.pk),
        details=details
    )

    # Notification Logic
    if created and instance.assigned_to:
        Notification.objects.create(
            user=instance.assigned_to,
            message=f"You have been assigned to task: {instance.title}",
            link=reverse('todo-detail', args=[instance.pk])
        )
    elif not created:
        # Assignment change
        old_assigned = getattr(instance, '_old_assigned_to', None)
        if instance.assigned_to and instance.assigned_to != old_assigned:
             Notification.objects.create(
                user=instance.assigned_to,
                message=f"You have been assigned to task: {instance.title}",
                link=reverse('todo-detail', args=[instance.pk])
            )
        
        # Status change to COMPLETED
        old_status = getattr(instance, '_old_status', None)
        if instance.status == 'COMPLETED' and old_status != 'COMPLETED':
            blocked_tasks = instance.blocking.all()
            for task in blocked_tasks:
                recipient = task.assigned_to or task.created_by
                if recipient:
                     Notification.objects.create(
                        user=recipient,
                        message=f"Dependency completed: {instance.title}. You can now proceed with {task.title}",
                        link=reverse('todo-detail', args=[task.pk])
                    )

# Note: post_delete is for HARD deletes. Soft deletes are updates.
@receiver(post_delete, sender=Todo)
def log_todo_delete(sender, instance, **kwargs):
    user = get_current_user()
    if user and not user.is_authenticated:
        user = None
    AuditLog.objects.create(
        user=user,
        action='HARD_DELETE',
        model_name='Todo',
        object_id=str(instance.pk),
        details=f"Hard deleted task: {instance.title}"
    )

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile automatically when a User is created"""
    if created:
        UserProfile.objects.get_or_create(user=instance)

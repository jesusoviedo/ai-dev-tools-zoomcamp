from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

class TodoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class Todo(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', _('Active')),
        ('ON_HOLD', _('On Hold')),
        ('BLOCKED', _('Blocked')),
        ('COMPLETED', _('Completed')),
    ]

    title = models.CharField(max_length=200, verbose_name=_('Title'))
    description = models.TextField(blank=True, null=True, verbose_name=_('Description'))
    due_date = models.DateTimeField(blank=True, null=True, verbose_name=_('Due Date'))
    
    # New Fields
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', verbose_name=_('Status'))
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name=_('Completed At'))
    deleted_at = models.DateTimeField(blank=True, null=True) # Soft Delete
    
    # Relationships
    dependencies = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='blocking', verbose_name=_('Dependencies'))
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks', verbose_name=_('Assigned To'))
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks', null=True) # Nullable for migration compatibility
    created_at = models.DateTimeField(auto_now_add=True)

    # Managers
    objects = TodoManager()
    all_objects = models.Manager() # To access deleted items if needed

    def save(self, *args, **kwargs):
        # Auto-set completed_at
        if self.status == 'COMPLETED' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'COMPLETED':
            self.completed_at = None
            
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self._soft_deleted = True
        self.save()

    def check_circular_dependency(self, new_dependency):
        """
        Verifica si agregar new_dependency como dependencia crearía un ciclo circular.
        Usa DFS (Depth First Search) para detectar ciclos en el grafo dirigido.
        
        Args:
            new_dependency: La tarea (Todo) que se quiere agregar como dependencia
        
        Returns:
            tuple: (has_cycle: bool, cycle_path: list) - Indica si hay ciclo y el camino del ciclo
        """
        def dfs_detect_cycle(start_task, target_task_id, path=None, visited=None):
            """
            DFS recursivo para detectar si hay un camino de start_task a target_task_id.
            Si existe tal camino, agregar new_dependency crearía un ciclo.
            """
            if path is None:
                path = []
            if visited is None:
                visited = set()
            
            # Si ya visitamos este nodo en el camino actual, no hay ciclo desde aquí
            if start_task.pk in visited:
                return False, []
            
            visited.add(start_task.pk)
            path.append(start_task.pk)
            
            # Si llegamos al target, hay un ciclo (el path ya incluye al menos start_task)
            if start_task.pk == target_task_id:
                return True, path.copy()
            
            # Revisar todas las dependencias de start_task
            for dep in start_task.dependencies.all():
                has_cycle, cycle_path = dfs_detect_cycle(dep, target_task_id, path, visited)
                if has_cycle:
                    return True, cycle_path
            
            # Backtrack: remover del path y visited al salir de la recursión
            path.pop()
            visited.remove(start_task.pk)
            return False, []
        
        # Verificar si new_dependency tiene un camino (directo o indirecto) hacia self
        # Si lo tiene, agregar new_dependency como dependencia crearía un ciclo
        has_cycle, cycle_path = dfs_detect_cycle(new_dependency, self.pk)
        
        if has_cycle:
            # El cycle_path ya contiene self.pk al final cuando el DFS encuentra el target
            # (el DFS agrega start_task.pk al path antes de verificar si es el target)
            # No agregar self.pk nuevamente para evitar duplicados
            return True, cycle_path
        
        return False, []

    def __str__(self):
        return self.title

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"

class Comment(models.Model):
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    attachment = models.FileField(upload_to='attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user} on {self.todo}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user}: {self.message}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name=_('User'))
    must_change_password = models.BooleanField(default=False, verbose_name=_('Must Change Password'))
    
    def __str__(self):
        return f"Profile for {self.user.username}"

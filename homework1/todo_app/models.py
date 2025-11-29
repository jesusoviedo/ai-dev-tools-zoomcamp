from django.db import models

class Todo(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    dependencies = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='blocking')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

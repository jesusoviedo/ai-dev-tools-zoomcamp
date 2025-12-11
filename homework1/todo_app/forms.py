from django import forms
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserChangeForm
from django.contrib.auth.hashers import make_password
import secrets
import string
from .models import Todo, Comment

class TodoForm(forms.ModelForm):
    class Meta:
        model = Todo
        fields = ['title', 'description', 'due_date', 'status', 'dependencies', 'assigned_to']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'dependencies': forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
            'assigned_to': forms.Select(attrs={'class': 'form-select'}),
        }
        labels = {
            'title': _('Title'),
            'description': _('Description'),
            'due_date': _('Due Date'),
            'status': _('Status'),
            'dependencies': _('Dependencies'),
            'assigned_to': _('Assigned To'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter assigned_to to only show active users
        self.fields['assigned_to'].queryset = self.fields['assigned_to'].queryset.filter(is_active=True)
        
        # Hide status field when creating new task (it will default to ACTIVE)
        if not self.instance.pk:
            self.fields['status'].widget = forms.HiddenInput()
        
        # Improve dependencies queryset - show all tasks except self, ordered by title
        dependencies_queryset = Todo.objects.all().order_by('title')
        if self.instance.pk:
            dependencies_queryset = dependencies_queryset.exclude(pk=self.instance.pk)
        self.fields['dependencies'].queryset = dependencies_queryset
        
        # Customize the label format for dependencies to show title and status
        self.fields['dependencies'].label_from_instance = lambda obj: f"{obj.title} ({obj.get_status_display()})"

    def clean_dependencies(self):
        """
        Validar que las dependencias no creen ciclos circulares.
        Usa el algoritmo de detección de ciclos del modelo Todo.
        """
        dependencies = self.cleaned_data.get('dependencies', [])
        instance = self.instance
        
        # Si es una nueva tarea (sin pk), no hay problema de ciclos aún
        # porque aún no tiene dependencias establecidas
        if not instance.pk:
            return dependencies
        
        # Verificar cada dependencia seleccionada para detectar ciclos
        for dep in dependencies:
            has_cycle, cycle_path = instance.check_circular_dependency(dep)
            if has_cycle:
                # Construir mensaje de error descriptivo con los nombres de las tareas
                cycle_tasks = Todo.objects.filter(pk__in=cycle_path)
                cycle_names = [task.title for task in cycle_tasks]
                cycle_str = ' → '.join(cycle_names)
                raise forms.ValidationError(
                    _('Creating this dependency would create a circular reference. '
                      'Cycle detected: %(cycle)s') % {'cycle': cycle_str}
                )
        
        return dependencies

class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['text', 'attachment']
        widgets = {
            'text': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': _('Add a comment...')}),
            'attachment': forms.FileInput(attrs={'class': 'form-control'}),
        }

class UserUpdateForm(UserChangeForm):
    reset_password = forms.BooleanField(
        required=False,
        label=_('Reset Password'),
        help_text=_('Check this to generate a temporary password for the user. The user will be required to change it on next login.'),
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'is_active', 'is_staff', 'is_superuser']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_staff': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_superuser': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
        labels = {
            'username': _('Username'),
            'email': _('Email'),
            'is_active': _('Active'),
            'is_staff': _('Staff'),
            'is_superuser': _('Superuser'),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove password field from the form (we handle it separately)
        if 'password' in self.fields:
            del self.fields['password']
    
    def save(self, commit=True):
        user = super().save(commit=False)
        
        if self.cleaned_data.get('reset_password'):
            # Generate a temporary password
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
            user.set_password(temp_password)
            
            # Mark that user must change password
            if commit:
                user.save()
                from .models import UserProfile
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.must_change_password = True
                profile.save()
                # Store temp password in form for display
                self.temp_password = temp_password
            else:
                self.temp_password = temp_password
                user._must_change_password = True
        
        if commit:
            user.save()
        
        return user

class UserSettingsForm(forms.ModelForm):
    """Form for users to change their own email (username cannot be changed)"""
    class Meta:
        model = User
        fields = ['email']
        widgets = {
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'email': _('Email'),
        }
        help_texts = {
            'email': _('Enter a valid email address.'),
        }
    
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and self.user:
            # Check if email is already taken by another user
            if User.objects.filter(email=email).exclude(pk=self.user.pk).exists():
                raise forms.ValidationError(_('A user with that email already exists.'))
        return email

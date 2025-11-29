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
            'dependencies': forms.SelectMultiple(attrs={'class': 'form-select'}),
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
        
        # If editing, exclude self from dependencies
        if self.instance.pk:
            self.fields['dependencies'].queryset = self.fields['dependencies'].queryset.exclude(pk=self.instance.pk)

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
                profile, created = user.profile.get_or_create(user=user)
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

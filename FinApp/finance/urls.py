from django.urls import path
from .views import login_view, register_view, csrf_view

urlpatterns = [
    path('api/csrf/', csrf_view, name='csrf'),
    path('', login_view, name='login'),  # Ścieżka do login_view
    path('api/auth/register/', register_view, name='register'),
]
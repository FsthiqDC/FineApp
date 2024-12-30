from django.urls import path
from .views import login_view

urlpatterns = [
    path('', login_view, name='login'),  # Ścieżka do login_view
]

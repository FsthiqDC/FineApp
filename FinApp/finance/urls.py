from django.urls import path
from .views import login_view, register_view, csrf_view, home_view, get_user, login_user, categories_view, transactions_view, transaction_detail_view
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('api/csrf/', csrf_view, name='csrf'),
    path('', login_view, name='login'),  # Ścieżka do login_view
    path('api/auth/register/', register_view, name='register'),
    path('api/home/', home_view, name='home_data'),
    path('api/auth/user/', get_user, name='get-user'),
    path('api/auth/login/', login_user, name='login-user'),
    path('api/auth/token/', obtain_auth_token, name='api_token_auth'),
    path('api/categories/', categories_view, name='categories_view'),
    path('api/transactions/', transactions_view, name='transactions'),
    path('api/transactions/<str:transaction_id>/', transaction_detail_view, name='transaction_detail')
]
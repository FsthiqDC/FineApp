from django.urls import path
from .views import (login_view, 
                    register_view, 
                    home_view, 
                    get_user, 
                    login_user, 
                    categories_view, 
                    transactions_view, 
                    transaction_detail_view, 
                    user_profile_view, 
                    savings_goals_list_view, 
                    savings_goals_detail_view, 
                    categorybudgets_view, 
                    categorybudget_detail_view, 
                    reminders_view, 
                    reminder_detail_view,
                    reminders_notifications_view)
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('', login_view, name='login'),  # Ścieżka do login_view
    path('api/auth/register/', register_view, name='register'),
    path('api/home/', home_view, name='home_data'),
    path('api/auth/user/', get_user, name='get-user'),
    path('api/auth/login/', login_user, name='login-user'),
    path('api/auth/token/', obtain_auth_token, name='api_token_auth'),
    path('api/categories/', categories_view, name='categories_view'),
    path('api/transactions/', transactions_view, name='transactions'),
    path('api/transactions/<str:transaction_id>/', transaction_detail_view, name='transaction_detail'),
    path('api/user-profile/', user_profile_view, name='user_profile'),
    path('api/savings-goals/', savings_goals_list_view, name='savings_goals_list'),
    path('api/savings-goals/<uuid:goal_id>/', savings_goals_detail_view, name='savings_goals_detail'),
    path('api/category-budgets/', categorybudgets_view, name='categorybudgets_view'),           # GET / POST
    path('api/category-budgets/<uuid:budget_id>/', categorybudget_detail_view, name='categorybudget_detail_view'),  # GET / PATCH / DELETE
    path('api/reminders/', reminders_view, name='reminders_view'),
    path('api/reminders/<uuid:reminder_id>/', reminder_detail_view, name='reminder_detail_view'),
     path('api/reminders/notifications', reminders_notifications_view, name='reminders_notifications_view'),
]
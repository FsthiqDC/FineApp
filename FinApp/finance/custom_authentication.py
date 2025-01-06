from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser
import jwt
from supabase import create_client
import os

SUPABASE_URL = "https://ujrsmdegbzqjcsrxvyao.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class CustomSupabaseUser:
    def __init__(self, user_data):
        self.id = user_data.get('user_id')
        self.username = user_data.get('username')
        self.email = user_data.get('user_email')
        self.first_name = user_data.get('first_name')
        self.last_name = user_data.get('last_name')
        self.is_active = user_data.get('is_active', True)
        self.user_type = user_data.get('user_type', 'user')

    @property
    def is_authenticated(self):
        return True


class CustomAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            prefix, token = auth_header.split(' ')
            if prefix.lower() != 'bearer':
                raise AuthenticationFailed('Nieprawidłowy prefiks tokena')

            # Dekodowanie tokena JWT
            payload = jwt.decode(token, os.getenv('SUPABASE_JWT_SECRET'), algorithms=['HS256'])
            user_id = payload.get('user_id')

            # Pobieranie użytkownika z tabeli App_Users
            try:
                response = supabase.table('App_Users').select('*').eq('user_id', user_id).single().execute()
                user_data = response.data
                if not user_data:
                    raise AuthenticationFailed('Użytkownik nie istnieje lub brak dostępu')
            except Exception as e:
                raise AuthenticationFailed(f"Błąd pobierania użytkownika z Supabase: {e}")

            user = CustomSupabaseUser(user_data)
            print(f"✅ Użytkownik autoryzowany: {user.username}, Typ: {user.user_type}")

            return (user, None)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token wygasł')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Nieprawidłowy token')
        except Exception as e:
            print(f"❌ Błąd autoryzacji: {e}")
            raise AuthenticationFailed(f"Błąd autoryzacji: {str(e)}")

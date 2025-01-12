from django.contrib.auth import authenticate
from django.shortcuts import render
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from supabase import create_client, Client
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.status import HTTP_200_OK, HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
import jwt, os, json, bcrypt, logging

logger = logging.getLogger(__name__)

# Inicjalizacja Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcnNtZGVnYnpxamNzcnh2eWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTAyMzksImV4cCI6MjA1MTA2NjIzOX0.r9GbGA8I0hfO9yqEif8jEOGQzvfJ_WvRD2i4YLU2rdM')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categories_view(request):
    auth_header = request.headers.get('Authorization')
    print("🔑 Nagłówek Authorization:", auth_header)

    if not auth_header:
        return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

    try:
        # Token validation
        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        if not user_id or not isinstance(user_id, str):
            return Response({"error": "Nieprawidłowy identyfikator użytkownika"}, status=HTTP_403_FORBIDDEN)

        print("✅ Token poprawny. Pobieranie kategorii...")

        # Pobieranie kategorii z Supabase
        response = supabase.table('Categories').select('*').execute()

        if response.data:
            categories = response.data
            return Response({"categories": categories}, status=HTTP_200_OK)
        
        if response.error:
            print(f"❌ Błąd Supabase: {response.error}")
            return Response({"error": f"Błąd pobierania kategorii: {response.error}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"error": "Nie udało się pobrać kategorii"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    except jwt.ExpiredSignatureError:
        return Response({"error": "Token wygasł"}, status=HTTP_403_FORBIDDEN)
    except jwt.InvalidTokenError:
        return Response({"error": "Nieprawidłowy token"}, status=HTTP_403_FORBIDDEN)
    except Exception as e:
        print(f"❌ Wystąpił błąd: {e}")
        return Response({"error": f"Błąd serwera: {e}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_view(request):
    auth_header = request.headers.get('Authorization')
    print("🔑 Nagłówek Authorization:", auth_header)

    if not auth_header:
        return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

    try:
        # Walidacja prefiksu tokena
        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        print("🔑 Token JWT:", token)

        # Dekodowanie tokena
        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        print("🔑 Dekodowany Payload:", payload)

        user_id = payload.get('user_id')
        print("🔑 user_id z Payload:", user_id)

        if not user_id or not isinstance(user_id, str):
            print(f"❌ Błąd: user_id nie jest ciągiem znaków: {user_id}")
            return Response({"error": "Token nie zawiera prawidłowego ID użytkownika"}, status=HTTP_403_FORBIDDEN)

        # Pobieranie użytkownika z Supabase
        try:
            response = supabase.table('App_Users').select('*').eq('user_id', user_id).single().execute()
            print("🔑 Odpowiedź z Supabase:", response)

            if not response.data:
                print("❌ Użytkownik nie znaleziony w bazie")
                return Response({"error": "Użytkownik nie znaleziony w bazie"}, status=HTTP_403_FORBIDDEN)

            user = response.data
            print(f"✅ Autoryzowany użytkownik: {user.get('username')}")

        except Exception as db_error:
            print(f"❌ Błąd podczas pobierania użytkownika z Supabase: {db_error}")
            return Response({"error": "Błąd podczas pobierania użytkownika"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        # Placeholderowe dane dla pustej bazy danych
        monthly_expenses = [0, 0, 0, 0, 0]
        expense_categories = {
            "Jedzenie": 0,
            "Transport": 0,
            "Zdrowie": 0,
            "Dom": 0,
            "Edukacja": 0
        }

        # Zwrot danych podsumowania
        return Response({
            "monthly_expenses": monthly_expenses,
            "expense_categories": expense_categories
        }, status=HTTP_200_OK)

    except jwt.ExpiredSignatureError:
        print("❌ Token wygasł")
        return Response({"error": "Token wygasł"}, status=HTTP_403_FORBIDDEN)
    except jwt.InvalidTokenError:
        print("❌ Nieprawidłowy token")
        return Response({"error": "Nieprawidłowy token"}, status=HTTP_403_FORBIDDEN)
    except Exception as e:
        print(f"❌ Wystąpił błąd: {e}")
        return Response({"error": f"Błąd serwera: {e}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
def login_user(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Metoda nieobsługiwana"}, status=405)

    try:
        body = json.loads(request.body)
        email = body.get('email')
        password = body.get('password')

        if not email or not password:
            return JsonResponse({"error": "Email i hasło są wymagane"}, status=400)

        # Pobierz użytkownika z tabeli App_Users
        response = supabase.table('App_Users').select('*').eq('user_email', email).single().execute()
        user = response.data

        if not user:
            return JsonResponse({"error": "Nieprawidłowy email lub hasło"}, status=401)

        # Sprawdź hasło
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return JsonResponse({"error": "Nieprawidłowe hasło"}, status=401)

        # Generowanie tokena JWT
        payload = {
            'user_id': user['user_id'],
            'username': user['username'],
            'user_type': user['user_type'],
            'exp': datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        print("🔑 Wygenerowany token:", token)
        # Aktualizacja daty ostatniego logowania
        supabase.table('App_Users').update({'last_login': datetime.utcnow().isoformat()}).eq('user_id', user['user_id']).execute()

        return JsonResponse({
            "message": "Zalogowano pomyślnie",
            "token": token,
            "user": {
                "username": user['username'],
                "user_type": user['user_type']
            }
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@login_required
def get_user(request):
    return JsonResponse({
        "username": request.user.username,
        "user_type": request.user.user_type
    })

def csrf_view(request):
    token = get_token(request)
    return JsonResponse({'csrfToken': token})

def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        user = authenticate(request, username=email, password=password)
        if user is not None:
            return JsonResponse({'message': 'Zalogowano pomyślnie!'}, status=200)
        else:
            return JsonResponse({'message': 'Nieprawidłowe dane logowania.'}, status=400)
    return JsonResponse({'message': 'Nieobsługiwana metoda.'}, status=405)

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Walidacja wymaganych pól
            required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
            for field in required_fields:
                if field not in data or not data[field]:
                    return JsonResponse({'message': f'Brak wymaganego pola: {field}'}, status=400)
            
            # Sprawdzenie czy użytkownik już istnieje
            response = supabase.from_('App_Users').select('user_email').eq('user_email', data['email']).execute()
            if response.data and len(response.data) > 0:
                return JsonResponse({'message': 'Użytkownik z tym adresem email już istnieje'}, status=400)

            # Hashowanie hasła
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Tworzenie użytkownika w Supabase
            response = supabase.from_('App_Users').insert([
                {
                    'username': data['username'],
                    'user_email': data['email'],
                    'password': hashed_password,
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'created_at': 'now()',
                    'last_login': 'now()',
                    'is_active': True,
                    'langauge': 'PL',
                    'currency': 'PLN',
                    'user_type': 'user'
                }
            ]).execute()


            return JsonResponse({'message': '✅ Użytkownik został utworzony pomyślnie'}, status=201)
        
        except json.JSONDecodeError:
            return JsonResponse({'message': 'Błąd dekodowania JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'message': f'Wystąpił błąd: {str(e)}'}, status=500)

    return JsonResponse({'message': 'Nieobsługiwana metoda'}, status=405)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def transactions_view(request):
    user_id = request.user.id

    if request.method == 'GET':
        try:
            user_id = str(request.user.id)
            response = supabase.from_('Transactions').select('*').eq('transaction_owner', user_id).execute()

            # Sprawdzanie czy response zawiera dane lub błąd
            if not response or not hasattr(response, 'data'):
                return JsonResponse({'error': 'Nieoczekiwana odpowiedź od serwera bazy danych.'}, status=500)

            transactions = response.data

            if not transactions:
                return JsonResponse({'transactions': [], 'message': 'Brak transakcji. Wprowadź swoją pierwszą transakcję.'}, status=200)

            return JsonResponse({'transactions': transactions}, status=200)

        except Exception as e:
            print(f"Server Error: {e}")  # Loguje szczegóły błędu
            return JsonResponse({'error': f'Błąd serwera: {str(e)}'}, status=500)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_transaction = {
                'transaction_owner': str(user_id),
                'transaction_amount': data.get('amount'),
                'transaction_category_id': data.get('categoryId'),
                'transaction_payment_method': data.get('paymentMethod'),
                'transaction_type': data.get('transactionType', 'expense'),
                'transcation_data': data.get('date'),
                'transaction_description': data.get('description'),
                'transaction_status': data.get('status', 'Completed'),
                'transaction_currency': data.get('currency', 'PLN'),
            }

            response = supabase.from_('Transactions').insert([new_transaction]).execute()
            if response.error:
                return JsonResponse({'error': response.error.message}, status=400)

            return JsonResponse({'message': 'Transakcja została dodana pomyślnie.'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

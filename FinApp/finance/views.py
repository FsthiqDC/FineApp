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
from rest_framework.status import HTTP_200_OK, HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR,  HTTP_404_NOT_FOUND, HTTP_201_CREATED
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
def transactions_view(request):
    """
    Widok obsługujący listę transakcji (GET) i dodawanie nowej transakcji (POST).
    Z założenia 'transaction_owner' to user_id z App_Users, 
    a request.user.id powinno się z nim pokrywać (obaj to str/UUID).
    """

    print(f"DEBUG: Wywołano transactions_view z metodą {request.method}")
    try:
        # Pobieramy ID użytkownika z request.user.id
        user_id = str(request.user.id)
        print("DEBUG: Ustalono user_id =", user_id)

        if request.method == 'GET':
            print("DEBUG: Obsługa metody GET - pobieranie transakcji użytkownika.")
            try:
                response = (
                    supabase
                    .from_('Transactions')
                    .select('*')
                    .eq('transaction_owner', user_id)
                    .execute()
                )
                print("DEBUG: Odpowiedź z supabase (GET):", response)
            except Exception as e:
                print("DEBUG: Błąd podczas pobierania transakcji:", e)
                return Response({'error': f'Błąd serwera: {str(e)}'}, status=HTTP_500_INTERNAL_SERVER_ERROR)

            # Weryfikacja, czy w ogóle dostaliśmy poprawny obiekt z polami
            if not response or not hasattr(response, 'data'):
                print("DEBUG: Nieoczekiwana odpowiedź od serwera bazy danych (brak 'data').")
                return Response({'error': 'Nieoczekiwana odpowiedź od serwera bazy danych.'}, status=500)

            transactions = response.data
            print("DEBUG: transakcje pobrane z bazy:", transactions)

            if not transactions:
                print("DEBUG: Brak transakcji dla danego użytkownika.")
                return Response({'transactions': [], 'message': 'Brak transakcji.'}, status=HTTP_200_OK)

            print("DEBUG: Zwracam listę transakcji.")
            return Response({'transactions': transactions}, status=HTTP_200_OK)

        elif request.method == 'POST':
            print("DEBUG: Obsługa metody POST - dodawanie nowej transakcji.")
            try:
                data = json.loads(request.body)
                print("DEBUG: Otrzymane dane JSON (POST):", data)
                new_transaction = {
                    'transaction_owner': user_id,
                    'transaction_amount': data.get('amount'),
                    'transaction_category_id': data.get('categoryId'),
                    'transaction_payment_method': data.get('paymentMethod'),
                    'transaction_type': data.get('transactionType', 'Wydatek'),
                    'transcation_data': data.get('date'),
                    'transaction_description': data.get('description'),
                    'transaction_status': data.get('status', 'Ukończona'),
                    'transaction_currency': data.get('currency', 'PLN'),
                }
                print("DEBUG: Zbudowany obiekt new_transaction:", new_transaction)

                # Wstawiamy transakcję
                try:
                    insert_resp = (
                        supabase
                        .from_('Transactions')
                        .insert(new_transaction)
                        .execute()
                    )
                    print("DEBUG: Odpowiedź z supabase (POST):", insert_resp)
                except Exception as insert_err:
                    print("DEBUG: Błąd podczas wstawiania transakcji:", insert_err)
                    return Response({'error': str(insert_err)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

                # Zwracamy to, co chcesz - np. stały 'transaction_id': 123
                print("DEBUG: Nowa transakcja została pomyślnie dodana.")
                return Response({'transaction': new_transaction, 'transaction_id': 123}, status=HTTP_201_CREATED)

            except Exception as e:
                print("DEBUG: Błąd przy odczytywaniu/parsowaniu danych POST:", e)
                return Response({'error': str(e)}, status=500)

        # Dla innych metod zwracamy 405 (Method Not Allowed)
        print(f"DEBUG: Metoda {request.method} nieobsługiwana.")
        return Response({"error": "Method Not Allowed"}, status=405)

    except Exception as e:
        print("DEBUG: Błąd ogólny w transactions_view:", e)
        return Response({"error": str(e)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def transaction_detail_view(request, transaction_id):
    """
    Widok obsługujący pobieranie, edycję i usuwanie konkretnej transakcji,
    identyfikowanej przez UUID (transaction_id).
    """

    print(f"DEBUG: Wywołano transaction_detail_view z metodą {request.method} i ID = {transaction_id}")
    try:
        # ----------------------------------
        # 1. Pobieranie transakcji
        # ----------------------------------
        print("DEBUG: Próba pobrania transakcji z bazy...")
        try:
            response = (
                supabase
                .table('Transactions')
                .select('*')
                .eq('transaction_id', str(transaction_id))
                .single()
                .execute()
            )
            print("DEBUG: Odpowiedź z supabase (GET):", response)
        except Exception as err:
            print("DEBUG: Błąd podczas pobierania transakcji:", err)
            return Response({"error": str(err)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        # Jeżeli w odpowiedzi brak data (None lub pusty), to transakcja nie istnieje
        if not response.data:
            print("DEBUG: Brak transakcji o podanym ID w bazie")
            return Response({"error": "Transakcja nie znaleziona"}, status=HTTP_404_NOT_FOUND)

        transaction = response.data
        print("DEBUG: Pobrana transakcja:", transaction)

        # ----------------------------------
        # 2. (Opcjonalnie) sprawdzenie właściciela
        # ----------------------------------
        print("DEBUG: Sprawdzam właściciela transakcji...")
        if str(transaction['transaction_owner']) != str(request.user.id):
            print("DEBUG: Użytkownik nie jest właścicielem transakcji!")
            return Response({"error": "Brak dostępu do tej transakcji"}, status=HTTP_403_FORBIDDEN)
        print("DEBUG: Użytkownik jest właścicielem transakcji.")

        # ----------------------------------
        # 3. Obsługa metod GET / PUT / DELETE
        # ----------------------------------
        if request.method == 'GET':
            print("DEBUG: Obsługa metody GET - zwracam szczegóły transakcji.")
            return Response({"transaction": transaction}, status=HTTP_200_OK)

        if request.method == 'PUT':
            print("DEBUG: Obsługa metody PUT - aktualizacja transakcji.")
            data = json.loads(request.body)
            print("DEBUG: Otrzymane dane JSON:", data)
            updated_transaction = {
                'transaction_amount': data.get('amount', transaction['transaction_amount']),
                'transaction_category_id': data.get('categoryId', transaction['transaction_category_id']),
                'transaction_payment_method': data.get('paymentMethod', transaction['transaction_payment_method']),
                'transaction_type': data.get('transactionType', transaction['transaction_type']),
                'transaction_status': data.get('status', transaction['transaction_status']),
                'transcation_data': data.get('date', transaction['transcation_data']),
                'transaction_description': data.get('description', transaction['transaction_description']),
                'transaction_currency': data.get('currency', transaction['transaction_currency']),
            }
            print("DEBUG: Zbudowany obiekt updated_transaction:", updated_transaction)
            try:
                update_resp = (
                    supabase
                    .table('Transactions')
                    .update(updated_transaction)
                    .eq('transaction_id', str(transaction_id))
                    .execute()
                )
                print("DEBUG: Odpowiedź z supabase (PUT):", update_resp)
            except Exception as err:
                print("DEBUG: Błąd podczas aktualizacji transakcji:", err)
                return Response({"error": str(err)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

            if not update_resp.data:
                # Nic nie zaktualizowano
                print("DEBUG: Nic nie zostało zaktualizowane (update_resp.data jest puste).")
                return Response({"message": "Zaktualizowano 0 rekordów."}, status=HTTP_200_OK)

            print("DEBUG: Transakcja została pomyślnie zaktualizowana.")
            return Response({"message": "Transakcja zaktualizowana pomyślnie"}, status=HTTP_200_OK)

        if request.method == 'DELETE':
            print("DEBUG: Obsługa metody DELETE - usuwanie transakcji.")
            try:
                print("DEBUG: wchodzę w DELETE, wysyłam zapytanie do bazy...")
                delete_resp = (
                    supabase
                    .table('Transactions')
                    .delete()
                    .eq('transaction_id', str(transaction_id))
                    .execute()
                )
                print("DEBUG: supabase DELETE zapytanie poszło, oto wynik:")
                print("DEBUG delete_resp:", delete_resp)
            except Exception as err:
                print("DEBUG: Błąd podczas usuwania transakcji:", err)
                return Response({"error": str(err)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

            # if not delete_resp.data:
            #     print("DEBUG: Nie usunięto żadnego rekordu (delete_resp.data puste).")
            #     return Response({"message": "Nie usunięto żadnego rekordu."}, status=HTTP_200_OK)

            print("DEBUG: Transakcja została pomyślnie usunięta.")
            return Response({"message": "Transakcja usunięta pomyślnie"}, status=HTTP_200_OK)

        # Jeśli ktoś wywoła inną metodę, zwracamy 405
        return Response({"error": "Method not allowed"}, status=405)

    except Exception as e:
        print("Błąd ogólny:", e)
        return Response({"error": str(e)}, status=HTTP_500_INTERNAL_SERVER_ERROR)
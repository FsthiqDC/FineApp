# Importy modułów Django, DRF oraz narzędzi pomocniczych
from django.contrib.auth import authenticate  # Funkcja służąca do uwierzytelniania użytkownika
from django.shortcuts import render  # Służy do renderowania szablonów (HTML)
from django.http import JsonResponse  # Umożliwia zwracanie odpowiedzi JSON
from django.middleware.csrf import get_token  # Pobiera token CSRF
from django.contrib.auth.decorators import login_required  # Dekorator sprawdzający, czy użytkownik jest zalogowany
from django.views.decorators.csrf import csrf_exempt  # Dekorator wyłączający weryfikację CSRF

# Kolejne importy (niektóre powtórzone, warto je zredukować w optymalnej wersji)
from django.contrib.auth.decorators import login_required
from supabase import create_client, Client  # Import klienta Supabase do komunikacji z bazą danych
from datetime import datetime, timedelta  # Importy klasy datetime oraz timedelta do operacji na datach
from django.http import JsonResponse  # Powtórzony import (można usunąć duplikat)
from django.views.decorators.csrf import csrf_exempt  # Powtórzony import CSRF
from datetime import datetime  # Powtórzony import datetime
from django.conf import settings  # Import ustawień Django
from rest_framework.decorators import api_view, permission_classes  # Dekoratory DRF do obsługi widoków API
from rest_framework.status import HTTP_200_OK, HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR,  HTTP_404_NOT_FOUND, HTTP_201_CREATED, HTTP_400_BAD_REQUEST, HTTP_405_METHOD_NOT_ALLOWED  # Stałe statusów HTTP
from rest_framework.permissions import IsAuthenticated  # Dekorator uprawnień - sprawdza, czy użytkownik jest uwierzytelniony
from rest_framework.authentication import TokenAuthentication  # Klasa uwierzytelniania tokenem (jeśli potrzebna)
from rest_framework.response import Response  # Obiekt odpowiedzi DRF
import jwt, os, json, bcrypt, logging, re, calendar, uuid  # Importy bibliotek: jwt, os, json, bcrypt, logging, re, calendar, uuid
from datetime import datetime  # Kolejny powtórzony import datetime
from isoweek import Week  # Import biblioteki do obsługi tygodni ISO (przydatna do obliczeń dat)

# Konfiguracja loggera do rejestrowania zdarzeń
logger = logging.getLogger(__name__)

# Inicjalizacja klienta Supabase – pobieranie adresu URL oraz klucza z zmiennych środowiskowych
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Pobranie klucza sekretnego Django (do generowania tokenów JWT) z zmiennych środowiskowych
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcnNtZGVnYnpxamNzcnh2eWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTAyMzksImV4cCI6MjA1MTA2NjIzOX0.r9GbGA8I0hfO9yqEif8jEOGQzvfJ_WvRD2i4YLU2rdM')

# -----------------------------------------------------------------------------
# Funkcja: categories_view
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categories_view(request):
    """
    Widok zwracający listę kategorii z tabeli 'Categories'.
    Wymaga poprawnego tokena JWT w nagłówku Authorization.
    """
    # Pobranie nagłówka Authorization
    auth_header = request.headers.get('Authorization')
    print("🔑 Nagłówek Authorization:", auth_header)

    # Sprawdzenie, czy nagłówek zawiera token
    if not auth_header:
        return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

    try:
        # Podział nagłówka na prefiks i token
        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        # Dekodowanie tokena JWT przy użyciu SUPABASE_KEY
        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        # Walidacja pobranego user_id
        if not user_id or not isinstance(user_id, str):
            return Response({"error": "Nieprawidłowy identyfikator użytkownika"}, status=HTTP_403_FORBIDDEN)

        print("✅ Token poprawny. Pobieranie kategorii...")

        # Wykonanie zapytania do Supabase, pobranie wszystkich rekordów z tabeli 'Categories'
        response = supabase.table('Categories').select('*').execute()

        # Jeśli dane zostały pobrane, zwróć je
        if response.data:
            categories = response.data
            return Response({"categories": categories}, status=HTTP_200_OK)
        
        # Jeśli wystąpił błąd podczas zapytania do Supabase, zwróć błąd serwera
        if response.error:
            print(f"❌ Błąd Supabase: {response.error}")
            return Response({"error": f"Błąd pobierania kategorii: {response.error}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        # Domyślna odpowiedź, gdy nie udało się pobrać danych
        return Response({"error": "Nie udało się pobrać kategorii"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    # Obsługa błędu, gdy token wygasł
    except jwt.ExpiredSignatureError:
        return Response({"error": "Token wygasł"}, status=HTTP_403_FORBIDDEN)
    # Obsługa błędu przy nieprawidłowym tokenie
    except jwt.InvalidTokenError:
        return Response({"error": "Nieprawidłowy token"}, status=HTTP_403_FORBIDDEN)
    # Ogólna obsługa pozostałych wyjątków
    except Exception as e:
        print(f"❌ Wystąpił błąd: {e}")
        return Response({"error": f"Błąd serwera: {e}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: home_view
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_view(request):
    """
    Widok zwracający różne statystyki finansowe użytkownika na podstawie filtrów przekazanych jako parametry GET.
    Parametry:
      - year: rok (np. '2025')
      - month: miesiąc w formacie YYYY-MM (np. '2025-02')
      - chart: typ wykresu (np. 'weekly_averages' lub 'goals_status')
      - week: tydzień w formacie YYYY-WNN (np. '2025-W03')
    Dodatkowo zwraca: yearly_expenses, monthly_expenses, expense_categories, incomes_vs_expenses.
    """
    try:
        # Pobranie nagłówka Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

        # Rozdzielenie nagłówka na prefiks i token
        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        # Dekodowanie tokena JWT
        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        # Pobranie parametrów GET (filtry)
        year_str = request.GET.get('year')     # Przykładowo '2025'
        month_str = request.GET.get('month')   # Przykładowo '2025-02'
        chart_type = request.GET.get('chart')  # Przykładowo 'weekly_averages' lub 'goals_status'
        week_str = request.GET.get('week')     # Przykładowo '2025-W03'

        # Inicjalizacja struktury wynikowej
        results = {
            "yearly_expenses": [0]*12,        # Lista wydatków rocznych – indeks 0 odpowiada styczniowi
            "monthly_expenses": [0]*31,       # Lista wydatków miesięcznych – indeks 0 odpowiada pierwszemu dniu miesiąca
            "expense_categories": {},         # Słownik z wydatkami podzielonymi na kategorie
            "incomes_vs_expenses": {"incomes": [0]*12, "expenses": [0]*12}  # Porównanie przychodów i wydatków
        }

        # Pobieranie transakcji użytkownika z tabeli 'Transactions'
        query = supabase.table('Transactions').select('*').eq('transaction_owner', user_id)

        # 1) Filtrowanie po tygodniu, jeśli parametr week_str został przekazany i wykres ma typ "weekly_averages"
        if week_str and chart_type == "weekly_averages":
            match = re.match(r"^(\d{4})-W(\d{2})$", week_str)
            if match:
                year_w = int(match.group(1))
                week_n = int(match.group(2))
                w = Week(year_w, week_n)  # Użycie biblioteki isoweek do obliczenia zakresu tygodnia
                start_of_week = w.monday().strftime("%Y-%m-%d")
                end_of_week   = w.sunday().strftime("%Y-%m-%d")
                query = query.gte('transcation_data', start_of_week).lte('transcation_data', end_of_week)

        # 2) Filtrowanie transakcji według roku
        if year_str:
            start_of_year = f"{year_str}-01-01"
            end_of_year   = f"{year_str}-12-31"
            query = query.gte('transcation_data', start_of_year).lte('transcation_data', end_of_year)

        # 3) Filtrowanie transakcji według miesiąca
        if month_str:
            try:
                y_m, m_m = month_str.split('-')
                _, last_day = calendar.monthrange(int(y_m), int(m_m))
                start_of_month = f"{y_m}-{m_m}-01"
                end_of_month   = f"{y_m}-{m_m}-{last_day}"
                query = query.gte('transcation_data', start_of_month).lte('transcation_data', end_of_month)
            except:
                pass  # W przypadku błędu w parsowaniu miesiąca nie wykonujemy filtrowania

        # Wykonanie zapytania do Supabase
        transactions_response = query.execute()
        transactions = transactions_response.data or []

        # Pobranie listy kategorii z tabeli 'Categories'
        cat_resp = supabase.table('Categories').select('*').execute()
        categories_data = cat_resp.data or []
        # Utworzenie mapy: klucz = category_id, wartość = category_name
        categories_map = {c['category_id']: c['category_name'] for c in categories_data}

        # Agregacja danych transakcji
        if transactions:
            yearly_expenses = [0]*12
            monthly_expenses = [0]*31
            expense_categories = {}
            incomes_vs_expenses = {"incomes": [0]*12, "expenses": [0]*12}

            # Iteracja po każdej transakcji
            for t in transactions:
                amount = t['transaction_amount']
                date_str = t['transcation_data']
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")  # Konwersja ciągu na obiekt datetime
                m_index = date_obj.month - 1  # Indeks miesiąca (0-11)
                d_index = date_obj.day - 1    # Indeks dnia (0-30)

                # Sprawdzamy, czy transakcja jest wydatkiem
                if t['transaction_type'] == 'Wydatek':
                    yearly_expenses[m_index] += amount  # Dodanie do sumy miesięcznej
                    if d_index < 31:
                        monthly_expenses[d_index] += amount  # Dodanie do sumy dziennej
                    # Pobranie nazwy kategorii lub ustawienie domyślnej nazwy, jeśli nie znaleziono
                    cat_name = categories_map.get(t['transaction_category_id'], "Nieznana kategoria")
                    expense_categories[cat_name] = expense_categories.get(cat_name, 0) + amount
                    incomes_vs_expenses['expenses'][m_index] += amount
                else:
                    # Jeśli transakcja nie jest wydatkiem, zakładamy, że jest przychodem
                    incomes_vs_expenses['incomes'][m_index] += amount

            # Aktualizacja wynikowej struktury danych
            results["yearly_expenses"] = yearly_expenses
            results["monthly_expenses"] = monthly_expenses
            results["expense_categories"] = expense_categories
            results["incomes_vs_expenses"] = incomes_vs_expenses

        # Dodatkowy wykres: średnie wydatki tygodniowe
        weekly_averages = [0]*7
        if chart_type == "weekly_averages" and transactions:
            counts = [0]*7  # Liczba transakcji dla każdego dnia tygodnia
            for t in transactions:
                if t['transaction_type'] == 'Wydatek':
                    date_obj = datetime.strptime(t['transcation_data'], "%Y-%m-%d")
                    dow = date_obj.weekday()  # Dzień tygodnia: 0 = poniedziałek, 6 = niedziela
                    weekly_averages[dow] += t['transaction_amount']
                    counts[dow] += 1
            # Obliczenie średniej wydatków dla każdego dnia tygodnia
            for i in range(7):
                if counts[i] > 0:
                    weekly_averages[i] /= counts[i]

        # Dodatkowa logika: status celów oszczędnościowych
        goals_status_data = None
        if chart_type == "goals_status":
            # Pobranie celów z tabeli SavingsGoals dla danego użytkownika
            goals_query = supabase.table('SavingsGoals').select('*').eq('savingsgoals_owner_id', user_id)
            # Możliwość filtrowania celów według roku lub daty (zakomentowany przykład)
            # if year_str:
            #     start_of_year = f"{year_str}-01-01"
            #     end_of_year   = f"{year_str}-12-31"
            #     goals_query = goals_query.gte('created_at', start_of_year).lte('created_at', end_of_year)
            goals_resp = goals_query.execute()
            if goals_resp.data:
                all_goals = goals_resp.data
                # Liczenie celów ukończonych oraz aktywnych
                completed_count = sum(1 for g in all_goals if g['savingsgoals_status'] == 'Ukończony')
                active_count    = sum(1 for g in all_goals if g['savingsgoals_status'] != 'Ukończony')
                goals_status_data = {"completed": completed_count, "active": active_count}

        # Przygotowanie końcowej struktury odpowiedzi
        data_to_return = {
            "yearly_expenses": results["yearly_expenses"],
            "monthly_expenses": results["monthly_expenses"],
            "expense_categories": results["expense_categories"],
            "incomes_vs_expenses": results["incomes_vs_expenses"],
        }
        # Dodanie wykresu średnich tygodniowych, jeśli wymagane
        if chart_type == "weekly_averages":
            data_to_return["weekly_averages"] = weekly_averages
        # Dodanie statusu celów oszczędnościowych, jeśli wymagane
        if chart_type == "goals_status" and goals_status_data is not None:
            data_to_return["goals_status"] = goals_status_data

        return Response(data_to_return, status=HTTP_200_OK)

    except Exception as e:
        logger.exception("Błąd w home_view:")
        return Response({"error": f"Błąd serwera: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: login_user
# -----------------------------------------------------------------------------
@csrf_exempt
def login_user(request):
    """
    Funkcja logowania użytkownika.
    Oczekuje metody POST z danymi: 'email' i 'password'.
    Po poprawnym uwierzytelnieniu generuje token JWT oraz aktualizuje datę ostatniego logowania.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Metoda nieobsługiwana"}, status=HTTP_405_METHOD_NOT_ALLOWED)

    try:
        # Parsowanie danych z ciała żądania (JSON)
        body = json.loads(request.body)
        email = body.get('email')
        password = body.get('password')

        # Walidacja: email i hasło muszą być podane
        if not email or not password:
            return JsonResponse({"error": "Email i hasło są wymagane"}, status=HTTP_400_BAD_REQUEST)

        # Pobranie użytkownika z tabeli App_Users w Supabase
        response = supabase.table('App_Users').select('*').eq('user_email', email).single().execute()
        user = response.data

        # Jeśli użytkownik nie został znaleziony
        if not user:
            return JsonResponse({"error": "Nieprawidłowy email lub hasło"}, status=401)

        # Sprawdzenie hasła przy użyciu bcrypt
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return JsonResponse({"error": "Nieprawidłowe hasło"}, status=401)

        # Generowanie tokena JWT z danymi użytkownika oraz datą wygaśnięcia
        payload = {
            'user_id': user['user_id'],
            'username': user['username'],
            'user_type': user['user_type'],
            'exp': datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        print("🔑 Wygenerowany token:", token)
        # Aktualizacja daty ostatniego logowania użytkownika
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

# -----------------------------------------------------------------------------
# Funkcja: get_user
# -----------------------------------------------------------------------------
@login_required
def get_user(request):
    """
    Funkcja zwracająca podstawowe informacje o zalogowanym użytkowniku.
    Używa mechanizmu Django auth (login_required).
    """
    return JsonResponse({
        "username": request.user.username,
        "user_type": request.user.user_type
    })

# -----------------------------------------------------------------------------
# Funkcja: csrf_view
# -----------------------------------------------------------------------------
def csrf_view(request):
    """
    Funkcja zwracająca token CSRF, który może być użyty w żądaniach AJAX.
    """
    token = get_token(request)
    return JsonResponse({'csrfToken': token})

# -----------------------------------------------------------------------------
# Funkcja: login_view
# -----------------------------------------------------------------------------
def login_view(request):
    """
    Prosty widok logowania przy użyciu funkcji authenticate Django.
    Używany głównie jako przykładowy widok.
    """
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        user = authenticate(request, username=email, password=password)
        if user is not None:
            return JsonResponse({'message': 'Zalogowano pomyślnie!'}, status=HTTP_200_OK)
        else:
            return JsonResponse({'message': 'Nieprawidłowe dane logowania.'}, status=HTTP_400_BAD_REQUEST)
    return JsonResponse({'message': 'Nieobsługiwana metoda.'}, status=HTTP_405_METHOD_NOT_ALLOWED)

# -----------------------------------------------------------------------------
# Funkcja: register_view
# -----------------------------------------------------------------------------
@csrf_exempt
def register_view(request):
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Walidacja wymaganych pól
            required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
            for field in required_fields:
                if field not in data or not data[field]:
                    return JsonResponse({'message': f'Brak wymaganego pola: {field}'}, status=HTTP_400_BAD_REQUEST)
            
            # Sprawdzenie, czy użytkownik z podanym emailem już istnieje
            response = supabase.from_('App_Users').select('user_email').eq('user_email', data['email']).execute()
            if response.data and len(response.data) > 0:
                return JsonResponse({'message': 'Użytkownik z tym adresem email już istnieje'}, status=HTTP_400_BAD_REQUEST)

            # Hashowanie hasła przy użyciu bcrypt
            hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Tworzenie nowego użytkownika w Supabase
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

            return JsonResponse({'message': '✅ Użytkownik został utworzony pomyślnie'}, status=HTTP_201_CREATED)
        
        except json.JSONDecodeError:
            return JsonResponse({'message': 'Błąd dekodowania JSON'}, status=HTTP_400_BAD_REQUEST)
        except Exception as e:
            return JsonResponse({'message': f'Wystąpił błąd: {str(e)}'}, status=500)

    return JsonResponse({'message': 'Nieobsługiwana metoda'}, status=HTTP_405_METHOD_NOT_ALLOWED)

# -----------------------------------------------------------------------------
# Funkcja: transactions_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def transactions_view(request):
    """
    Widok obsługujący listę transakcji:
      - GET: zwraca transakcje zalogowanego użytkownika z paginacją i możliwością filtrowania po miesiącu.
      - POST: umożliwia dodanie nowej transakcji.
    """
    print(f"DEBUG: Wywołano transactions_view z metodą {request.method}")
    try:
        # Pobranie identyfikatora zalogowanego użytkownika
        user_id = str(request.user.id)
        print("DEBUG: Ustalono user_id =", user_id)

        if request.method == 'GET':
            print("DEBUG: Obsługa metody GET - pobieranie transakcji użytkownika.")
            try:
                # Pobranie parametrów paginacji i filtrowania
                page = int(request.GET.get('page', 1))       # Numer strony
                per_page = int(request.GET.get('per_page', 10))  # Liczba elementów na stronę
                month = request.GET.get('month')            # Opcjonalny filtr po miesiącu (YYYY-MM)

                # Zapytanie do Supabase o transakcje należące do użytkownika
                query = supabase.from_('Transactions').select('*').eq('transaction_owner', user_id)

                # Jeśli podano filtr po miesiącu, obliczamy zakres dat
                if month:
                    # Rozdzielenie roku i miesiąca
                    year, month_number = map(int, month.split('-'))
                    _, last_day = calendar.monthrange(year, month_number)
                    start_date = f"{year}-{month_number:02d}-01"
                    end_date = f"{year}-{month_number:02d}-{last_day}"
                    # Dodanie warunków filtrowania do zapytania
                    query = query.gte('transcation_data', start_date).lte('transcation_data', end_date)              

                # Wykonanie zapytania
                response = query.execute()
                print("DEBUG: Odpowiedź z supabase (GET):", response)

                # Sprawdzenie, czy odpowiedź zawiera dane
                if not response or not hasattr(response, 'data'):
                    print("DEBUG: Nieoczekiwana odpowiedź od serwera bazy danych (brak 'data').")
                    return Response({'error': 'Nieoczekiwana odpowiedź od serwera bazy danych.'}, status=500)

                transactions = response.data

                # Implementacja prostej paginacji
                total_transactions = len(transactions)
                start = (page - 1) * per_page
                end = start + per_page
                paginated_transactions = transactions[start:end]

                print("DEBUG: Zwracam listę transakcji z paginacją.")
                return Response({
                    'transactions': paginated_transactions,
                    'total_pages': (total_transactions + per_page - 1) // per_page,
                    'current_page': page,
                }, status=HTTP_200_OK)

            except Exception as e:
                print("DEBUG: Błąd podczas pobierania transakcji:", e)
                return Response({'error': f'Błąd serwera: {str(e)}'}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        elif request.method == 'POST':
            print("DEBUG: Obsługa metody POST - dodawanie nowej transakcji.")
            try:
                # Parsowanie danych JSON z ciała żądania
                data = json.loads(request.body)
                print("DEBUG: Otrzymane dane JSON (POST):", data)
                # Budowanie słownika nowej transakcji
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

                # Wstawienie nowej transakcji do Supabase
                insert_resp = supabase.from_('Transactions').insert(new_transaction).execute()
                print("DEBUG: Odpowiedź z supabase (POST):", insert_resp)

                print("DEBUG: Nowa transakcja została pomyślnie dodana.")
                # Przykładowo zwracamy także przykładowe ID transakcji
                return Response({'transaction': new_transaction, 'transaction_id': 123}, status=HTTP_201_CREATED)

            except Exception as e:
                print("DEBUG: Błąd przy odczytywaniu/parsowaniu danych POST:", e)
                return Response({'error': str(e)}, status=500)

        print(f"DEBUG: Metoda {request.method} nieobsługiwana.")
        return Response({"error": "Method Not Allowed"}, status=HTTP_405_METHOD_NOT_ALLOWED)

    except Exception as e:
        print("DEBUG: Błąd ogólny w transactions_view:", e)
        return Response({"error": str(e)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: transaction_detail_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def transaction_detail_view(request, transaction_id):
    """
    Widok umożliwiający:
      - GET: Pobranie szczegółowych informacji o konkretnej transakcji.
      - PUT: Aktualizację danych transakcji.
      - DELETE: Usunięcie transakcji.
    Transakcja jest identyfikowana przez unikalny identyfikator (UUID).
    """
    print(f"DEBUG: Wywołano transaction_detail_view z metodą {request.method} i ID = {transaction_id}")
    try:
        # ----------------------------------
        # 1. Pobieranie transakcji z bazy
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

        # Sprawdzenie, czy transakcja została znaleziona
        if not response.data:
            print("DEBUG: Brak transakcji o podanym ID w bazie")
            return Response({"error": "Transakcja nie znaleziona"}, status=HTTP_404_NOT_FOUND)

        transaction = response.data
        print("DEBUG: Pobrana transakcja:", transaction)

        # ----------------------------------
        # 2. Weryfikacja właściciela transakcji
        # ----------------------------------
        print("DEBUG: Sprawdzam właściciela transakcji...")
        if str(transaction['transaction_owner']) != str(request.user.id):
            print("DEBUG: Użytkownik nie jest właścicielem transakcji!")
            return Response({"error": "Brak dostępu do tej transakcji"}, status=HTTP_403_FORBIDDEN)
        print("DEBUG: Użytkownik jest właścicielem transakcji.")

        # ----------------------------------
        # 3. Obsługa metod: GET / PUT / DELETE
        # ----------------------------------
        if request.method == 'GET':
            print("DEBUG: Obsługa metody GET - zwracam szczegóły transakcji.")
            return Response({"transaction": transaction}, status=HTTP_200_OK)

        if request.method == 'PUT':
            print("DEBUG: Obsługa metody PUT - aktualizacja transakcji.")
            data = json.loads(request.body)
            print("DEBUG: Otrzymane dane JSON:", data)
            # Budowanie słownika z aktualizowanymi polami; jeśli dane nie są przesłane, używamy istniejących wartości
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
                # Jeżeli żadna zmiana nie została wprowadzona
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

            print("DEBUG: Transakcja została pomyślnie usunięta.")
            return Response({"message": "Transakcja usunięta pomyślnie"}, status=HTTP_200_OK)

        # Jeśli metoda nie jest obsługiwana, zwróć błąd 405
        return Response({"error": "Method not allowed"}, status=HTTP_405_METHOD_NOT_ALLOWED)

    except Exception as e:
        print("Błąd ogólny:", e)
        return Response({"error": str(e)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: user_profile_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Widok obsługujący pobieranie (GET) oraz aktualizację (PUT) danych profilu użytkownika.
    Oczekujemy, że dane będą przesyłane pod kluczami: 'username', 'first_name', 'last_name' oraz 'user_email'.
    """
    try:
        # Konwertujemy identyfikator użytkownika do stringa – to może być przyczyną niedopasowania, jeżeli typy nie są zgodne
        user_id = str(request.user.id)
        logger.debug("User ID: %s", user_id)

        if request.method == 'GET':
            try:
                user_response = supabase.table('App_Users')\
                    .select('*')\
                    .eq('user_id', user_id)\
                    .single()\
                    .execute()
                logger.debug("GET response: %s", user_response)
                user_data = user_response.data

                if not user_data:
                    return Response(
                        {"error": "Nie znaleziono użytkownika w bazie danych."},
                        status=HTTP_404_NOT_FOUND
                    )

                return Response({
                    "user_id": user_data['user_id'],
                    "username": user_data['username'],  # zakładamy, że kolumna nazywa się "username"
                    "user_email": user_data['user_email'],
                    "first_name": user_data.get('first_name', ''),
                    "last_name": user_data.get('last_name', ''),
                    "created_at": user_data.get('created_at', ''),
                    "last_login": user_data.get('last_login', ''),
                    "is_active": user_data.get('is_active', False),
                    "langauge": user_data.get('langauge', ''),
                    "currency": user_data.get('currency', ''),
                }, status=HTTP_200_OK)
            except Exception as e:
                logger.debug("Błąd podczas pobierania danych (GET): %s", e)
                return Response(
                    {"error": "Błąd podczas pobierania danych."},
                    status=HTTP_500_INTERNAL_SERVER_ERROR
                )

        elif request.method == 'PUT':
            try:
                data = request.data
                logger.debug("PUT payload: %s", data)
                updated_fields = {
                    "username": data.get('username'),
                    "first_name": data.get('first_name'),
                    "last_name": data.get('last_name'),
                    "user_email": data.get('user_email'),
                }
                updated_fields = {k: v for k, v in updated_fields.items() if v is not None}
                logger.debug("Updated fields: %s", updated_fields)

                update_response = supabase.table('App_Users')\
                    .update(updated_fields)\
                    .eq('user_id', user_id)\
                    .execute()
                logger.debug("Update response: %s", update_response)

                if update_response.error:
                    logger.debug("Update error: %s", update_response.error)
                    return Response(
                        {"error": "Nie udało się zaktualizować danych."},
                        status=HTTP_500_INTERNAL_SERVER_ERROR
                    )

                return Response(
                    {"message": "Dane użytkownika zostały zaktualizowane."},
                    status=HTTP_200_OK
                )
            except Exception as e:
                logger.debug("Wyjątek podczas aktualizacji danych (PUT): %s", e)
                return Response(
                    {"error": "Wyjątek podczas aktualizacji danych."},
                    status=HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {"error": "Metoda nie jest obsługiwana."},
                status=HTTP_405_METHOD_NOT_ALLOWED
            )
    except Exception as e:
        logger.debug("Generalny wyjątek: %s", e)
        return Response(
            {"error": "Generalny błąd."},
            status=HTTP_500_INTERNAL_SERVER_ERROR
        )

# -----------------------------------------------------------------------------
# Funkcja: savings_goals_list_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def savings_goals_list_view(request):
    """
    Widok obsługujący listę celów oszczędnościowych (GET) oraz tworzenie nowego celu (POST).
    Tabela: 'SavingsGoals'. Oczekiwane pola zgodnie z Twoją strukturą:
      - savingsgoals_id (uuid)
      - savingsgoals_owner_id (uuid)
      - savingsgoals_name (text)
      - savingsgoals_target_amount (float8)
      - savingsgoals_amount (float8) – domyślnie 0
      - savingsgoals_status (text) – np. 'Aktywny'
      - savingsgoals_currency (text)
    """
    # Weryfikacja tokena JWT z nagłówka
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

    try:
        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
    except Exception as e:
        return Response({"error": f"Błąd autoryzacji: {str(e)}"}, status=HTTP_403_FORBIDDEN)

    # GET: Pobranie listy celów oszczędnościowych
    if request.method == 'GET':
        try:
            goals_response = supabase.table('SavingsGoals').select('*').eq('savingsgoals_owner_id', user_id).execute()
            if not goals_response or not hasattr(goals_response, 'data'):
                return Response({"goals": []}, status=HTTP_200_OK)

            goals_data = goals_response.data or []
            return Response({"goals": goals_data}, status=HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Błąd podczas pobierania celów: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    # POST: Tworzenie nowego celu oszczędnościowego
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            print("DEBUG: Otrzymane od frontendu:", body)

            new_goal = {
                "savingsgoals_owner_id": user_id,
                "savingsgoals_name": body.get('savingsgoals_name'),
                "savingsgoals_target_amount": float(body.get('savingsgoals_target_amount', 0.0)),
                "savingsgoals_amount": 0.0,
                "savingsgoals_status": "Aktywny",
                "savingsgoals_currency": body.get('savingsgoals_currency', 'PLN'),
            }
            print("DEBUG: Tworzony obiekt new_goal:", new_goal)

            insert_resp = supabase.table('SavingsGoals').insert(new_goal).execute()
            print("DEBUG: insert_resp =", insert_resp)

            # Sprawdzenie, czy odpowiedź z Supabase zawiera dane
            if not insert_resp or not hasattr(insert_resp, 'data'):
                return Response({"error": "Nieoczekiwana odpowiedź od Supabase."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

            if not insert_resp.data:
                return Response({"error": "Błąd podczas wstawiania rekordu."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

            # Jeśli operacja przebiegła pomyślnie, zwracamy komunikat sukcesu
            return Response({"message": "Cel został pomyślnie dodany."}, status=HTTP_201_CREATED)

        except Exception as e:
            print("DEBUG: Wyjątek przy tworzeniu celu:", str(e))
            return Response({"error": f"Błąd podczas tworzenia celu: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: savings_goals_detail_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def savings_goals_detail_view(request, goal_id):
    """
    Widok obsługujący operacje na pojedynczym celu oszczędnościowym:
      - GET: Pobranie szczegółów celu.
      - PATCH: Aktualizacja wybranych pól celu.
      - DELETE: Usunięcie celu.
    Zakładamy, że struktura rekordu jest zgodna z opisem w dokumentacji.
    """
    # -------------------- AUTORYZACJA + SPRAWDZENIE CELU --------------------
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({"error": "Brak tokena autoryzacyjnego"}, status=HTTP_403_FORBIDDEN)

        prefix, token = auth_header.split(' ')
        if prefix.lower() != 'bearer':
            return Response({"error": "Nieprawidłowy prefiks tokena"}, status=HTTP_403_FORBIDDEN)

        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        # Pobranie celu z tabeli SavingsGoals i sprawdzenie, czy cel należy do użytkownika
        goal_resp = supabase.table('SavingsGoals').select('*').eq('SavingsGoals_id', goal_id).single().execute()
        if not goal_resp.data:
            return Response({"error": "Cel nie istnieje."}, status=HTTP_404_NOT_FOUND)

        goal_data = goal_resp.data
        if goal_data['savingsgoals_owner_id'] != user_id:
            return Response({"error": "Brak dostępu do tego celu."}, status=HTTP_403_FORBIDDEN)

    except Exception as e:
        return Response({"error": f"Błąd autoryzacji lub pobierania celu: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    # -------------------- OBSŁUGA METOD --------------------
    if request.method == 'GET':
        # Zwracamy dane celu
        return Response({"goal": goal_data}, status=HTTP_200_OK)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body)
            update_fields = {}

            # Aktualizacja poszczególnych pól celu, jeśli zostały przesłane
            if 'savingsgoals_name' in body:
                update_fields['savingsgoals_name'] = body['savingsgoals_name']
            if 'savingsgoals_target_amount' in body:
                update_fields['savingsgoals_target_amount'] = float(body['savingsgoals_target_amount'])
            if 'savingsgoals_amount' in body:
                update_fields['savingsgoals_amount'] = float(body['savingsgoals_amount'])
            if 'savingsgoals_status' in body:
                update_fields['savingsgoals_status'] = body['savingsgoals_status']
            if 'savingsgoals_currency' in body:
                update_fields['savingsgoals_currency'] = body['savingsgoals_currency']

            if not update_fields:
                return Response({"error": "Brak pól do aktualizacji."}, status=HTTP_400_BAD_REQUEST)

            # Wysłanie zapytania aktualizującego rekord w Supabase
            supabase.table('SavingsGoals').update(update_fields).eq('SavingsGoals_id', goal_id).execute()

            return Response({"message": "Cel zaktualizowany pomyślnie."}, status=HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Błąd aktualizacji: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    if request.method == 'DELETE':
        try:
            # Wysłanie zapytania usuwającego rekord w Supabase
            supabase.table('SavingsGoals').delete().eq('SavingsGoals_id', goal_id).execute()
            return Response({"message": "Cel usunięty pomyślnie."}, status=HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Błąd usuwania: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    # Jeśli metoda nie jest obsługiwana, zwróć błąd
    return Response({"error": "Method not allowed"}, status=405)

# -----------------------------------------------------------------------------
# Funkcja: categorybudgets_view
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categorybudgets_view(request):
    """
    Widok obsługujący budżety kategorii.
    Dla danego miesiąca (parametr ?month=YYYY-MM) sprawdza, czy użytkownik posiada już budżety.
    Jeśli nie, tworzy nowe budżety (ustawione na limit 0) dla każdej kategorii.
    Następnie dołącza dodatkowe informacje:
      - category_name: nazwa kategorii
      - spent: suma wydatków w danym miesiącu
      - percentUsed: procent wykorzystania limitu
      - diffLastMonth: różnica w wydatkach w porównaniu z poprzednim miesiącem
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({"error": "Brak tokena"}, status=HTTP_403_FORBIDDEN)

        prefix, token = auth_header.split()
        if prefix.lower() != 'bearer':
            return Response({"error": "Zły prefix"}, status=HTTP_403_FORBIDDEN)

        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            return Response({"error": "Nieprawidłowy token (brak user_id)"}, status=HTTP_403_FORBIDDEN)

        # Pobranie parametru miesiąca w formacie YYYY-MM
        month_param = request.GET.get('month')
        if not month_param:
            now = datetime.now()
            month_param = now.strftime("%Y-%m")

        # 1) Sprawdzenie, czy budżety dla danego miesiąca już istnieją
        bud_resp = (supabase.table('CategoryBudgets')
                    .select('*')
                    .eq('categorybudget_user_id', user_id)
                    .eq('categorybudget_month', month_param)
                    .execute())
        existing_budgets = bud_resp.data or []

        # 2) Jeśli nie, tworzymy budżety dla każdej kategorii (limit ustawiony na 0)
        if not existing_budgets:
            cat_resp = supabase.table('Categories').select('*').execute()
            categories_data = cat_resp.data or []

            new_budgets = []
            for cat in categories_data:
                new_budgets.append({
                    "categorybudget_id": str(uuid.uuid4()),
                    "categorybudget_user_id": user_id,
                    "categorybudget_category_id": cat['category_id'],
                    "categorybudget_month": month_param,
                    "categorybudget_limit_amount": 0.0,
                    "categorybudget_currency": "PLN",
                    "notify_exceed": False
                })

            if new_budgets:
                supabase.table('CategoryBudgets').insert(new_budgets).execute()
                # Ponowne pobranie budżetów po utworzeniu
                bud_resp = (supabase.table('CategoryBudgets')
                            .select('*')
                            .eq('categorybudget_user_id', user_id)
                            .eq('categorybudget_month', month_param)
                            .execute())

        budgets_data = bud_resp.data or []

        # 3) Mapowanie identyfikatorów kategorii do nazw
        cat_resp = supabase.table('Categories').select('*').execute()
        cats_data = cat_resp.data or []
        cat_map = {c['category_id']: c.get('category_name', 'Nieznana kategoria') for c in cats_data}

        # 4) Doklejanie dodatkowych danych do każdego budżetu
        for b in budgets_data:
            cat_id = b['categorybudget_category_id']
            limit_ = b.get('categorybudget_limit_amount', 0.0)

            # Dodanie nazwy kategorii
            b['category_name'] = cat_map.get(cat_id, 'Nieznana kategoria')

            # Obliczenie wydatków w danym miesiącu dla danej kategorii
            y_s, m_s = month_param.split('-')
            year_i = int(y_s)
            month_i = int(m_s)
            last_day = calendar.monthrange(year_i, month_i)[1]
            start_date = f"{year_i}-{month_i:02d}-01"
            end_date   = f"{year_i}-{month_i:02d}-{last_day}"

            trans_resp = (
                supabase.table('Transactions')
                .select('*')
                .eq('transaction_owner', user_id)
                .eq('transaction_category_id', cat_id)
                .eq('transaction_type', 'Wydatek')
                .gte('transcation_data', start_date)
                .lte('transcation_data', end_date)
                .execute()
            )
            trans_data = trans_resp.data or []
            spent = sum(t['transaction_amount'] for t in trans_data)
            b['spent'] = spent

            # Obliczenie procentu wykorzystania limitu (jeśli limit > 0)
            if limit_ > 0:
                b['percentUsed'] = (spent / limit_) * 100.0
            else:
                b['percentUsed'] = 0.0

            # Obliczenie różnicy wydatków w stosunku do poprzedniego miesiąca
            prev_month = month_i - 1
            prev_year = year_i
            if prev_month <= 0:
                prev_month += 12
                prev_year -= 1
            last_day_prev = calendar.monthrange(prev_year, prev_month)[1]
            start_date_prev = f"{prev_year}-{prev_month:02d}-01"
            end_date_prev   = f"{prev_year}-{prev_month:02d}-{last_day_prev}"
            trans_resp_prev = (
                supabase.table('Transactions')
                .select('*')
                .eq('transaction_owner', user_id)
                .eq('transaction_category_id', cat_id)
                .eq('transaction_type', 'Wydatek')
                .gte('transcation_data', start_date_prev)
                .lte('transcation_data', end_date_prev)
                .execute()
            )
            trans_data_prev = trans_resp_prev.data or []
            spent_prev = sum(t['transaction_amount'] for t in trans_data_prev)
            diff_last_month = spent - spent_prev
            b['diffLastMonth'] = diff_last_month

        return Response({"budgets": budgets_data}, status=200)

    except Exception as e:
        logger.exception("Błąd w categorybudgets_view:")
        return Response({"error": str(e)}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: categorybudget_detail_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def categorybudget_detail_view(request, budget_id):
    """
    Widok obsługujący pobranie (GET) lub aktualizację (PATCH) pojedynczego budżetu określonego przez budget_id.
    """
    try:
        # Wykorzystujemy request.user, który jest ustawiony dzięki IsAuthenticated
        user_id = str(request.user.id)
    except Exception:
        return Response({"error": "Błąd autoryzacji."}, status=HTTP_403_FORBIDDEN)

    try:
        # W jednym zapytaniu pobieramy budżet, filtrując po id budżetu i id użytkownika
        b_resp = (
            supabase.table('CategoryBudgets')
            .select('*')
            .eq('categorybudget_id', budget_id)
            .eq('categorybudget_user_id', user_id)
            .single()
            .execute()
        )
        if not b_resp.data:
            return Response({"error": "Budżet nie istnieje lub brak dostępu."}, status=HTTP_404_NOT_FOUND)
        b_data = b_resp.data

        if request.method == 'GET':
            return Response({"budget": b_data}, status=HTTP_200_OK)

        elif request.method == 'PATCH':
            body = request.data
            update_fields = {}

            # Aktualizacja tylko przesłanych pól
            if 'categorybudget_limit_amount' in body:
                try:
                    update_fields['categorybudget_limit_amount'] = float(body['categorybudget_limit_amount'])
                except (ValueError, TypeError):
                    return Response({"error": "Nieprawidłowa wartość limitu."}, status=HTTP_400_BAD_REQUEST)
            if 'categorybudget_currency' in body:
                update_fields['categorybudget_currency'] = body['categorybudget_currency']
            if 'notify_exceed' in body:
                update_fields['notify_exceed'] = bool(body['notify_exceed'])

            if not update_fields:
                return Response({"error": "Brak pól do aktualizacji."}, status=HTTP_400_BAD_REQUEST)

            update_resp = (
                supabase.table('CategoryBudgets')
                .update(update_fields)
                .eq('categorybudget_id', budget_id)
                .eq('categorybudget_user_id', user_id)
                .execute()
            )
            # Możemy dodatkowo sprawdzić update_resp, jeśli to konieczne.
            return Response({"message": "Zaktualizowano budżet."}, status=HTTP_200_OK)

        else:
            return Response({"error": "Method Not Allowed"}, status=HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"error": f"Błąd: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: reminders_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reminders_view(request):
    """
    Widok obsługujący przypomnienia:
      - GET: Pobiera wszystkie przypomnienia użytkownika.
      - POST: Tworzy nowe przypomnienie.
    """
    try:
        logger.debug(f"Wywołano reminders_view z metodą {request.method}")
        # --- Authorization: Weryfikacja tokena ---
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.warning("Brak tokena w nagłówkach.")
            return Response({"error": "Brak tokena"}, status=HTTP_403_FORBIDDEN)

        try:
            prefix, token = auth_header.split()
            if prefix.lower() != 'bearer':
                logger.warning("Zły prefix w tokenie autoryzacji.")
                return Response({"error": "Zły prefix"}, status=HTTP_403_FORBIDDEN)
        except ValueError as e:
            logger.warning(f"Zły format tokena: {e}")
            return Response({"error": f"Zły format tokena: {str(e)}"}, status=HTTP_403_FORBIDDEN)

        try:
            payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                logger.error("Nieprawidłowy token (brak user_id).")
                return Response({"error": "Nieprawidłowy token (brak user_id)"}, status=HTTP_403_FORBIDDEN)
        except jwt.ExpiredSignatureError:
            logger.warning("Token wygasł.")
            return Response({"error": "Token wygasł"}, status=HTTP_403_FORBIDDEN)
        except jwt.InvalidTokenError as e:
            logger.warning(f"Nieprawidłowy token: {e}")
            return Response({"error": f"Nieprawidłowy token: {str(e)}"}, status=HTTP_403_FORBIDDEN)

        # --- Obsługa żądania GET ---
        if request.method == 'GET':
            try:
                resp = (
                    supabase.table('Reminders')
                    .select('*')
                    .eq('reminder_user_id', user_id)
                    .execute()
                )
                if resp.data is None:
                    logger.error(f"Błąd pobierania przypomnień: {resp}")
                    return Response({"error": "Nie udało się pobrać przypomnień."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

                data = resp.data or []
                return Response({"reminders": data}, status=HTTP_200_OK)
            except Exception as e:
                logger.exception(f"Błąd podczas pobierania przypomnień: {e}")
                return Response({"error": f"Błąd podczas pobierania przypomnień: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        # --- Obsługa żądania POST ---
        elif request.method == 'POST':
            try:
                body = request.data

                # Walidacja wymaganych pól przypomnienia
                reminder_title = body.get('reminder_title')
                reminder_frequency = body.get('reminder_frequency')
                reminder_next_date = body.get('reminder_next_date')

                if not reminder_title:
                    logger.warning("Brakuje pola reminder_title.")
                    return Response({"error": "Pole reminder_title jest wymagane."}, status=HTTP_400_BAD_REQUEST)
                if not reminder_frequency:
                    logger.warning("Brakuje pola reminder_frequency.")
                    return Response({"error": "Pole reminder_frequency jest wymagane."}, status=HTTP_400_BAD_REQUEST)
                if not reminder_next_date:
                    logger.warning("Brakuje pola reminder_next_date.")
                    return Response({"error": "Pole reminder_next_date jest wymagane."}, status=HTTP_400_BAD_REQUEST)

                reminder_description = body.get('reminder_description', '')
                reminder_is_active = body.get('reminder_is_active', True)

                # Logowanie otrzymanych danych
                logger.debug(f"Received POST data: {body}")

                # Budowanie obiektu nowego przypomnienia
                new_reminder = {
                    "reminder_id": str(uuid.uuid4()),
                    "reminder_user_id": user_id,
                    "reminder_title": reminder_title,
                    "reminder_description": reminder_description,
                    "reminder_frequency": reminder_frequency,
                    "reminder_next_date": reminder_next_date,
                    "reminder_is_active": reminder_is_active,
                    "reminder_created_at": datetime.utcnow().isoformat(),  # Data utworzenia przypomnienia
                }

                # Logowanie obiektu przypomnienia przed wstawieniem do bazy
                logger.debug(f"Inserting reminder into Supabase: {new_reminder}")

                # Próba wstawienia przypomnienia do Supabase
                ins = supabase.table('Reminders').insert(new_reminder).execute()

                # Weryfikacja, czy operacja zakończyła się sukcesem
                if ins.data is None or not ins.data:
                    logger.error(f"Błąd przy dodawaniu przypomnienia: {ins}")
                    return Response({"error": "Nie udało się dodać przypomnienia."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

                logger.info(f"Przypomnienie zostało pomyślnie dodane: {ins.data}")
                return Response({"message": "Przypomnienie zostało pomyślnie dodane."}, status=HTTP_201_CREATED)

            except Exception as e:
                logger.exception(f"Błąd podczas obsługi żądania POST: {e}")
                return Response({"error": f"Błąd podczas dodawania przypomnienia: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            logger.warning(f"Metoda {request.method} nie jest obsługiwana.")
            return Response({"error": "Metoda nie jest dozwolona."}, status=HTTP_405_METHOD_NOT_ALLOWED)

    except Exception as e:
        logger.exception("Nieoczekiwany błąd w reminders_view.")
        return Response({"error": f"Nieoczekiwany błąd: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: reminder_detail_view
# -----------------------------------------------------------------------------
@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def reminder_detail_view(request, reminder_id):
    """
    Widok obsługujący operacje na pojedynczym przypomnieniu:
      - GET: Pobranie szczegółowych danych przypomnienia.
      - PATCH: Aktualizacja wybranych pól przypomnienia.
      - DELETE: Usunięcie przypomnienia.
    """
    try:
        logger.debug(f"Wywołano reminder_detail_view z metodą {request.method} dla ID: {reminder_id}")

        # --- Authorization: Weryfikacja tokena ---
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.warning("Brak tokena w nagłówkach.")
            return Response({"error": "Brak tokena"}, status=HTTP_403_FORBIDDEN)

        try:
            prefix, token = auth_header.split()
            if prefix.lower() != 'bearer':
                logger.warning("Zły prefix w tokenie autoryzacji.")
                return Response({"error": "Zły prefix"}, status=HTTP_403_FORBIDDEN)
        except ValueError as e:
            logger.warning(f"Zły format tokena: {e}")
            return Response({"error": f"Zły format tokena: {str(e)}"}, status=HTTP_403_FORBIDDEN)

        try:
            payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                logger.error("Nieprawidłowy token (brak user_id).")
                return Response({"error": "Nieprawidłowy token (brak user_id)"}, status=HTTP_403_FORBIDDEN)
        except jwt.ExpiredSignatureError:
            logger.warning("Token wygasł.")
            return Response({"error": "Token wygasł"}, status=HTTP_403_FORBIDDEN)
        except jwt.InvalidTokenError as e:
            logger.warning(f"Nieprawidłowy token: {e}")
            return Response({"error": f"Nieprawidłowy token: {str(e)}"}, status=HTTP_403_FORBIDDEN)

        # --- Pobranie przypomnienia z bazy ---
        try:
            single = (
                supabase.table('Reminders')
                .select('*')
                .eq('reminder_id', reminder_id)
                .single()
                .execute()
            )
            if not single.data:
                logger.error(f"Przypomnienie o ID {reminder_id} nie istnieje.")
                return Response({"error": "Przypomnienie nie istnieje"}, status=HTTP_404_NOT_FOUND)

            reminder = single.data
            # Weryfikacja, czy przypomnienie należy do zalogowanego użytkownika
            if reminder['reminder_user_id'] != user_id:
                logger.warning(f"Użytkownik {user_id} próbuje uzyskać dostęp do przypomnienia {reminder_id}, które nie jest jego.")
                return Response({"error": "Brak dostępu do tego przypomnienia"}, status=HTTP_403_FORBIDDEN)

        except Exception as e:
            logger.exception(f"Błąd podczas pobierania przypomnienia {reminder_id}: {e}")
            return Response({"error": f"Błąd podczas pobierania przypomnienia: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        # --- Obsługa metod ---
        if request.method == 'GET':
            return Response({"reminder": reminder}, status=HTTP_200_OK)

        elif request.method == 'PATCH':
            try:
                body = request.data
                update_fields = {}
                # Aktualizacja pól przypomnienia, jeśli zostały przesłane
                if 'reminder_title' in body:
                    update_fields['reminder_title'] = body['reminder_title']
                if 'reminder_description' in body:
                    update_fields['reminder_description'] = body['reminder_description']
                if 'reminder_frequency' in body:
                    update_fields['reminder_frequency'] = body['reminder_frequency']
                if 'reminder_next_date' in body:
                    update_fields['reminder_next_date'] = body['reminder_next_date']
                if 'reminder_is_active' in body:
                    update_fields['reminder_is_active'] = body['reminder_is_active']

                logger.debug(f"Patchowanie przypomnienia {reminder_id} z danymi: {update_fields}")
                upd = (
                    supabase.table('Reminders')
                    .update(update_fields)
                    .eq('reminder_id', reminder_id)
                    .execute()
                )

                if upd.data is None or not upd.data:
                    logger.error(f"Błąd podczas aktualizacji przypomnienia {reminder_id}: {upd}")
                    return Response({"error": "Nie udało się zaktualizować przypomnienia."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

                logger.info(f"Przypomnienie {reminder_id} zostało pomyślnie zaktualizowane.")
                return Response({"message": "Zaktualizowano przypomnienie"}, status=HTTP_200_OK)

            except Exception as e:
                logger.exception(f"Błąd podczas aktualizacji przypomnienia {reminder_id}: {e}")
                return Response({"error": f"Błąd podczas aktualizacji przypomnienia: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        elif request.method == 'DELETE':
            try:
                logger.debug(f"Usuwanie przypomnienia {reminder_id}.")
                del_ = (
                    supabase.table('Reminders')
                    .delete()
                    .eq('reminder_id', reminder_id)
                    .execute()
                )

                if del_.data is None or not del_.data:
                    logger.error(f"Błąd podczas usuwania przypomnienia {reminder_id}: {del_}")
                    return Response({"error": "Nie udało się usunąć przypomnienia."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

                logger.info(f"Przypomnienie {reminder_id} zostało pomyślnie usunięte.")
                return Response({"message": "Usunięto przypomnienie"}, status=HTTP_200_OK)

            except Exception as e:
                logger.exception(f"Błąd podczas usuwania przypomnienia {reminder_id}: {e}")
                return Response({"error": f"Błąd podczas usuwania przypomnienia: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            logger.warning(f"Metoda {request.method} nie jest obsługiwana.")
            return Response({"error": "Metoda nie jest dozwolona."}, status=HTTP_405_METHOD_NOT_ALLOWED)

    except Exception as e:
        logger.exception("Nieoczekiwany błąd w reminder_detail_view:")
        return Response({"error": f"Nieoczekiwany błąd: {str(e)}"}, status=HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------------------------------------------
# Funkcja: reminders_notifications_view
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reminders_notifications_view(request):
    """
    Widok zwracający przypomnienia (aktywne), które są nadchodzące w ciągu 7 dni.
    Może być wykorzystywany do wyświetlania powiadomień w interfejsie użytkownika (np. w navbarze).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return Response({"error": "Brak tokena"}, status=403)
        prefix, token = auth_header.split()
        if prefix.lower() != 'bearer':
            return Response({"error": "Prefiks zły"}, status=403)

        payload = jwt.decode(token, SUPABASE_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        # Określenie zakresu dat: od dzisiejszej daty do 7 dni w przyszłość
        now_date = datetime.now().date()
        future_date = now_date + timedelta(days=7)
        resp = (
            supabase.table('reminders')
            .select('*')
            .eq('reminder_user_id', user_id)
            .eq('reminder_is_active', True)
            .gte('reminder_next_date', now_date.isoformat())
            .lte('reminder_next_date', future_date.isoformat())
            .execute()
        )
        data = resp.data or []
        return Response({"reminders": data}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

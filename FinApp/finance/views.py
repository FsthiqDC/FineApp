from django.contrib.auth import authenticate
from django.http import JsonResponse

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

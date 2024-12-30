from django.contrib.auth import authenticate
from django.shortcuts import render
from django.http import JsonResponse
from django.middleware.csrf import get_token
import json

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

def register_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name']
            )
            return JsonResponse({'message': 'Użytkownik został utworzony'}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)
    return JsonResponse({'message': 'Nieobsługiwana metoda'}, status=405)
import os
import secrets
import requests as http_requests  
from urllib.parse import urlencode  
from dotenv import load_dotenv  
from google.oauth2 import id_token
import google.auth.transport.requests as google_requests 
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
import hashlib
import base64


from TS_Users.models import User
from SSIO_API.jwt_utils import generate_jwt_token

import logging
logger = logging.getLogger(__name__)

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")



def hash_password(value):

    salt = os.urandom(16)
    
    value_salt_combined = value.encode('utf-8') + salt
    hashed_value = hashlib.sha256(value_salt_combined).hexdigest()

    stored_hash = base64.b64encode(salt + hashed_value.encode('utf-8')).decode('utf-8')
    
    return stored_hash


def verify_password(stored_hash, input_value):
   
    decoded = base64.b64decode(stored_hash)
    salt = decoded[:16] 
    stored_hashed_value = decoded[16:].decode('utf-8') 
    
   
    value_salt_combined = input_value.encode('utf-8') + salt
    hashed_input_value = hashlib.sha256(value_salt_combined).hexdigest()
    
    return hashed_input_value == stored_hashed_value

@csrf_protect
def login_view(request):
    context = {
        'show_pin_modal': False
    }

    if request.method == 'POST':
       
        if request.POST.get('ssio_username') and request.POST.get('password'):
            username = request.POST.get('ssio_username')
            password = request.POST.get('password')

            print(f"Received Username: {username}, Password: {password}")
            
            try:
                user = User.objects.get(ssio_username=username)
                print(f"User found: {user.ssio_username}")

                if verify_password(user.password, password):
                    request.session['ssio_id'] = user.ssio_id
                    request.session['ssio_fname'] = user.ssio_fname
                    request.session['ssio_lname'] = user.ssio_lname
                    request.session['users_role'] = user.access_type.role if user.access_type else 'User'
                    request.session['user_authenticated'] = True

                    print(f"Session set: ssio_id={user.ssio_id}, users_role={request.session['users_role']}")

                    context['show_pin_modal'] = True
                    return render(request, 'loginPage.html', context)
                else:
                    messages.error(request, "Invalid username or password.")
                    print("Invalid password.")
            except User.DoesNotExist:
                messages.error(request, "User not found.")
                print("User not found in database.")

     
        elif request.session.get('ssio_id') and request.POST.get('ssio_userpin'):
            entered_pin = request.POST.get('ssio_userpin')
            stored_ssio_id = request.session.get('ssio_id')
            
            try:
                user = User.objects.get(ssio_id=stored_ssio_id)
                
                if verify_password(user.ssio_userpin, entered_pin):
                    
                    jwt_token = generate_jwt_token(user.ssio_id)
                    request.session['jwt_token'] = jwt_token

                   
                    request.session['ssio_user_id'] = user.ssio_id
                    request.session['ssio_username'] = user.ssio_username
                    request.session['ssio_fname'] = user.ssio_fname 
                    request.session['ssio_lname'] = user.ssio_lname
                    request.session['ssio_email'] = user.ssio_email 
                    request.session['users_role'] = user.access_type.role if user.access_type else 'User'
                    request.session['user_authenticated'] = True

                
                    request.session.pop('ssio_id', None)
                    request.session.modified = True 

                    if not user.ssio_id:
                        messages.error(request, "User not authorized to access this system")
                        return redirect('ts_users:login')

               
                    user_role = user.access_type.role if user.access_type else 'User'
                    request.session['users_role'] = user_role
                    request.session.modified = True

                    if user_role == 'Admin':
                        return redirect('ts:Dashboard')  
                    else:
                        return redirect('ts_guard:Dashboard') 
                else:
                    messages.error(request, "Invalid PIN.")
                    context['show_pin_modal'] = True
                    return render(request, 'loginPage.html', context)
            except User.DoesNotExist:
                messages.error(request, "User not found.")
        return redirect('ts_users:login')

    return render(request, 'loginPage.html', context)


def google_login(request):

    state = secrets.token_urlsafe(32)

  
    request.session['google_oauth_state'] = state
    request.session.modified = True

    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'select_account consent',
        'state': state
    }
    google_auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
    return redirect(google_auth_url)


def google_callback(request):

    returned_state = request.GET.get('state')
    expected_state = request.session.pop('google_oauth_state', None)

    logger.debug("Callback received state:", returned_state)
    logger.debug("Expected state from session:", expected_state)

    if not expected_state or not returned_state or returned_state != expected_state:
        logger.warning("State mismatch or missing")
        messages.error(request, "Invalid or missing state. Possible CSRF attack.")
        return redirect('ts_users:login')

   
    code = request.GET.get('code')
    if not code:
        logger.error("No authorization code received")
        messages.error(request, "Authorization failed. No code provided.")
        return redirect('ts_users:login')

   
    load_dotenv()

    token_url = 'https://oauth2.googleapis.com/token'

    data = {
        'code': code,
        'client_id': os.getenv('GOOGLE_CLIENT_ID'),
        'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
        'redirect_uri': os.getenv('GOOGLE_REDIRECT_URI'),
        'grant_type': 'authorization_code',
    }

    try:
        response = http_requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        token_info = response.json()
    except http_requests.exceptions.RequestException as e:
        logger.error("Token exchange failed: %s", str(e))
        messages.error(request, f"Failed to connect to Google: {str(e)}")
        return redirect('ts_users:login')

    id_token_jwt = token_info.get('id_token')
    if not id_token_jwt:
        messages.error(request, "No ID token received from Google.")
        return redirect('ts_users:login')

  
    try:
        user_data = id_token.verify_oauth2_token(
            id_token_jwt,
            google_requests.Request(),
            audience=os.getenv('GOOGLE_CLIENT_ID')
        )

        if not user_data['iss'].endswith("accounts.google.com"):
            raise ValueError(f"Issuer not allowed: {user_data['iss']}")

    except ValueError as e:
        messages.error(request, f"Invalid ID token: {e}")
        return redirect('ts_users:login')

    ssio_email = user_data.get('email')
    if not ssio_email:
        messages.error(request, "Google did not return an email address.")
        return redirect('ts_users:login')

   
    try:
        user = User.objects.get(ssio_email=ssio_email)
    except User.DoesNotExist:
        messages.error(request, "This Google account is not registered in our system.")
        return redirect('ts_users:login')

  
    request.session['user_authenticated'] = True
    request.session['ssio_user_id'] = user.ssio_id
    request.session['ssio_username'] = user.ssio_username
    request.session['ssio_fname'] = user.ssio_fname
    request.session['ssio_lname'] = user.ssio_lname
    request.session['ssio_email'] = user.ssio_email
    request.session['users_role'] = user.access_type.role if user.access_type else 'User'
    request.session.modified = True

  
    jwt_token = generate_jwt_token(user.ssio_id)
    request.session['jwt_token'] = jwt_token

  
    if not user.ssio_id:
        messages.error(request, "User not authorized to access this system")
        return redirect('ts_users:login')
  
    user_role = user.access_type.role if user.access_type else 'User'
    request.session['users_role'] = user_role
    request.session.modified = True
    if user_role == 'Admin':
        return redirect('ts:Dashboard')  
    else:
        return redirect('ts_guard:Dashboard') 
import jwt
from datetime import datetime, timedelta
from django.conf import settings

def generate_jwt_token(user_id):
    payload = {
        'user_id': user_id,
        'role': 'SSIO',  # Set the role to SSIO as requested
        'exp': datetime.now() + timedelta(seconds=int(settings.JWT_EXPIRATION_DELTA))
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

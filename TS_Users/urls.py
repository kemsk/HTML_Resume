from django.urls import path
from . import views

app_name = 'ts_users'

urlpatterns = [
    path('login', views.login_view, name='login'),
    path('login/google/', views.google_login, name='google_login'),
    path('accounts/login/google/callback/', views.google_callback, name='google_callback'), 
]

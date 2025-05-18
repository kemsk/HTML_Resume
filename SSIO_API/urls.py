from django.urls import path
from . import views
from TS import drive_service

app_name = 'api'

urlpatterns = [
    path('<int:ticket_id>/get-ticket', views.get_ticket, name="TicketData"),
    path('change-active', views.active_year),
    path('check-acad-year/<int:acad_year_id>', views.acad_year_checker),
    path('<int:ticket_id>/update-status', views.update_status),
    path('<int:ticket_id>/get-status', views.get_status),
    path('<int:ticket_id>/get-image-url', drive_service.serve_drive_image)
]
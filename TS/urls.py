from django.urls import path
from . import views
from django.contrib.auth.views import LogoutView

app_name = 'ts'

urlpatterns = [
    path('logout', views.logout_view, name='logout'),
    path('dashboard', views.dashboard_view, name='Dashboard'),
    path('create-ticket', views.add_ticket, name="CreateTicket"),
    path('search-student', views.student_search, name="SearchStudent"),


    path('statistics', views.statistics_view, name="Statistics"),
    path('violation-types', views.violation_types_view, name="ViolationTypes"),
    path('my-statistics', views.user_statistics_view, name='UserStatisticsPage'),
    path('my-statistics/data', views.user_statistics_data, name='UserStatisticsData'),


    path('ticket/<int:ticket_id>/ticket-details', views.ticket_details_view, name="TicketDetails"),
    path('ticket/<int:ticket_id>/update/id-status', views.update_id_status, name="IDStatus"),
    path('profile/update/<int:ssio_id>', views.update_profile, name='UpdateProfile'),
    path('user-management', views.user_management_view, name="UserManagement"),
    path('user/create', views.create_user, name='CreateUser'),
    path('user/update/<int:ssio_id>', views.update_user, name='UpdateUser'),
    path('user/delete/<int:ssio_id>', views.delete_user, name='DeleteUser'),
]

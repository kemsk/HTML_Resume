from TS.models import *
from TS_Users.models import *
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
import jwt
from django.conf import settings

# Create your views here.
@csrf_exempt
def get_ticket(request, ticket_id):
    try:
        ticket = Ticket.objects.get(ticket_id=ticket_id)
        student = ticket.student
        acad_year = ticket.acad_year

        user = User.objects.get(pk=ticket.ssio_id)
        name = f"{user.ssio_lname}, {user.ssio_fname}"

        response_data = {
            'ticket': {
                'ticket_id': ticket.ticket_id,
                'uniform_violation': ticket.uniform_violation,
                'dress_code_violation': ticket.dress_code_violation,
                'id_violation': ticket.id_violation,
                'id_not_claimed_violation': ticket.id_not_claimed_violation,
                'ssio_id': name,
                'id_status': ticket.id_status,
                'ticket_status': ticket.ticket_status,
                'remarks': ticket.remarks,
                'photo_path': ticket.photo_path or '',
                'date_created': ticket.date_created,
                'date_validated': ticket.date_validated,
                'acad_year': acad_year.acad_year_id,
                'semester': ticket.semester,
                'student_id': student.student_id
            },
            'student': {
                'student_id': student.student_id,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'middle_name': student.middle_name
            }
        }

        return JsonResponse(response_data)

    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

def checktoken(token):
    auth_header = token
    if not auth_header.startswith('Bearer '):
        return False
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        if payload.get('role') != 'OSA':
            return False
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False
    return True

@csrf_exempt
def active_year(request):
    if request.method == "PATCH":
        token = request.headers.get('Authorization', '')
        if not checktoken(token):
            return JsonResponse({'success': False, 'error': 'Unauthorized: Role OSA required'}, status=403)
        try:
            data = json.loads(request.body)
            acad_year_id = data.get('acad_year_id')
            active = data.get('active')

            if acad_year_id is None:
                return JsonResponse({'success': False, 'error': 'Missing acad_year_id'}, status=400)

            AcademicYear.objects.update(active=False)

            acad_year = AcademicYear.objects.filter(acad_year_id=acad_year_id).first()
            
            if not acad_year:
                return JsonResponse({'success': False, 'error': 'Academic year not found'}, status=404)

            acad_year.active = True if active else False
            acad_year.save()

            return JsonResponse({'success': True})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
         
    if request.method == "POST":
        token = request.headers.get('Authorization', '')
        if not checktoken(token):
            return JsonResponse({'success': False, 'error': 'Unauthorized: Role OSA required'}, status=403)
        try:
            data = json.loads(request.body)
            
            acad_year_data = data.get('acad_year')
            acad_year_id = acad_year_data.get('acad_year_id')
            description = acad_year_data.get('description')
            year_start = acad_year_data.get('year_start')
            year_end = acad_year_data.get('year_end')
            semester = acad_year_data.get('semester')
            active = acad_year_data.get('active')

            active = bool(int(active))

            if active:
                AcademicYear.objects.update(active=False)

            AcademicYear.objects.create(
                acad_year_id = acad_year_id,
                description = description,
                year_start = year_start,
                year_end = year_end,
                semester = semester,
                active = active
            )
            
            return JsonResponse({'message': 'New Academic Year successfully saved', 'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == "DELETE":
        token = request.headers.get('Authorization', '')
        if not checktoken(token):
            return JsonResponse({'success': False, 'error': 'Unauthorized: Role OSA required'}, status=403)
        try:
            data = json.loads(request.body)
            acad_year_id = data.get('acad_year_id')

            acad_year = AcademicYear.objects.get(acad_year_id=acad_year_id)

            acad_year.delete()

            return JsonResponse({'success': True, 'message': 'Academic Year deleted successfully'})

        except AcademicYear.DoesNotExist:
            return JsonResponse({'error': 'Academic Year not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def acad_year_checker(request, acad_year_id):
    if request.method == "GET":
        token = request.headers.get('Authorization', '')
        if not checktoken(token):
            return JsonResponse({'success': False, 'error': 'Unauthorized: Role OSA required'}, status=403)
        try:
            # You already have acad_year_id from the URL — no need for request.body
            acad_year = AcademicYear.objects.filter(acad_year_id=acad_year_id).exists()

            if acad_year:
                return JsonResponse({'message': 'Already Exists', 'success': False})

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def update_status(request, ticket_id):
    if request.method == "PATCH":
        token = request.headers.get('Authorization', '')
        if not checktoken(token):
            return JsonResponse({'success': False, 'error': 'Unauthorized: Role OSA required'}, status=403)
        try:
            data = json.loads(request.body)
            id_status = data.get('id_status')
            ticket_status = data.get('ticket_status')
            id_violation = data.get('id_violation')
            uniform_violation = data.get('uniform_violation')
            dress_code_violation = data.get('dress_code_violation')
            id_not_claimed_violation = data.get('id_not_claimed_violation')
            id_returned_by = data.get('id_returned_by')
            id_returned_date = data.get('id_returned_date')
            date_validated = data.get('date_validated')

            ticket = Ticket.objects.get(pk=ticket_id)

            ticket.id_status = id_status
            ticket.ticket_status = ticket_status
            ticket.date_validated = date_validated
            ticket.dress_code_violation = dress_code_violation
            ticket.uniform_violation = uniform_violation
            ticket.id_not_claimed_violation = id_not_claimed_violation
            ticket.id_violation = id_violation
            ticket.id_returned_by = id_returned_by
            ticket.id_returned_date = id_returned_date
            ticket.save()
            return JsonResponse({'success': True, 'message': 'Ticket status updated successfully'})
        
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def get_status(request, ticket_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
        user = User.objects.get(pk=ticket.ssio_id)

        name = f'{user.ssio_lname}, {user.ssio_fname}'
        data = {
            'id_status': ticket.id_status,
            'ticket_status': ticket.ticket_status,
            'id_violation': ticket.id_violation,
            'uniform_violation': ticket.uniform_violation,
            'dress_code_violation': ticket.dress_code_violation,
            'id_not_claimed_violation': ticket.id_not_claimed_violation,
            'id_returned_by': ticket.id_returned_by,
            'id_returned_date': ticket.id_returned_date
        }
        return JsonResponse(data)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'No Ticket found'}, status=404)
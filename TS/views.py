from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib import messages
from django.db.models import Q
from django.core.paginator import Paginator
from datetime import datetime
from django.core.files.uploadedfile import InMemoryUploadedFile
from .models import *
from TS_Users.models import User, Role
from django.views.decorators.cache import never_cache
from .drive_service import upload_file_to_drive
import os, base64, io, hashlib, json, logging, traceback
from datetime import datetime, timedelta
from django.utils.timezone import now
from django.db.models import Count
from django.http import JsonResponse
from .models import Violation

logger = logging.getLogger(__name__)


def hash_password(value):
    salt = os.urandom(16)
    value_salt_combined = value.encode('utf-8') + salt
    hashed_value = hashlib.sha256(value_salt_combined).hexdigest()
    stored_hash = base64.b64encode(salt + hashed_value.encode('utf-8')).decode('utf-8')
    
    return stored_hash

def paginate_queryset(request, queryset, per_page):
    page_number = request.GET.get('page')
    paginator = Paginator(queryset, per_page)
    return paginator.get_page(page_number)

def active_list():
    return AcademicYear.objects.filter(active=1)



def require_admin(request):
    users_role = request.session.get('users_role')
    if users_role != 'Admin':
        request.session.flush()
        messages.error(request, "You must be an admin to access this page. Please log in as an admin.")
        return False
    return True

def require_personnel(request):
    users_role = request.session.get('users_role')
    if users_role != 'User':
        request.session.flush()
        messages.error(request, "You must be a personnel user to access this page. Please log in as a personnel user.")
        return False
    return True

@never_cache
def dashboard_view(request):
    # Enforce admin-only access
    if not require_admin(request):
        return redirect('ts_users:login') 

    ay_id = active_list()

    student_name = request.GET.get('student_name', '')
    student_id = request.GET.get('student_id', '')
    filter_date = request.GET.get('filter_date', '')

    tickets = Ticket.objects.filter(acad_year__in=ay_id)

    if student_name:
        name_terms = student_name.split()
        for term in name_terms:
            tickets = tickets.filter(
                Q(student__first_name__icontains=term) |
                Q(student__middle_name__icontains=term) |
                Q(student__last_name__icontains=term)
            )

    if student_id:
        tickets = tickets.filter(student__student_id__icontains=student_id)

    if filter_date:
        try:
            date_obj = datetime.strptime(filter_date, "%Y-%m-%d").date()
            tickets = tickets.filter(date_created__date=date_obj)
        except ValueError:
            pass

    tickets = tickets.order_by('-ticket_id')
    page_obj = paginate_queryset(request, tickets, 10)

    return render(request, 'system/dashboard.html', {'tickets': page_obj})


@never_cache
def add_ticket(request):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    if request.method == "POST":
        try:
            try:
                ay = AcademicYear.objects.get(active=1)
            except AcademicYear.DoesNotExist:
                return JsonResponse({'error': 'No active academic year set.'}, status=400)

            data = json.loads(request.body)

            ticket_id = data.get('ticket_id')
            violations = data.get('violations', [])
            remarks = data.get('remarks')
            student_id = data.get('student_id')
            fname = data.get('fname')
            mname = data.get('mname')
            lname = data.get('lname')
            college = data.get('college')
            course_year = data.get('course_year', '')  # Get the combined course and year
            
            # Parse course and year from the combined field (format: "COURSE - YEAR")
            course_parts = course_year.split(' - ') if course_year else []
            course = course_parts[0].strip() if len(course_parts) > 0 else ''
            year_level = int(course_parts[1]) if len(course_parts) > 1 and course_parts[1].isdigit() else 1

            # Handle base64 photo from JSON
            photo_file = None
            photo_base64 = data.get('photo')
            photo_name = data.get('photo_name')
            if photo_base64 and photo_name:
                photo_bytes = base64.b64decode(photo_base64)
                photo_file = InMemoryUploadedFile(
                    file=io.BytesIO(photo_bytes),
                    field_name='photo',
                    name=photo_name,
                    content_type='image/jpeg',  # You may want to detect content type
                    size=len(photo_bytes),
                    charset=None
                )

            if not all([ticket_id, student_id, fname, lname]):
                return JsonResponse({'error': 'Missing required fields.'}, status=400)

            if photo_file and not photo_file.content_type.startswith("image/"):
                return JsonResponse({'error': 'Only image files are allowed.'}, status=400)

            drive_file_id = None
            if photo_file:
                try:
                    drive_file_id = upload_file_to_drive(photo_file, f"ticket_{ticket_id}_{photo_file.name}")
                except Exception as e:
                    print("Drive upload failed:", str(e))
                    return JsonResponse({'error': f'Photo upload failed: {str(e)}'}, status=500)

            
            # Default values for student creation
            student_data = {
                'first_name': fname,
                'last_name': lname,
                'year_level': int(year_level) if year_level else 1  # Ensure year_level is an integer
            }
            
            # Only add middle_name if it exists
            if mname:
                student_data['middle_name'] = mname
                
            # Only add college and course if they exist and are not empty
            if college and college.strip():
                student_data['college'] = college.strip()
            if course and course.strip():
                student_data['course'] = course.strip()
            
            # Create or update the student
            student, created = Student.objects.update_or_create(
                student_id=student_id,
                defaults=student_data
            )

            # Check for all three violation types
            has_uniform_violation = 'uniform_violation' in violations
            has_dress_code_violation = 'dress_code_violation' in violations
            has_id_violation = 'id_violation' in violations
            
            # Check if any violation type is present
            has_violation = has_uniform_violation or has_dress_code_violation or has_id_violation
            
            # Set id_not_claimed_violation based on whether this student already has an unclaimed ID
            id_not_claimed = False
            # For any violation type, the ID is taken and needs to be claimed back
            if has_violation:  # If any violation exists
                # Check if this student already has any unclaimed ID
                existing_unclaimed = Ticket.objects.filter(
                    student_id=student_id,
                    id_status=0  # 0 means unclaimed
                ).exists()
                
                # Only set to True if no existing unclaimed ID for this student
                id_not_claimed = not existing_unclaimed
            
            Ticket.objects.create(
                ticket_id=ticket_id,
                uniform_violation=has_uniform_violation,
                dress_code_violation=has_dress_code_violation,
                id_violation=has_id_violation,
                id_not_claimed_violation=id_not_claimed,  # Only True for new students with ID violations
                ssio_id=request.session.get('ssio_user_id'),
                id_status=0,  # 0 means unclaimed
                ticket_status=0,
                remarks=remarks or "N/A",
                student= Student.objects.get(pk=student_id), 
                acad_year = AcademicYear.objects.get(pk=ay.acad_year_id),
                id_returned_by="",
                id_returned_date=None,
                photo_path=drive_file_id or "",
                date_created=datetime.now(),
                date_validated=None,
                semester=ay.semester
            )

            return JsonResponse({'message': 'Violation added successfully', 'success': True})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    # GET fallback
    last_ticket = Ticket.objects.order_by('-ticket_id').first()
    new_ticket_id = last_ticket.ticket_id + 1 if last_ticket else 1
    violations = Violation.objects.all()
    return render(request, 'system/addViolation.html', {
        'ticket_id': new_ticket_id,
        'violations': violations
    })

def student_search(request):
    if not require_admin(request):
        return redirect('ts_users:login') 
    return render(request, 'system/searchStudent.html') 

def statistics_view(request):
    if not require_admin(request):
        return redirect('ts_users:login') 
    return render(request, 'system/statistics.html') 

def violation_types_view(request):
    now = datetime.now()
    timeframe = request.GET.get('timeframe', 'day')
    queryset = Ticket.objects.all()

    # Filter queryset based on timeframe
    if timeframe == 'day':
        queryset = queryset.filter(date_created__date=now.date())
    elif timeframe == 'week':
        start_of_week = now - timedelta(days=now.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        queryset = queryset.filter(date_created__date__gte=start_of_week.date(), date_created__date__lte=end_of_week.date())
    elif timeframe == 'month':
        queryset = queryset.filter(date_created__year=now.year, date_created__month=now.month)
    elif timeframe == 'semester':
        ay = AcademicYear.objects.filter(active=1).first()
        if ay:
            queryset = queryset.filter(acad_year=ay, semester=ay.semester)

    # Count violation types
    uniform_violations = queryset.filter(uniform_violation=True).count()
    dress_code_violations = queryset.filter(dress_code_violation=True).count()
    id_violations = queryset.filter(id_violation=True).count()
    
    # Count unique students with unclaimed IDs - for any violation type
    unclaimed_ids = queryset.filter(id_status=0).values('student').distinct().count()
    
    # Count unique students who violated rules (total violators)
    total_violators = queryset.values('student').distinct().count()
    
    violation_counts = {
        'Uniform Violation': uniform_violations,
        'Dress Code Violation': dress_code_violations,
        'ID Violation': id_violations
    }
    
    # Keep ID Not Claimed as a separate value, not as a violation type

    # Prepare data for chart
    labels = list(violation_counts.keys())
    counts = list(violation_counts.values())

    return JsonResponse({
        'labels': labels,
        'counts': counts,
        'unclaimed_ids': unclaimed_ids,  # Send ID Not Claimed as a separate value
        'total_violators': total_violators  # Total number of unique students who violated rules
    })

@never_cache
def ticket_details_view(request, ticket_id):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    try:
        # Get the ticket with related student data
        ticket = Ticket.objects.select_related('student').get(ticket_id=ticket_id)
        student = ticket.student
        
        # Make sure we have default values for all fields
        student_data = {
            'student_id': student.student_id,
            'first_name': student.first_name or '',
            'last_name': student.last_name or '',
            'middle_name': student.middle_name or '',
            'college': student.college or 'Not Specified',
            'course': student.course or 'Not Specified',
            'year_level': student.year_level if student.year_level is not None else 1
        }
        
        user = User.objects.get(pk=ticket.ssio_id)
        reported_by = f'{user.ssio_lname}, {user.ssio_fname}'

        return render(request, 'system/ticket-details.html', {
            'ticket': ticket,
            'student': student_data,  # Pass the processed student data
            'violations': Violation.objects.all(),
            'reported_by': reported_by
        })
        
    except Ticket.DoesNotExist:
        messages.error(request, 'Ticket not found.')
        return redirect('ts:Dashboard')
    except Exception as e:
        messages.error(request, f'An error occurred: {str(e)}')
        return redirect('ts:Dashboard')

@never_cache
def update_id_status(request, ticket_id):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            new_status = data.get('status')
            user = User.objects.get(pk=request.session.get('ssio_user_id'))

            name = f'{user.ssio_lname}, {user.ssio_fname}'
            ticket = Ticket.objects.get(pk=ticket_id)
            
            # Update ID status
            ticket.id_status = new_status
            ticket.id_returned_by = name
            ticket.id_returned_date = datetime.now()
            
            # If ID is being returned (status changed from 0), update id_not_claimed_violation to False
            if new_status != 0 and ticket.id_violation:
                ticket.id_not_claimed_violation = False
                
            ticket.save()

            return JsonResponse({'message': 'ID Status updated successfully'})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        

@never_cache
def user_management_view(request):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    roles = Role.objects.all()
    users = User.objects.all()

    ssio_name = request.GET.get('ssio_name', '')
    ssio_id = request.GET.get('ssio_id', '')

    if ssio_name:
        users = users.filter(Q(ssio_fname__icontains=ssio_name) | Q(ssio_lname__icontains=ssio_name))
    if ssio_id:
        users = users.filter(ssio_id__icontains=ssio_id)

    context = {
        'users': users,
        'roles': roles,
    }

    return render(request, 'system/manageUsers.html', context)

@never_cache
def create_user(request):
    if not require_admin(request):
        return redirect('ts_users:login') 

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get('email')
            username = data.get('username')
            password = data.get('password')
            fname = data.get('fname')
            lname = data.get('lname')
            pin = data.get('pin')
            role = data.get('role')

            hashed_password = hash_password(password)
            hashed_pin = hash_password(pin)

            newUser = User.objects.create(
                ssio_username=username,
                ssio_email=email,
                ssio_fname=fname,
                ssio_lname=lname,
                password=hashed_password,
                ssio_userpin=hashed_pin,
                access_type_id=role  # Use _id if role is a foreign key ID
            )

            return JsonResponse({'message': f"User '{newUser.ssio_username}' created successfully."})

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON format.'}, status=400)
        except Exception as e:
            return JsonResponse({'message': f'Error: {str(e)}'}, status=500)

    return JsonResponse({'message': 'Invalid request method.'}, status=405)


@never_cache
def update_profile(request, ssio_id):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    if request.method == "POST":
        user = get_object_or_404(User, ssio_id=ssio_id)

        new_fname = request.POST.get("fname")
        if new_fname:
            user.ssio_fname = new_fname

        new_lname = request.POST.get("lname")
        if new_lname:
            user.ssio_lname = new_lname

        new_email = request.POST.get("email")
        if new_email:
            user.ssio_email = new_email


        new_password = request.POST.get("password")
        if new_password:
            user.password = hash_password(new_password)

        new_pin = request.POST.get("ssio_userpin")
        if new_pin:
            user.ssio_userpin = hash_password(new_pin)

        try:
            user.save()
            # Update session if the logged-in user was edited (e.g., by an admin)
            # Compare IDs as strings to avoid potential type mismatch issues
            if str(request.session.get('ssio_user_id')) == str(user.ssio_id):
                session_updated = False
                if request.session.get('ssio_fname') != user.ssio_fname:
                    request.session['ssio_fname'] = user.ssio_fname
                    session_updated = True
                if request.session.get('ssio_lname') != user.ssio_lname:
                    request.session['ssio_lname'] = user.ssio_lname
                    session_updated = True
                if request.session.get('ssio_email') != user.ssio_email:
                    request.session['ssio_email'] = user.ssio_email
                    session_updated = True

                role_updated_in_session = False
                # Make sure 'new_access_type' exists and is not None before trying to use it
                if 'new_access_type' in locals() and new_access_type is not None: 
                    try:
                        updated_role = Role.objects.get(id=int(new_access_type))
                        if request.session.get('users_role') != updated_role.role:
                           request.session['users_role'] = updated_role.role
                           role_updated_in_session = True
                    except (ValueError, Role.DoesNotExist):
                         messages.warning(request, f"Could not update role in session for user {user.ssio_id} - Invalid Role ID {new_access_type} provided.")
                
                if session_updated or role_updated_in_session:
                    request.session.modified = True # Ensure session is saved only if changed
            
            messages.success(request, "User details updated successfully.") # MODIFIED message
        except Exception as e:
            messages.error(request, f"Error updating user details: {str(e)}") # MODIFIED message

        return redirect("ts:UserManagement")

@never_cache
def update_user(request, ssio_id):
    if not require_admin(request):
        return redirect('ts_users:login') 

    if request.method == "PATCH":
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            fname = data.get('fname')
            lname = data.get('lname')
            email = data.get('email')
            role = data.get('role')

            user = User.objects.get(ssio_id=user_id)

            user.ssio_email = email
            user.access_type = Role.objects.get(pk=role)
            user.ssio_fname = fname
            user.ssio_lname = lname
            user.save()

            return JsonResponse({'success': True, 'message': 'User updated successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=400)

@never_cache
def delete_user(request, ssio_id):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    if request.method == 'DELETE':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')

            user = User.objects.get(ssio_id=user_id)
            username = user.ssio_username
            user.delete()

            return JsonResponse({'message': f"User '{username}' has been deleted successfully."}, status=200)

        except User.DoesNotExist:
            return JsonResponse({'message': 'User not found.'}, status=404)

        except json.JSONDecodeError:
            return JsonResponse({'message': 'Invalid JSON format.'}, status=400)

        except Exception as e:
            return JsonResponse({'message': f"An error occurred: {str(e)}"}, status=500)

    return JsonResponse({'message': 'Invalid request method. Use DELETE.'}, status=405)

@never_cache
def logout_view(request):
    if not require_admin(request):
        return redirect('ts_users:login') 
    
    request.session.flush()

    response = redirect('ts_users:login')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response



def search_by_drive_file_id(request):
    file_id = request.GET.get('file_id')
    if not file_id:
        return JsonResponse({'error': 'File ID not provided.'}, status=400)

    try:
        ticket = Ticket.objects.get(drive_file_id=file_id)
        data = {
            'ticket_id': ticket.ticket_id,
            'student_id': ticket.student.student_id,
            'student_name': f"{ticket.student.first_name} {ticket.student.last_name}",
            'remarks': ticket.remarks,
            'date_created': ticket.date_created,
            'drive_file_id': ticket.drive_file_id,
        }
        return JsonResponse({'ticket': data})
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'No ticket found for the provided file ID.'}, status=404)

def statistics(request):
    timeframe = request.GET.get('timeframe', 'day')
    start, end = get_timeframe_range(timeframe)
    count = Violation.objects.filter(date_committed__range=(start, end)).count()
    return JsonResponse({'count': count})

def violation_types(request):
    timeframe = request.GET.get('timeframe', 'day')
    start, end = get_timeframe_range(timeframe)

    queryset = Ticket.objects.filter(date_created__range=(start, end))

    labels = [
        'ID Violation',
        'Uniform Violation',
        'Dress Code Violation'
    ]

    counts = [
        queryset.filter(id_violation=True).count(),
        queryset.filter(uniform_violation=True).count(),
        queryset.filter(dress_code_violation=True).count()
    ]

    return JsonResponse({'labels': labels, 'counts': counts})


@never_cache
def user_statistics_view(request):
    if not request.session.get('ssio_user_id'):
        return redirect('ts_users:login')
    return render(request, 'system/user_statistics.html')


@never_cache
def user_statistics_data(request):
    if not request.session.get('ssio_user_id'):
        return JsonResponse({'error': 'Unauthorized'}, status=403)

    timeframe = request.GET.get('timeframe', 'day')
    ssio_user_id = request.session.get('ssio_user_id')

    today = now()
    if timeframe == 'day':
        start = today.replace(hour=0, minute=0, second=0)
    elif timeframe == 'week':
        start = today - timedelta(days=today.weekday())
        start = start.replace(hour=0, minute=0, second=0)
    elif timeframe == 'month':
        start = today.replace(day=1, hour=0, minute=0, second=0)
    elif timeframe == 'semester':
        start = datetime(today.year, 1 if today.month <= 6 else 7, 1, tzinfo=today.tzinfo)
    else:
        return JsonResponse({'error': 'Invalid timeframe'}, status=400)

    end = today

    # Get tickets issued by this user
    user_tickets = Ticket.objects.filter(ssio_id=ssio_user_id, date_created__range=(start, end))
    
    # Get all tickets in the system for the time period (regardless of who issued them)
    all_tickets = Ticket.objects.filter(date_created__range=(start, end))
    
    # Get current user's name
    from django.contrib.auth.models import User
    current_user = User.objects.filter(username=ssio_user_id).first()
    current_user_name = f"{current_user.first_name} {current_user.last_name}" if current_user else ssio_user_id
    
    # Get all users who have issued tickets in this time period
    all_users = Ticket.objects.filter(date_created__range=(start, end)).values('ssio_id').distinct()

    # Count statistics for all tickets in the system
    total_tickets = all_tickets.count()  # All tickets in the system
    ids_returned = all_tickets.exclude(id_returned_date=None).count()  # All returned IDs
    
    # Count unique students with unclaimed IDs (system-wide) - for any violation type
    ids_not_claimed = all_tickets.filter(id_status=0).values('student').distinct().count()

    # Count system-wide violations
    system_violation_counts = {
        'ID Violation': all_tickets.filter(id_violation=True).count(),
        'Uniform Violation': all_tickets.filter(uniform_violation=True).count(),
        'Dress Code Violation': all_tickets.filter(dress_code_violation=True).count()
    }
    
    # Keep ID Not Claimed as a separate value, not as a violation type
    
    # Collect statistics for all users
    all_users_stats = []
    for user_data in all_users:
        user_id = user_data['ssio_id']
        # Use the first name (fname) of the user
        try:
            # Try to get the user's first name from the SSIO model
            from TS.models import SSIO
            ssio_user = SSIO.objects.filter(ssio_id=user_id).first()
            if ssio_user and ssio_user.fname and ssio_user.fname.strip():
                user_name = ssio_user.fname  # Use the first name
            else:
                # If no SSIO user found, try to get from User model
                user = User.objects.filter(username=user_id).first()
                if user and user.first_name and user.first_name.strip():
                    user_name = user.first_name  # Use the first name from User model
                else:
                    # If no first name found, use the user_id
                    user_name = user_id
        except Exception as e:
            print(f"Error getting user's first name: {e}")
            user_name = user_id
        
        # Get tickets issued by this user
        user_tix = Ticket.objects.filter(ssio_id=user_id, date_created__range=(start, end))
        
        # Count violations by this user
        user_stats = {
            'user_id': user_id,
            'user_name': user_name,
            'total_tickets': user_tix.count(),
            'ID Violation': user_tix.filter(id_violation=True).count(),
            'Uniform Violation': user_tix.filter(uniform_violation=True).count(),
            'Dress Code Violation': user_tix.filter(dress_code_violation=True).count(),
        }
        all_users_stats.append(user_stats)
    
    # Count user-specific violations (tickets issued by current user)
    current_user_violation_counts = {
        'ID Violation': user_tickets.filter(id_violation=True).count(),
        'Uniform Violation': user_tickets.filter(uniform_violation=True).count(),
        'Dress Code Violation': user_tickets.filter(dress_code_violation=True).count(),
    }

    return JsonResponse({
        'total_tickets': total_tickets,
        'ids_returned': ids_returned,
        'violations': system_violation_counts,
        'ids_not_claimed': ids_not_claimed,  # Send ID Not Claimed as a separate value
        'user_violations': current_user_violation_counts,
        'current_user_name': current_user_name,
        'all_users': all_users_stats
    })
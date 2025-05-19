from django.db import models

# Create your models here.
class AcademicYear(models.Model):
    acad_year_id = models.IntegerField(primary_key=True)
    description = models.CharField(max_length=200)
    year_start = models.DateField()
    year_end = models.DateField()
    semester = models.IntegerField()
    active = models.BooleanField(default=False)

class Student(models.Model):
    student_id = models.IntegerField(primary_key=True)
    first_name = models.CharField(max_length=200)
    last_name = models.CharField(max_length=200)
    middle_name = models.CharField(max_length=200, blank=True)
    college = models.CharField(max_length=200)
    course = models.CharField(max_length=200)
    year_level = models.IntegerField()


class Violation(models.Model):
    violation_id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=200)

class Ticket(models.Model):
    ticket_id = models.IntegerField(primary_key=True)
    uniform_violation = models.BooleanField(default=0)
    dress_code_violation = models.BooleanField(default=0)
    id_violation = models.BooleanField(default=0)
    id_not_claimed_violation = models.BooleanField(default=0)
    ssio_id = models.IntegerField(blank=False)
    id_status = models.IntegerField(default=0)
    id_returned_by = models.CharField(max_length=200, blank=True, null=True)
    id_returned_date = models.DateTimeField(blank=True, null=True)
    ticket_status = models.IntegerField(default=0)
    remarks = models.CharField(max_length=200, blank=True, null=True)
    photo_path = models.CharField(max_length=200, blank=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_validated = models.DateTimeField(null=True, blank=True)
    semester = models.IntegerField(null=False, blank=False)

    acad_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)

    drive_file_id = models.CharField(max_length=200, blank=True, null=True)


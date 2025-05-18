from django.db import models

# Optional: Use this or just use int choices
class Role(models.Model):
    role = models.CharField(
        max_length=50, unique=True, choices=[('Admin', 'Admin'), ('User', 'User')]
    )

    def __str__(self):
        return self.role

# Main User Model
class User(models.Model):
    ssio_id = models.AutoField(primary_key=True)
    ssio_username = models.CharField(max_length=150, unique=True)
    ssio_email = models.EmailField(max_length=254, unique=True)
    ssio_fname = models.CharField(max_length=150)
    ssio_lname = models.CharField(max_length=150)
    password = models.CharField(max_length=128)
    ssio_userpin = models.CharField(max_length=128, blank=True, null=True)
    access_type = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.ssio_username

    def get_full_name(self):
        return f"{self.ssio_fname} {self.ssio_lname}"
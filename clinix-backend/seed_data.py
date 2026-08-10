import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinix.settings.dev")
django.setup()

from django.contrib.auth.models import User
from clinics.models import Clinic
from accounts.models import Staff
from patients.models import Patient
from appointments.models import Appointment

def seed():
    # 1. Create Clinic & Admin
    clinic_name = "Sunset Medical Center"
    admin_email = "admin@sunset.com"
    
    if not Clinic.objects.filter(slug="sunset-medical-center").exists():
        admin_user = User.objects.create_user(
            username=admin_email, email=admin_email, password="password123",
            first_name="Admin", last_name="User"
        )
        clinic = Clinic.objects.create(
            name=clinic_name, slug="sunset-medical-center",
            location="Nairobi, Kenya", phone="+254700000000", owner=admin_user
        )
        Staff.objects.create(user=admin_user, clinic=clinic, role="admin", phone="+254700000000")
        print("Created Clinic & Admin")
    else:
        clinic = Clinic.objects.get(slug="sunset-medical-center")
        print("Clinic already exists")

    # 2. Create Staff
    staff_data = [
        {"email": "dr.smith@sunset.com", "first_name": "John", "last_name": "Smith", "role": "doctor", "specialty": "Cardiology"},
        {"email": "dr.jane@sunset.com", "first_name": "Jane", "last_name": "Doe", "role": "doctor", "specialty": "Pediatrics"},
        {"email": "nurse.mary@sunset.com", "first_name": "Mary", "last_name": "Jane", "role": "nurse", "specialty": ""},
        {"email": "rec.paul@sunset.com", "first_name": "Paul", "last_name": "Paul", "role": "receptionist", "specialty": ""},
    ]

    for data in staff_data:
        if not User.objects.filter(email=data["email"]).exists():
            user = User.objects.create_user(
                username=data["email"], email=data["email"], password="password123",
                first_name=data["first_name"], last_name=data["last_name"]
            )
            Staff.objects.create(user=user, clinic=clinic, role=data["role"], specialty=data["specialty"], phone="+254711111111")
            print(f"Created staff: {data['email']}")

    # 3. Create Patients
    patient_data = [
        {"first_name": "Alice", "last_name": "Wonder", "phone": "+254722222222", "gender": "female"},
        {"first_name": "Bob", "last_name": "Builder", "phone": "+254733333333", "gender": "male"},
    ]

    for data in patient_data:
        if not Patient.objects.filter(phone=data["phone"]).exists():
            Patient.objects.create(clinic=clinic, **data)
            print(f"Created patient: {data['first_name']}")

    # 4. Create Appointments
    doctor = Staff.objects.filter(role="doctor").first()
    patient = Patient.objects.first()
    
    if not Appointment.objects.exists():
        now = timezone.now()
        Appointment.objects.create(
            clinic=clinic, patient=patient, doctor=doctor,
            scheduled_time=now + timedelta(hours=1),
            reason="Checkup", status="booked"
        )
        Appointment.objects.create(
            clinic=clinic, patient=patient, doctor=doctor,
            scheduled_time=now - timedelta(hours=1),
            reason="Follow up", status="completed"
        )
        print("Created appointments")

if __name__ == "__main__":
    seed()

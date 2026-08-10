from django.utils.text import slugify
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Clinic


class ClinicSignupSerializer(serializers.Serializer):
    """Creates a Clinic and its owner Staff (admin role) atomically."""

    # Clinic fields
    clinic_name = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255)
    clinic_phone = serializers.CharField(max_length=20)

    # Owner / admin user fields
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(max_length=20)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        from accounts.models import Staff

        # Create the Django user
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )

        # Generate a unique slug from the clinic name
        base_slug = slugify(validated_data["clinic_name"])
        slug = base_slug
        counter = 1
        while Clinic.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Create the clinic
        clinic = Clinic.objects.create(
            name=validated_data["clinic_name"],
            slug=slug,
            location=validated_data["location"],
            phone=validated_data["clinic_phone"],
            owner=user,
        )

        # Create the owner's Staff record with admin role
        Staff.objects.create(
            user=user,
            clinic=clinic,
            role="admin",
            phone=validated_data["phone"],
        )

        return clinic, user


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ["id", "name", "slug", "location", "phone", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "is_active", "created_at"]

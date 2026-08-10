from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "patient_id", "full_name", "first_name", "last_name", "phone", "dob", "age",
            "national_id", "gender", "email", "address",
            "emergency_contact_name", "emergency_contact_phone",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "patient_id", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age


class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for search results."""
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ["id", "patient_id", "full_name", "phone", "dob", "age", "gender", "national_id"]

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age


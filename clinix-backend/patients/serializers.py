from django.utils import timezone
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
            "consent_given", "consent_given_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "patient_id", "consent_given_at", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age

    def validate_consent_given(self, value):
        """Consent cannot be un-given once recorded."""
        if self.instance and self.instance.consent_given and not value:
            raise serializers.ValidationError("Consent cannot be revoked through this endpoint.")
        return value

    def create(self, validated_data):
        if validated_data.get("consent_given") and not validated_data.get("consent_given_at"):
            validated_data["consent_given_at"] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Stamp consent_given_at only on first consent
        if validated_data.get("consent_given") and not instance.consent_given:
            validated_data["consent_given_at"] = timezone.now()
        return super().update(instance, validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for search results."""
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id", "patient_id", "full_name", "phone", "dob", "age",
            "gender", "national_id", "consent_given",
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age

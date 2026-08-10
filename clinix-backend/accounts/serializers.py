from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Staff


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Staff
        fields = ["id", "staff_id", "user", "full_name", "email", "role", "specialty", "phone", "is_active", "created_at"]
        read_only_fields = ["id", "staff_id", "created_at"]

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class StaffInviteSerializer(serializers.Serializer):
    """Admin-only: create a new staff member and their User account."""
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    role = serializers.ChoiceField(choices=Staff.ROLE_CHOICES)
    specialty = serializers.CharField(max_length=100, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Cannot invite another admin via this endpoint.")
        return value

    def create(self, validated_data):
        clinic = self.context["clinic"]
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        staff = Staff.objects.create(
            user=user,
            clinic=clinic,
            role=validated_data["role"],
            phone=validated_data["phone"],
            specialty=validated_data.get("specialty", ""),
        )
        return staff


class MeSerializer(serializers.ModelSerializer):
    """Returns the current user's profile + role info."""
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    clinic_name = serializers.SerializerMethodField()
    clinic_id = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = ["id", "staff_id", "full_name", "email", "role", "specialty", "phone", "clinic_name", "clinic_id"]

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.name

    def get_clinic_id(self, obj):
        return obj.clinic.id

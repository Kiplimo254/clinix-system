from rest_framework import serializers
from .models import Shift, Leave

class ShiftSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    role = serializers.CharField(source='staff.role', read_only=True)
    
    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ('clinic', 'checked_in_at', 'checked_out_at')

class LeaveSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    
    class Meta:
        model = Leave
        fields = '__all__'

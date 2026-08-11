from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, LeaveViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'leave', LeaveViewSet, basename='leave')

urlpatterns = [
    path('', include(router.urls)),
]

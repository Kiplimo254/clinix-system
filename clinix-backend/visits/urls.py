from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitRecordViewSet, PaymentViewSet, DiagnosisAccessRequestViewSet

router = DefaultRouter()
router.register(r"visit-records", VisitRecordViewSet, basename="visit-record")
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"diagnosis-access-requests", DiagnosisAccessRequestViewSet, basename="diagnosis-access")

urlpatterns = [
    path("", include(router.urls)),
]

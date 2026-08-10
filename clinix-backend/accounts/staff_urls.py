from django.urls import path
from .staff_views import StaffInviteView, StaffListView, StaffDetailView

urlpatterns = [
    path("", StaffListView.as_view(), name="staff-list"),
    path("invite/", StaffInviteView.as_view(), name="staff-invite"),
    path("<int:pk>/", StaffDetailView.as_view(), name="staff-detail"),
]

from django.urls import path
from .views import AlertCreateView, AlertListView

urlpatterns = [
    path("",        AlertListView.as_view(),   name="alert-list"),
    path("create/", AlertCreateView.as_view(), name="alert-create"),
]

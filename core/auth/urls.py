from django.urls import path
from django.urls import include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import CustomTokenObtainPairView, CustomTokenRefreshView

urlpatterns = [
    path("", include("djoser.urls")),
    path("", include("djoser.urls.jwt")),
    path('login/', CustomTokenObtainPairView.as_view(), name='jwt-create'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='jwt-refresh'),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    #path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
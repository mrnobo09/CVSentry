from django.urls import path
from django.urls import include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import CustomTokenObtainPairView, CustomTokenRefreshView, VerifyOTPView

urlpatterns = [
    path("", include("djoser.urls")),
    # path("", include("djoser.urls.jwt")), # We are using custom JWT views
    path('login/', CustomTokenObtainPairView.as_view(), name='login-otp-request'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='jwt-refresh'),
    # path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"), # Standard simplejwt
]
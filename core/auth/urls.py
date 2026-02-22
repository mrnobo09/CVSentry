from django.urls import path
from django.urls import include
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    VerifyOTPView,
    DesktopVerifyOTPView,
    DesktopTokenRefreshView,
)

urlpatterns = [
    path("", include("djoser.urls")),
    # Shared login (Step 1: email/password → OTP email)
    path('login/', CustomTokenObtainPairView.as_view(), name='login-otp-request'),

    # Dashboard auth — tokens via HttpOnly cookie
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='jwt-refresh'),

    # Desktop Client auth — tokens in response body (no cookie)
    path('desktop/verify-otp/', DesktopVerifyOTPView.as_view(), name='desktop-verify-otp'),
    path('desktop/token/refresh/', DesktopTokenRefreshView.as_view(), name='desktop-token-refresh'),
]

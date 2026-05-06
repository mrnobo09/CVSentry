from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    VerifyOTPView,
    DesktopVerifyOTPView,
    DesktopTokenRefreshView,
    PublicKeyView,
)
from .viewsets import CustomUserViewSet

router = DefaultRouter()
router.register(r"users", CustomUserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # Public key for RS256 JWT verification by edge nodes
    path("public-key/", PublicKeyView.as_view(), name="public-key"),
    # Shared login (Step 1: email/password → OTP email)
    path("login/", CustomTokenObtainPairView.as_view(), name="login-otp-request"),
    # Dashboard auth — tokens via HttpOnly cookie
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("token/refresh/", CustomTokenRefreshView.as_view(), name="jwt-refresh"),
    # Desktop Client auth — tokens in response body (no cookie)
    path("desktop/verify-otp/", DesktopVerifyOTPView.as_view(), name="desktop-verify-otp"),
    path("desktop/token/refresh/", DesktopTokenRefreshView.as_view(), name="desktop-token-refresh"),
]

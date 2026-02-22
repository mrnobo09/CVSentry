from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone
from .utils import generate_otp, send_otp_email
from .models import User
from django.conf import settings
import datetime

# ---------------------------------------------------------------------------
# Shared OTP helpers
# ---------------------------------------------------------------------------

def _validate_otp(email, otp):
    """
    Validate OTP for a user. Returns (user, error_response).
    On success: (user, None). On failure: (None, Response).
    """
    if not email or not otp:
        return None, Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return None, Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    if user.otp != otp:
        return None, Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
    if user.otp_created_at:
        expiry_seconds = getattr(settings, 'OTP_EXPIRY_SECONDS', 300)
        if timezone.now() > user.otp_created_at + datetime.timedelta(seconds=expiry_seconds):
            return None, Response({"detail": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return None, Response({"detail": "Invalid OTP state."}, status=status.HTTP_400_BAD_REQUEST)

    # Clear OTP
    user.otp = None
    user.otp_created_at = None
    user.save()
    return user, None


# ---------------------------------------------------------------------------
# Shared login (Step 1): email + password → send OTP
# ---------------------------------------------------------------------------

class CustomTokenObtainPairView(APIView):
    """
    Step 1: Validate credentials (email/password).
    If valid, generate OTP, send email, and return 200 (OTP sent).
    Used by both Dashboard and Desktop Client.
    """
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            if not user.is_active:
                return Response({"detail": "User account is disabled."}, status=status.HTTP_401_UNAUTHORIZED)

            otp = generate_otp()
            user.otp = otp
            user.otp_created_at = timezone.now()
            user.save()
            send_otp_email(user.email, otp)

            return Response({
                "detail": "OTP sent to email.",
                "email": user.email,
                "otp_required": True
            }, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Dashboard auth (Step 2 + refresh) — HttpOnly cookie
# ---------------------------------------------------------------------------

class VerifyOTPView(APIView):
    """
    Dashboard: verify OTP → access token in body, refresh token in HttpOnly cookie.
    """
    def post(self, request, *args, **kwargs):
        user, err = _validate_otp(request.data.get("email"), request.data.get("otp"))
        if err:
            return err

        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)}, status=status.HTTP_200_OK)
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=30 * 24 * 60 * 60,
        )
        return response


class CustomTokenRefreshView(APIView):
    """
    Dashboard: refresh access token using HttpOnly cookie only.
    """
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Refresh token not provided."}, status=400)
        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access": str(refresh.access_token)}, status=200)
        except Exception as e:
            print(e)
            return Response({"detail": "Invalid refresh token."}, status=400)


# ---------------------------------------------------------------------------
# Desktop Client auth (Step 2 + refresh) — body tokens, no cookie
# ---------------------------------------------------------------------------

class DesktopVerifyOTPView(APIView):
    """
    Desktop Client: verify OTP → both access AND refresh tokens returned in
    the response body (no cookie). The Desktop Client stores these in
    localStorage and sends them as Bearer / body params respectively.
    """
    def post(self, request, *args, **kwargs):
        user, err = _validate_otp(request.data.get("email"), request.data.get("otp"))
        if err:
            return err

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_200_OK)


class DesktopTokenRefreshView(APIView):
    """
    Desktop Client: refresh access token by sending the refresh token in the
    request body as { "refresh": "<token>" }. No cookies involved.
    """
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token not provided."}, status=400)
        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access": str(refresh.access_token)}, status=200)
        except Exception as e:
            print(e)
            return Response({"detail": "Invalid or expired refresh token."}, status=400)
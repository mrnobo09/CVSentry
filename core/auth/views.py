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

class CustomTokenObtainPairView(APIView):
    """
    Step 1: Validate credentials (email/password).
    If valid, generate OTP, send email, and return 200 (OTP sent).
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
            
            # Generate OTP
            otp = generate_otp()
            user.otp = otp
            user.otp_created_at = timezone.now()
            user.save()

            # Send OTP Email
            send_otp_email(user.email, otp)

            return Response({
                "detail": "OTP sent to email.",
                "email": user.email,
                "otp_required": True
            }, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)


class VerifyOTPView(APIView):
    """
    Step 2: Verify OTP.
    If valid, return access/refresh tokens.
    """
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        otp = request.data.get("otp")

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check OTP format
        if user.otp != otp:
             return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Check Expiry
        if user.otp_created_at:
             expiry_seconds = getattr(settings, 'OTP_EXPIRY_SECONDS', 300)
             if timezone.now() > user.otp_created_at + datetime.timedelta(seconds=expiry_seconds):
                 return Response({"detail": "OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
        else:
             return Response({"detail": "Invalid OTP state."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP Valid - Clear OTP
        user.otp = None
        user.otp_created_at = None
        user.save()

        # Generate Tokens
        refresh = RefreshToken.for_user(user)
        
        response = Response({
            "access": str(refresh.access_token),
        }, status=status.HTTP_200_OK)

        # Set Refresh Token in Cookie
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=False, # Set to True in production with HTTPS
            samesite="Lax",
            max_age=7 * 24 * 60 * 60
        )

        return response


class CustomTokenRefreshView(APIView):

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "Refresh token not provided."}, status=400)
        try:
            refresh = RefreshToken(refresh_token)
            data = {"access": str(refresh.access_token)}
            return Response(data, status=200)
        except Exception as e:
            print(e)
            return Response({"detail": "Invalid refresh token."}, status=400)
        
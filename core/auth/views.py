from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
#from rest_framework.simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.views import APIView
from rest_framework.response import Response

# Customizing the TokenObtainPairView to set HttpOnly cookie for refresh token
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh = response.data.get("refresh")
            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=7 * 24 * 60 * 60
            )
            del response.data["refresh"]
        return response
    

# Returning only access token, refresh token is handled via HttpOnly cookie
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
        
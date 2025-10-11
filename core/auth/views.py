from django.http import HttpResponse
from rest_framework.views import APIView

def root_view(APIView):
    return HttpResponse("Hello, world. You're at the auth root.")
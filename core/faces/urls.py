from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FaceIdentityViewSet

router = DefaultRouter()
router.register(r'', FaceIdentityViewSet, basename='faces')

urlpatterns = [
    path('', include(router.urls)),
]

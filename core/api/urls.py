from django.contrib import admin
from django.urls import path,include
from auth import urls as auth_urls


urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include(auth_urls)),
]

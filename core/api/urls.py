from django.contrib import admin
from django.urls import path, include
from auth import urls as auth_urls
from nodes import urls as node_urls
from alerts import urls as alert_urls


urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include(auth_urls)),
    path('nodes/', include(node_urls)),
    path('alerts/', include(alert_urls)),
]

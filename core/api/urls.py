from django.contrib import admin
from django.urls import path, include
from auth import urls as auth_urls
from nodes import urls as node_urls
from alerts import urls as alert_urls
from recordings import urls as recordings_urls


urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include(auth_urls)),
    path('nodes/', include(node_urls)),
    path('alerts/', include(alert_urls)),
    path('api/v1/faces/', include('faces.urls')),
    path('', include(recordings_urls)),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

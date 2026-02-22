from django.urls import path
from .views import (
    NodeRegisterView,
    NodeHeartbeatView,
    NodeCameraUpdateView,
    NodeListView,
    NodeOfflineView,
)

urlpatterns = [
    path('', NodeListView.as_view(), name='node-list'),
    path('register/', NodeRegisterView.as_view(), name='node-register'),
    path('heartbeat/', NodeHeartbeatView.as_view(), name='node-heartbeat'),
    path('cameras/update/', NodeCameraUpdateView.as_view(), name='node-cameras-update'),
    path('offline/', NodeOfflineView.as_view(), name='node-offline'),
]

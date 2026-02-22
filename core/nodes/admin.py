from django.contrib import admin
from .models import Node, NodeCamera

@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ['label', 'user', 'base_url', 'port', 'srs_port', 'is_online', 'last_seen']
    list_filter = ['is_online']

@admin.register(NodeCamera)
class NodeCameraAdmin(admin.ModelAdmin):
    list_display = ['node', 'camera_id', 'stream_key', 'is_active']
    list_filter = ['is_active']

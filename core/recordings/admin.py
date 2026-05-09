from django.contrib import admin
from .models import LiveStream, Recording, RecordingSegment, FrameMetadata


@admin.register(LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ['camera_id', 'user', 'node', 'is_active', 'started_at']
    list_filter = ['is_active']
    search_fields = ['camera_id', 'srs_stream_id']


@admin.register(Recording)
class RecordingAdmin(admin.ModelAdmin):
    list_display = ['camera_id', 'user', 'node', 'status', 'started_at', 'segment_count']
    list_filter = ['status']
    search_fields = ['camera_id', 'srs_stream_id']


@admin.register(RecordingSegment)
class RecordingSegmentAdmin(admin.ModelAdmin):
    list_display = ['recording', 'segment_index', 'uploaded', 'duration_ms', 'started_at']


@admin.register(FrameMetadata)
class FrameMetadataAdmin(admin.ModelAdmin):
    list_display = ['recording', 'frame_number', 'severity', 'has_threat', 'timestamp_micros']
    list_filter = ['severity', 'has_threat']

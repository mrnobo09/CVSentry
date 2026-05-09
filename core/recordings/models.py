import uuid
from django.db import models
from django.contrib.auth import get_user_model
from nodes.models import Node

User = get_user_model()


class LiveStream(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='live_streams')
    node = models.ForeignKey(Node, on_delete=models.SET_NULL, null=True, blank=True, related_name='live_streams')
    camera_id = models.CharField(max_length=100)
    srs_stream_id = models.CharField(max_length=255, unique=True)
    started_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('node', 'camera_id')
        ordering = ['-started_at']

    def __str__(self):
        return f"LiveStream {self.camera_id} @ {self.node}"


class Recording(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recordings')
    node = models.ForeignKey(Node, on_delete=models.SET_NULL, null=True, blank=True, related_name='recordings')
    camera_id = models.CharField(max_length=100)
    srs_stream_id = models.CharField(max_length=255)

    STATUS_CHOICES = [
        ('recording', 'Recording'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, default='recording', choices=STATUS_CHOICES)

    minio_bucket = models.CharField(max_length=100, default='cvsentry-recordings')
    minio_prefix = models.CharField(max_length=500, blank=True, default='')

    total_duration_ms = models.BigIntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)
    segment_count = models.IntegerField(default=0)

    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['node', 'camera_id']),
        ]

    def __str__(self):
        return f"Recording {self.camera_id} @ {self.started_at:%Y-%m-%d %H:%M}"


class RecordingSegment(models.Model):
    recording = models.ForeignKey(Recording, on_delete=models.CASCADE, related_name='segments')
    segment_index = models.IntegerField()
    minio_key = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0)
    duration_ms = models.IntegerField(default=0)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    uploaded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('recording', 'segment_index')
        ordering = ['segment_index']


class FrameMetadata(models.Model):
    recording = models.ForeignKey(Recording, on_delete=models.CASCADE, related_name='frame_metadata')
    frame_number = models.BigIntegerField()
    timestamp_micros = models.BigIntegerField(db_index=True)
    detections = models.JSONField(default=dict)
    severity = models.CharField(max_length=10, default='normal')
    has_threat = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['recording', 'timestamp_micros']),
            models.Index(fields=['recording', 'severity']),
            models.Index(fields=['recording', 'has_threat']),
        ]
        ordering = ['timestamp_micros']

    def __str__(self):
        return f"Meta frame={self.frame_number} ts={self.timestamp_micros}"

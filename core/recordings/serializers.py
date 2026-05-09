from rest_framework import serializers
from .models import LiveStream, Recording, RecordingSegment, FrameMetadata


class FrameMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FrameMetadata
        fields = [
            'id', 'frame_number', 'timestamp_micros',
            'detections', 'severity', 'has_threat',
        ]


class FrameMetadataBatchSerializer(serializers.Serializer):
    camera_id = serializers.CharField(max_length=100)
    srs_stream_id = serializers.CharField(max_length=255)
    frames = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=100,
    )


class RecordingSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordingSegment
        fields = [
            'id', 'segment_index', 'minio_key',
            'duration_ms', 'started_at', 'ended_at', 'uploaded',
        ]


class RecordingSerializer(serializers.ModelSerializer):
    node_label = serializers.SerializerMethodField()
    segment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Recording
        fields = [
            'id', 'user', 'node', 'node_label', 'camera_id',
            'status', 'minio_bucket', 'minio_prefix',
            'total_duration_ms', 'total_size_bytes', 'segment_count',
            'started_at', 'ended_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'user', 'node', 'status', 'minio_bucket',
            'total_duration_ms', 'total_size_bytes', 'segment_count',
            'started_at', 'ended_at', 'created_at',
        ]

    def get_node_label(self, obj):
        if obj.node:
            return obj.node.label or f"{obj.node.base_url}:{obj.node.port}"
        return None


class RecordingListSerializer(serializers.ModelSerializer):
    node_label = serializers.SerializerMethodField()
    threat_segments = serializers.SerializerMethodField()

    class Meta:
        model = Recording
        fields = [
            'id', 'node_label', 'camera_id', 'status',
            'total_duration_ms', 'total_size_bytes', 'segment_count',
            'started_at', 'ended_at', 'threat_segments',
        ]

    def get_node_label(self, obj):
        if obj.node:
            return obj.node.label or f"{obj.node.base_url}:{obj.node.port}"
        return None

    def get_threat_segments(self, obj):
        threats = (
            FrameMetadata.objects
            .filter(recording=obj, has_threat=True)
            .order_by('timestamp_micros')
            .values('timestamp_micros', 'severity')
        )
        if not threats:
            return []
        start = obj.started_at.timestamp() * 1_000_000
        segments = []
        for t in threats:
            offset_us = t['timestamp_micros'] - start
            offset_ms = offset_us // 1000
            segments.append({
                'offset_ms': offset_ms,
                'severity': t['severity'],
            })
        return segments


class LiveStreamSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveStream
        fields = [
            'id', 'camera_id', 'srs_stream_id',
            'started_at', 'is_active',
        ]

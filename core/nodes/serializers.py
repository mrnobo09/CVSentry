from rest_framework import serializers
from .models import Node, NodeCamera


class NodeCameraSerializer(serializers.ModelSerializer):
    flv_url = serializers.ReadOnlyField()
    webrtc_url = serializers.ReadOnlyField()

    class Meta:
        model = NodeCamera
        fields = ['id', 'camera_id', 'stream_key', 'is_active', 'flv_url', 'webrtc_url']


class NodeSerializer(serializers.ModelSerializer):
    cameras = NodeCameraSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Node
        fields = [
            'id', 'user_email', 'label', 'base_url', 'port', 'srs_port', 'webrtc_port',
            'last_seen', 'cameras'
        ]
        read_only_fields = ['id', 'user_email', 'last_seen']


class NodeRegisterSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=100, required=False, default='')
    base_url = serializers.CharField(max_length=255)
    port = serializers.IntegerField(default=8000)
    srs_port = serializers.IntegerField(default=8080, required=False)
    webrtc_port = serializers.IntegerField(default=8001, required=False)


class NodeCameraUpdateSerializer(serializers.Serializer):
    camera_ids = serializers.ListField(
        child=serializers.CharField(max_length=100)
    )

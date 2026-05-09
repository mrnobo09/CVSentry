from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    node_label = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            "id", "threat_id", "node_label", "node_ip",
            "camera_id", "frame_id",
            "alert_type", "severity", "number_of_guns", "identities",
            "timestamp", "updated_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "node_label"]

    def get_node_label(self, obj):
        if obj.node:
            return obj.node.label or f"{obj.node.base_url}:{obj.node.port}"
        return obj.node_ip


class AlertCreateSerializer(serializers.Serializer):
    threat_id  = serializers.CharField(max_length=100)
    severity   = serializers.ChoiceField(choices=[("normal", "Normal"), ("severe", "Severe")], default="normal")
    number_of_guns = serializers.IntegerField(default=0)
    camera_id  = serializers.CharField(max_length=100)
    frame_id   = serializers.CharField(max_length=50, required=False, default="")
    alert_type = serializers.CharField(max_length=50, required=False, default="COMBINED_THREAT")
    identities = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    node_ip    = serializers.CharField(max_length=50)
    timestamp  = serializers.DateTimeField()

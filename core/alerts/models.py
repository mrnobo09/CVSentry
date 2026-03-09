from django.db import models
from nodes.models import Node


class Alert(models.Model):
    ALERT_TYPES = [
        ("COMBINED_THREAT", "Combined Threat"),
        ("WEAPON_DETECTED", "Weapon Detected"),
        ("FACE_RECOGNIZED", "Face Recognized"),
    ]

    node       = models.ForeignKey(Node, on_delete=models.CASCADE, related_name="alerts", null=True, blank=True)
    camera_id  = models.CharField(max_length=100)
    frame_id   = models.CharField(max_length=50, blank=True, default="")
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES, default="COMBINED_THREAT")
    identities = models.JSONField(default=list)
    node_ip    = models.CharField(max_length=50)
    timestamp  = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.alert_type}] cam={self.camera_id} @ {self.timestamp:%Y-%m-%d %H:%M:%S}"

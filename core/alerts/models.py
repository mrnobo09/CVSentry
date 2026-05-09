from django.db import models
from django.contrib.auth import get_user_model
from nodes.models import Node

User = get_user_model()


class Alert(models.Model):
    ALERT_TYPES = [
        ("COMBINED_THREAT", "Combined Threat"),
        ("WEAPON_DETECTED", "Weapon Detected"),
        ("FACE_RECOGNIZED", "Face Recognized"),
    ]

    SEVERITY_CHOICES = [
        ("normal", "Normal"),
        ("severe", "Severe"),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alerts", null=True)
    node       = models.ForeignKey(Node, on_delete=models.SET_NULL, related_name="alerts", null=True, blank=True)
    threat_id  = models.CharField(max_length=100, unique=True, null=True)
    severity   = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="normal")
    number_of_guns = models.IntegerField(default=0)
    
    camera_id  = models.CharField(max_length=100)
    frame_id   = models.CharField(max_length=50, blank=True, default="")
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES, default="COMBINED_THREAT")
    identities = models.JSONField(default=list)
    node_ip    = models.CharField(max_length=50)
    timestamp  = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.alert_type}] cam={self.camera_id} @ {self.timestamp:%Y-%m-%d %H:%M:%S}"

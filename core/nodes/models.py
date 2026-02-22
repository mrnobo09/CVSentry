from django.db import models
from auth.models import User


class Node(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nodes')
    label = models.CharField(max_length=100, blank=True, default='')
    base_url = models.CharField(max_length=255)   # e.g. "http://192.168.1.20"
    port = models.IntegerField(default=8000)       # FastAPI port
    srs_port = models.IntegerField(default=8080)   # SRS HTTP-FLV port
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One node per user+base_url+port combination
        unique_together = ('user', 'base_url', 'port')

    def __str__(self):
        status = "🟢" if self.is_online else "🔴"
        return f"{status} {self.label or self.base_url}:{self.port} (user={self.user.email})"


class NodeCamera(models.Model):
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='cameras')
    camera_id = models.CharField(max_length=100)   # e.g. "cam_1"
    stream_key = models.CharField(max_length=100)  # SRS stream key (usually same as camera_id)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('node', 'camera_id')

    def __str__(self):
        return f"{self.node} / {self.camera_id}"

    @property
    def flv_url(self):
        """Direct HTTP-FLV URL on the SRS server of this node."""
        return f"{self.node.base_url}:{self.node.srs_port}/live/{self.stream_key}.flv"

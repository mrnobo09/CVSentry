import uuid
from django.db import models
from django.conf import settings

class FaceIdentity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='face_identities'
    )
    name = models.CharField(max_length=255)
    qdrant_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    embedding = models.JSONField(null=True, blank=True)  # Averaged 512D embedding
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {'Global' if not self.user else 'User'}"

    class Meta:
        verbose_name_plural = "Face Identities"


class FaceImage(models.Model):
    """
    Individual reference image for a FaceIdentity.
    Each identity requires 4-5 images for accurate recognition.
    The averaged embedding of all images is stored on the parent FaceIdentity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(
        FaceIdentity,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='faces/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.identity.name}"

    class Meta:
        ordering = ['created_at']

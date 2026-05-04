from rest_framework import serializers
from .models import FaceIdentity, FaceImage


class FaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaceImage
        fields = ['id', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class FaceIdentitySerializer(serializers.ModelSerializer):
    is_global = serializers.SerializerMethodField()
    images = FaceImageSerializer(many=True, read_only=True)
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = FaceIdentity
        fields = ['id', 'name', 'qdrant_id', 'is_active', 'updated_at', 'is_global', 'images', 'image_count']
        read_only_fields = ['id', 'qdrant_id', 'updated_at', 'is_active']

    def get_is_global(self, obj):
        return obj.user is None

    def get_image_count(self, obj):
        return obj.images.count()


class FaceIdentitySyncSerializer(serializers.ModelSerializer):
    is_global = serializers.SerializerMethodField()

    class Meta:
        model = FaceIdentity
        fields = ['id', 'name', 'qdrant_id', 'is_active', 'updated_at', 'is_global', 'embedding']

    def get_is_global(self, obj):
        return obj.user is None


class FaceIdentityCreateSerializer(serializers.Serializer):
    """
    Custom serializer for creating a face identity with 4-5 images.
    Images are sent as 'images' (multipart file fields).
    """
    name = serializers.CharField(max_length=255)
    images = serializers.ListField(
        child=serializers.ImageField(),
        min_length=4,
        max_length=5,
        help_text="Upload 4-5 clear face photos of the same person."
    )

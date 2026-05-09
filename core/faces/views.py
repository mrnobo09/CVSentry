import uuid
import datetime
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.db import models
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FaceIdentity, FaceImage
from .serializers import FaceIdentitySerializer, FaceIdentityCreateSerializer, FaceIdentitySyncSerializer
from .services import extract_embedding, average_embeddings, upsert_face_to_qdrant, delete_face_from_qdrant

class FaceIdentityViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return FaceIdentityCreateSerializer
        return FaceIdentitySerializer

    def get_queryset(self):
        # Users can only see/modify their own identities
        return FaceIdentity.objects.filter(user=self.request.user, is_active=True).prefetch_related('images')

    def create(self, request, *args, **kwargs):
        print(f"[face] 📥 Received POST request. Data: {request.data.keys()}, Files: {request.FILES.keys()}")
        
        # Manually inject files into the serializer data if needed
        data = request.data.copy()
        if 'images' in request.FILES:
            data.setlist('images', request.FILES.getlist('images'))

        serializer = FaceIdentityCreateSerializer(data=data)
        if not serializer.is_valid():
            print(f"[face] ❌ Serializer invalid: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        name = serializer.validated_data['name']
        images = serializer.validated_data['images']
        print(f"[face] 👤 Creating identity for '{name}' with {len(images)} images.")

        # Create the identity
        identity = FaceIdentity(
            user=request.user,
            name=name,
            qdrant_id=uuid.uuid4()
        )
        identity.save()

        try:
            for img_file in images:
                # Save the image record
                face_img = FaceImage(identity=identity, image=img_file)
                face_img.save()

            # Enqueue processing to background tasks
            from .services import process_face_identity_task
            process_face_identity_task.enqueue(identity_id=str(identity.id))

            return Response(FaceIdentitySerializer(identity).data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[face] ❌ Unexpected Error: {str(e)}")
            import traceback
            traceback.print_exc()
            identity.delete()  # Cascades to FaceImages
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()
        
        # Remove from Cloud Qdrant
        try:
            delete_face_from_qdrant(str(instance.qdrant_id))
        except Exception:
            pass

    @action(detail=True, methods=['get'])
    def images_list(self, request, pk=None):
        """Get all images for a specific identity."""
        identity = self.get_object()
        from .serializers import FaceImageSerializer
        serializer = FaceImageSerializer(identity.images.all(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sync(self, request):
        since_param = request.query_params.get('since')
        user = request.user
        
        # Get both user-specific and global identities
        queryset = FaceIdentity.objects.filter(models.Q(user=user) | models.Q(user__isnull=True))
        
        if since_param:
            try:
                # Expecting ISO format timestamp
                since_dt = parse_datetime(since_param)
                if since_dt:
                    if not timezone.is_aware(since_dt):
                        since_dt = timezone.make_aware(since_dt)
                    queryset = queryset.filter(updated_at__gt=since_dt)
            except ValueError:
                pass
                
        serializer = FaceIdentitySyncSerializer(queryset, many=True)
        return Response(serializer.data)

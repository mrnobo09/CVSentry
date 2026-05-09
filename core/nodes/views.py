from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .models import Node, NodeCamera
from .serializers import NodeSerializer, NodeRegisterSerializer, NodeCameraUpdateSerializer

# A node is considered stale if no heartbeat received within this window.
# Heartbeat is sent every 30 s, so 2 min = 4 missed heartbeats.
STALE_THRESHOLD_MINUTES = 2


class NodeRegisterView(APIView):
    """
    POST /nodes/register/
    Desktop Client calls this on startup/login.
    Creates or updates the Node record.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NodeRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        node, created = Node.objects.update_or_create(
            user=request.user,
            base_url=data['base_url'],
            port=data['port'],
            defaults={
                'label': data.get('label', ''),
                'srs_port': data.get('srs_port', 8080),
                'webrtc_port': data.get('webrtc_port', 8001),
                'is_online': True,
            }
        )
        return Response(NodeSerializer(node).data, status=status.HTTP_200_OK)


class NodeHeartbeatView(APIView):
    """
    POST /nodes/heartbeat/
    Called every 30 s by Desktop Client to signal it is alive.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        base_url = request.data.get('base_url')
        port = request.data.get('port', 8000)
        try:
            node = Node.objects.get(user=request.user, base_url=base_url, port=port)
            node.is_online = True
            node.save()  # last_seen auto-updates via auto_now=True
            return Response({'status': 'ok'})
        except Node.DoesNotExist:
            return Response({'detail': 'Node not found. Please register first.'}, status=404)


class NodeCameraUpdateView(APIView):
    """
    POST /nodes/cameras/update/
    Desktop Client calls this after starting camera analysis.
    Replaces active camera list for this node.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        base_url = request.data.get('base_url')
        port = request.data.get('port', 8000)
        serializer = NodeCameraUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        try:
            node = Node.objects.get(user=request.user, base_url=base_url, port=port)
        except Node.DoesNotExist:
            return Response({'detail': 'Node not found.'}, status=404)

        camera_ids = serializer.validated_data['camera_ids']

        # Mark all existing cameras inactive, then upsert active ones
        NodeCamera.objects.filter(node=node).update(is_active=False)
        for cam_id in camera_ids:
            NodeCamera.objects.update_or_create(
                node=node,
                camera_id=cam_id,
                defaults={'stream_key': cam_id, 'is_active': True}
            )

        return Response({'status': 'cameras updated', 'count': len(camera_ids)})


class NodeListView(APIView):
    """
    GET /nodes/
    Returns all live nodes for the authenticated user.

    Stale nodes (no heartbeat in STALE_THRESHOLD_MINUTES) are deleted
    before responding — keeps the DB clean without a scheduled task.
    No WebSockets needed; the Dashboard short-polls this endpoint.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = timezone.now() - timedelta(minutes=STALE_THRESHOLD_MINUTES)

        # Purge stale nodes (cascade deletes their cameras too)
        stale = Node.objects.filter(last_seen__lt=cutoff)
        if stale.exists():
            count = stale.count()
            stale.delete()
            print(f"[nodes] 🧹 Purged {count} stale node(s) (last_seen < {cutoff})")

        # Return only fresh nodes, most recently seen first
        nodes = Node.objects.filter(
            last_seen__gte=cutoff
        ).prefetch_related('cameras').order_by('-last_seen')

        return Response(NodeSerializer(nodes, many=True).data)


class NodeOfflineView(APIView):
    """
    POST /nodes/offline/
    Desktop Client calls this on clean shutdown.
    Deletes the node and all its cameras from the database immediately.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        base_url = request.data.get('base_url')
        port = request.data.get('port', 8000)
        try:
            node = Node.objects.get(user=request.user, base_url=base_url, port=port)
            label = node.label or f"{base_url}:{port}"
            node.delete()  # CASCADE removes NodeCamera rows too
            print(f"[nodes] 🗑️  Deleted node '{label}' on clean shutdown")
            return Response({'status': 'node deleted'})
        except Node.DoesNotExist:
            return Response({'detail': 'Node not found.'}, status=404)

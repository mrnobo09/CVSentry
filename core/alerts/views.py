from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from nodes.models import Node
from .models import Alert
from .serializers import AlertSerializer, AlertCreateSerializer


class AlertCreateView(APIView):
    """
    POST /alerts/create/
    Called by Desktop Client when a COMBINED_THREAT (or other alert) is detected.
    Resolves the node from node_ip + user, creates an Alert record.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AlertCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        node_ip = data["node_ip"]

        # Find the node that belongs to this user with the given base_url
        node = Node.objects.filter(
            user=request.user,
            base_url__contains=node_ip,
        ).first()

        alert = Alert.objects.create(
            node=node,
            camera_id=data["camera_id"],
            frame_id=data.get("frame_id", ""),
            alert_type=data.get("alert_type", "COMBINED_THREAT"),
            identities=data.get("identities", []),
            node_ip=node_ip,
            timestamp=data["timestamp"],
        )

        print(
            f"[alerts] 🚨 Saved alert: type={alert.alert_type} "
            f"camera={alert.camera_id} identities={alert.identities}"
        )

        return Response(AlertSerializer(alert).data, status=status.HTTP_201_CREATED)


class AlertListView(APIView):
    """
    GET /alerts/?since=<iso-timestamp>&limit=50
    Returns alerts for the authenticated user's nodes, newest first.
    Supports incremental polling via ?since= for the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Gather user's node IPs and node FKs
        user_nodes = Node.objects.filter(user=request.user)
        user_node_ips = list(user_nodes.values_list("base_url", flat=True))

        # Base queryset: alerts linked to user's nodes OR matching node_ip
        qs = Alert.objects.filter(
            node__in=user_nodes
        ) | Alert.objects.filter(
            node__isnull=True,
            node_ip__in=[ip.replace("http://", "") for ip in user_node_ips],
        )
        qs = qs.distinct().order_by("-timestamp")

        # Incremental polling filter
        since_str = request.query_params.get("since")
        if since_str:
            since_dt = parse_datetime(since_str)
            if since_dt:
                qs = qs.filter(timestamp__gt=since_dt)

        # Limit
        try:
            limit = int(request.query_params.get("limit", 50))
        except (ValueError, TypeError):
            limit = 50
        limit = min(max(limit, 1), 200)

        alerts = qs[:limit]
        return Response(AlertSerializer(alerts, many=True).data)

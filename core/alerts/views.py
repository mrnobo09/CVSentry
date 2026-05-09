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
    Resolves the node from node_ip + user, creates or updates an Alert record based on threat_id.
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

        threat_id = data.get("threat_id")

        alert, created = Alert.objects.update_or_create(
            threat_id=threat_id,
            defaults={
                "user": request.user,
                "node": node,
                "severity": data.get("severity", "normal"),
                "number_of_guns": data.get("number_of_guns", 0),
                "camera_id": data["camera_id"],
                "frame_id": data.get("frame_id", ""),
                "alert_type": data.get("alert_type", "COMBINED_THREAT"),
                "identities": data.get("identities", []),
                "node_ip": node_ip,
                "timestamp": data["timestamp"],
            }
        )

        print(
            f"[alerts] 🚨 {'Created' if created else 'Updated'} alert: type={alert.alert_type} "
            f"severity={alert.severity} camera={alert.camera_id} identities={alert.identities}"
        )

        return Response(AlertSerializer(alert).data, status=status.HTTP_201_CREATED)


class AlertListView(APIView):
    """
    GET /alerts/?since=<iso-timestamp>&limit=50&date=YYYY-MM-DD
    Returns alerts for the authenticated user, newest first based on updated_at.
    Supports incremental polling via ?since= and historical view via ?date=.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Alert.objects.filter(user=request.user).order_by("-updated_at")

        # Date filtering
        date_str = request.query_params.get("date")
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                qs = qs.filter(timestamp__date=target_date)
            except ValueError:
                pass # ignore invalid date format

        # Incremental polling filter
        since_str = request.query_params.get("since")
        if since_str:
            since_dt = parse_datetime(since_str)
            if since_dt:
                qs = qs.filter(updated_at__gt=since_dt)

        # Limit
        try:
            limit = int(request.query_params.get("limit", 50))
        except (ValueError, TypeError):
            limit = 50
        limit = min(max(limit, 1), 200)

        alerts = qs[:limit]
        return Response(AlertSerializer(alerts, many=True).data)

import os
import uuid
import time
import hmac
import hashlib
import base64
from datetime import datetime, timedelta

from urllib.parse import urlparse
from django.utils import timezone
from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import LiveStream, Recording, RecordingSegment, FrameMetadata
from .serializers import (
    FrameMetadataSerializer, FrameMetadataBatchSerializer,
    RecordingSerializer, RecordingListSerializer,
    LiveStreamSerializer,
)


WHEP_TOKEN_SECRET = os.getenv('SRS_WHEP_TOKEN_SECRET', 'supersecretwheptoken')
WHEP_TOKEN_TTL = int(os.getenv('SRS_WHEP_TOKEN_TTL_SECONDS', '30'))

RECORDING_TOKEN_SECRET = os.getenv('RECORDING_TOKEN_SECRET', 'supersecretrecordingtoken')
RECORDING_TOKEN_TTL = 3600 * 24  # 24 hours for recording playback sessions

WHIP_TOKEN_SECRET = os.getenv('SRS_WHIP_TOKEN_SECRET', 'supersecretwhiptoken')
WHIP_TOKEN_TTL = 3600  # 1 hour for publish session initialization


def _generate_whip_token(user_id, stream_id, ttl=None):
    ttl = ttl or WHIP_TOKEN_TTL
    expiry = int(time.time()) + ttl
    payload = f"{user_id}:{stream_id}:{expiry}"
    sig = hmac.new(
        WHIP_TOKEN_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()
    return token


def _decode_whip_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.rsplit(':', 1)
        payload_str, sig = parts[0], parts[1]
        expected_sig = hmac.new(
            WHIP_TOKEN_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        user_id, stream_id, expiry_str = payload_str.split(':', 2)
        if time.time() > int(expiry_str):
            return None
        return {'user_id': user_id, 'stream_id': stream_id}
    except Exception:
        return None


def _generate_whep_token(user_id, stream_id, ttl=None):
    ttl = ttl or WHEP_TOKEN_TTL
    expiry = int(time.time()) + ttl
    payload = f"{user_id}:{stream_id}:{expiry}"
    sig = hmac.new(
        WHEP_TOKEN_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()
    return token


def _decode_whep_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.rsplit(':', 1)
        payload_str, sig = parts[0], parts[1]
        expected_sig = hmac.new(
            WHEP_TOKEN_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        user_id, stream_id, expiry_str = payload_str.split(':', 2)
        expiry = int(expiry_str)
        if time.time() > expiry:
            return None
        return {'user_id': user_id, 'stream_id': stream_id}
    except Exception:
        return None


def _generate_recording_token(user_id, recording_id):
    expiry = int(time.time()) + RECORDING_TOKEN_TTL
    payload = f"{user_id}:{recording_id}:{expiry}"
    sig = hmac.new(
        RECORDING_TOKEN_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()
    return token


def _decode_recording_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.rsplit(':', 1)
        payload_str, sig = parts[0], parts[1]
        expected_sig = hmac.new(
            RECORDING_TOKEN_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        user_id, recording_id, expiry_str = payload_str.split(':', 2)
        if time.time() > int(expiry_str):
            return None
        return {'user_id': user_id, 'recording_id': recording_id}
    except Exception:
        return None


# ── SRS HTTP Callbacks ──────────────────────────────────────────────

class SRSOnPublishView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        client_ip = request.META.get('REMOTE_ADDR', '')
        if client_ip not in ('127.0.0.1', '172.16.0.0', '172.17.0.0'):
            pass

        action = request.data.get('action')
        if action != 'on_publish':
            return Response({'code': 0})

        # Extract token from query parameters (sent as 'param' by SRS)
        import urllib.parse
        param = request.data.get('param', '')
        parsed = urllib.parse.parse_qs(param.lstrip('?'))
        token = parsed.get('token', [''])[0]

        stream_url = request.data.get('stream', '') or request.data.get('stream_url', '')
        if '/live/' in stream_url:
            stream_key = stream_url.split('/live/')[-1]
        else:
            stream_key = stream_url.strip('/')

        # Security Check: If no token is provided, reject (unless it's local)
        if not token:
            return Response({'code': 1, 'detail': 'Missing publish token'}, status=403)

        decoded = _decode_whip_token(token)
        if not decoded or decoded['stream_id'] != stream_key:
            return Response({'code': 1, 'detail': 'Invalid or expired publish token'}, status=403)

        try:
            live_stream = LiveStream.objects.get(
                srs_stream_id=stream_key,
                is_active=True,
            )
        except LiveStream.DoesNotExist:
            return Response({'code': 1}, status=403)

        if not live_stream.node:
            return Response({'code': 1}, status=403)

        node = live_stream.node
        node.is_online = True
        node.save()

        Recording.objects.update_or_create(
            srs_stream_id=stream_key,
            status='recording',
            defaults={
                'user': live_stream.user,
                'node': node,
                'camera_id': live_stream.camera_id,
                'started_at': timezone.now(),
                'minio_bucket': os.getenv('MINIO_BUCKET', 'cvsentry-recordings'),
                'minio_prefix': f"{live_stream.user.id}/{node.id}/{live_stream.camera_id}/{timezone.now():%Y-%m-%d/%H-%M-%S}",
                'status': 'recording',
            },
        )

        return Response({'code': 0})


class SRSOnUnpublishView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        stream_url = request.data.get('stream', '') or request.data.get('stream_url', '')
        if '/live/' in stream_url:
            stream_key = stream_url.split('/live/')[-1]
        else:
            stream_key = stream_url.strip('/')

        Recording.objects.filter(
            srs_stream_id=stream_key,
            status='recording',
        ).update(
            status='completed',
            ended_at=timezone.now(),
        )

        return Response({'code': 0})


class SRSOnPlayView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        import urllib.parse
        param = request.data.get('param', '')
        parsed = urllib.parse.parse_qs(param.lstrip('?'))
        token = parsed.get('token', [''])[0]

        stream_url = request.data.get('stream', '') or request.data.get('stream_url', '')
        if '/live/' in stream_url:
            stream_key = stream_url.split('/live/')[-1]
        else:
            stream_key = stream_url.strip('/')

        if not token:
            return Response({'code': 1}, status=403)

        decoded = _decode_whep_token(token)
        if not decoded:
            return Response({'code': 1}, status=403)

        try:
            live_stream = LiveStream.objects.get(
                srs_stream_id=stream_key,
                is_active=True,
            )
        except LiveStream.DoesNotExist:
            return Response({'code': 1}, status=403)

        if str(live_stream.user.id) != decoded['user_id']:
            return Response({'code': 1}, status=403)

        return Response({'code': 0})


class SRSOnStopView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        return Response({'code': 0})


class SRSOnHLSView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        stream_key = request.data.get('stream')
        # file path from SRS: /usr/local/srs/objs/nginx/html/records/live/1_3_cam_1_.../0.ts
        srs_file_path = request.data.get('file', '')
        
        # Convert to our volume path
        # SRS root is /usr/local/srs/objs/nginx/html/records
        # Our root is /records
        rel_path = srs_file_path.split('/objs/nginx/html/records/')[-1]
        local_path = os.path.join('/records', rel_path)

        if not os.path.exists(local_path):
            logger.error(f"HLS segment not found at {local_path}")
            return Response({'code': 1}, status=404)

        try:
            recording = Recording.objects.get(
                srs_stream_id=stream_key,
                status='recording',
            )
        except Recording.DoesNotExist:
            logger.warning(f"No active recording for stream {stream_key}")
            return Response({'code': 0})

        # Calculate segment index from filename (e.g., stream-0.ts -> 0)
        filename = os.path.basename(local_path)
        try:
            # Handle both "0.ts" and "stream-0.ts"
            if '-' in filename:
                segment_index = int(filename.split('-')[-1].split('.')[0])
            else:
                segment_index = int(filename.split('.')[0])
        except (ValueError, IndexError):
            segment_index = recording.segment_count

        minio_key = f"{recording.minio_prefix}/{filename}"
        
        from .services import upload_segment_to_minio
        try:
            file_size = upload_segment_to_minio(local_path, minio_key, recording.minio_bucket)
            
            # SRS HLS segments are usually 2 seconds by default in our srs.conf
            duration_ms = 2000 
            
            RecordingSegment.objects.create(
                recording=recording,
                segment_index=segment_index,
                minio_key=minio_key,
                file_size=file_size,
                duration_ms=duration_ms,
                started_at=timezone.now() - timedelta(milliseconds=duration_ms),
                uploaded=True,
            )
            
            recording.total_size_bytes += file_size
            recording.segment_count += 1
            recording.save(update_fields=['total_size_bytes', 'segment_count'])
            
            return Response({'code': 0})
        except Exception as e:
            logger.error(f"Failed to upload segment {local_path}: {e}")
            return Response({'code': 1}, status=500)


# ── Stream Management ───────────────────────────────────────────────

class StreamListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        streams = LiveStream.objects.filter(
            user=request.user,
            is_active=True,
        ).select_related('node').order_by('-started_at')
        return Response(LiveStreamSerializer(streams, many=True).data)


SRS_EXTERNAL_API_URL = os.getenv('SRS_EXTERNAL_API_URL', 'http://localhost:1985')


class StreamWHEPURLView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, stream_id):
        live_stream = None

        try:
            import uuid as _uuid
            uid = _uuid.UUID(stream_id)
            live_stream = LiveStream.objects.filter(
                id=uid,
                user=request.user,
                is_active=True,
            ).first()
        except (ValueError, AttributeError):
            pass

        if not live_stream:
            live_stream = LiveStream.objects.filter(
                camera_id=stream_id,
                user=request.user,
                is_active=True,
            ).order_by('-started_at').first()

        if not live_stream:
            return Response({'detail': 'Stream not found.'}, status=404)

        token = _generate_whep_token(
            str(request.user.id),
            live_stream.srs_stream_id,
        )

        # Use the public domain for WHEP signaling and stream identification
        whip_url = os.getenv('SRS_EXTERNAL_WHIP_URL', '')
        if whip_url:
            from urllib.parse import urlparse
            public_host = urlparse(whip_url).hostname
            # Use HTTPS for signaling if WHIP is HTTPS
            scheme = "https" if whip_url.startswith("https") else "http"
            srs_whep_url = f"{scheme}://{public_host}/rtc/v1/whep/"
            stream_url = f"webrtc://{public_host}/live/{live_stream.srs_stream_id}"
        else:
            host = request.get_host().split(':')[0]
            srs_whep_url = f"http://{host}:1985/rtc/v1/play/"
            stream_url = f"webrtc://{host}/live/{live_stream.srs_stream_id}"

        return Response({
            'whep_url': srs_whep_url,
            'stream_url': stream_url,
            'token': token,
            'camera_id': live_stream.camera_id,
        })


class StreamLatestMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, stream_id):
        live_stream = LiveStream.objects.filter(
            camera_id=stream_id,
            user=request.user,
            is_active=True,
        ).order_by('-started_at').first()

        if not live_stream:
            try:
                import uuid as _uuid
                uid = _uuid.UUID(stream_id)
                live_stream = LiveStream.objects.filter(
                    id=uid, user=request.user, is_active=True,
                ).first()
            except (ValueError, AttributeError):
                pass

        if not live_stream:
            return Response({'results': []})

        recording = Recording.objects.filter(
            srs_stream_id=live_stream.srs_stream_id,
            status='recording',
            user=request.user,
        ).first()

        if not recording:
            return Response({'results': []})

        limit = int(request.query_params.get('limit', 5))
        limit = max(1, min(limit, 50))

        entries = FrameMetadata.objects.filter(
            recording=recording,
        ).order_by('-timestamp_micros')[:limit]

        results = []
        for e in reversed(entries):
            results.append({
                'frame_number': e.frame_number,
                'detections': e.detections,
                'severity': e.severity,
                'has_threat': e.has_threat,
            })

        return Response({'results': results})


class StreamRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        camera_id = request.data.get('camera_id')
        node_base_url = request.data.get('base_url')
        node_port = request.data.get('port')

        if not all([camera_id, node_base_url, node_port]):
            return Response({'detail': 'camera_id, base_url, port are required.'}, status=400)

        from nodes.models import Node
        try:
            node = Node.objects.get(
                user=request.user,
                base_url=node_base_url,
                port=node_port,
            )
        except Node.DoesNotExist:
            return Response({'detail': 'Node not found. Register node first.'}, status=404)

        srs_stream_id = f"{request.user.id}_{node.id}_{camera_id}_{uuid.uuid4().hex[:8]}"

        live_stream, created = LiveStream.objects.update_or_create(
            node=node,
            camera_id=camera_id,
            defaults={
                'user': request.user,
                'srs_stream_id': srs_stream_id,
                'is_active': True,
            },
        )

        # Generate a publish token for this specific stream
        whip_token = _generate_whip_token(str(request.user.id), srs_stream_id)

        # Use an environment variable for the public WHIP URL if set, 
        # otherwise fallback to a best-guess based on the current server IP
        whip_url = os.getenv('SRS_EXTERNAL_WHIP_URL')
        if not whip_url:
            # Fallback: Guess based on the Host header if no environment variable is set
            host = request.get_host().split(':')[0]
            whip_url = f"http://{host}:1985/rtc/v1/publish/"

        # Use the same domain for the webrtc stream URL as the WHIP URL
        
        parsed_whip = urlparse(whip_url)
        public_host = parsed_whip.hostname
        
        return Response({
            'stream_id': str(live_stream.id),
            'srs_stream_id': live_stream.srs_stream_id,
            'whip_url': whip_url,
            'whip_token': whip_token,
            'srs_api_user': os.getenv('SRS_API_USERNAME', 'cvsentry_srs'),
            'srs_api_pass': os.getenv('SRS_API_PASSWORD', ''),
            'stream_url': f"webrtc://{public_host}/live/{live_stream.srs_stream_id}",
        })


class StreamMetadataBatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FrameMetadataBatchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        srs_stream_id = data['srs_stream_id']

        try:
            recording = Recording.objects.get(
                srs_stream_id=srs_stream_id,
                status='recording',
                user=request.user,
            )
        except Recording.DoesNotExist:
            return Response({'detail': 'No active recording for this stream.'}, status=404)

        entries = []
        for frame in data['frames']:
            entries.append(FrameMetadata(
                recording=recording,
                frame_number=frame.get('frame_number', 0),
                timestamp_micros=frame.get('timestamp_micros', 0),
                detections=frame.get('detections', {}),
                severity=frame.get('severity', 'normal'),
                has_threat=frame.get('has_threat', False),
            ))

        FrameMetadata.objects.bulk_create(entries, batch_size=200)

        has_threat_frames = [f for f in data['frames'] if f.get('has_threat')]
        if has_threat_frames and has_threat_frames[0].get('severity') == 'severe':
            last_us = recording.total_duration_ms * 1000
            for f in has_threat_frames:
                ts = f.get('timestamp_micros', 0)
                if ts > last_us:
                    recording.total_duration_ms = ts // 1000
            recording.save(update_fields=['total_duration_ms'])

        return Response({
            'status': 'ok',
            'frames_stored': len(entries),
        })


# ── Recording Management ────────────────────────────────────────────

class RecordingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Recording.objects.filter(
            user=request.user,
        ).select_related('node').order_by('-started_at')

        camera_id = request.query_params.get('camera_id')
        if camera_id:
            qs = qs.filter(camera_id=camera_id)

        date_str = request.query_params.get('date')
        if date_str:
            try:
                dt = datetime.strptime(date_str, '%Y-%m-%d').date()
                qs = qs.filter(started_at__date=dt)
            except ValueError:
                pass

        limit = int(request.query_params.get('limit', 50))
        limit = max(1, min(limit, 200))
        qs = qs[:limit]

        return Response(RecordingListSerializer(qs, many=True).data)


class RecordingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, recording_id):
        try:
            recording = Recording.objects.prefetch_related('segments').get(
                id=recording_id,
                user=request.user,
            )
        except Recording.DoesNotExist:
            return Response({'detail': 'Recording not found.'}, status=404)

        data = RecordingSerializer(recording).data
        
        # Add pre-signed playlist URL
        token = _generate_recording_token(str(request.user.id), str(recording.id))
        from django.urls import reverse
        playlist_path = reverse('recording-playlist', kwargs={'recording_id': recording.id})
        data['playlist_url'] = f"{playlist_path}?token={token}"
        data['start_timestamp_micros'] = int(recording.started_at.timestamp() * 1_000_000)
        
        return Response(data)


class RecordingPlaylistView(APIView):
    """
    Returns an HLS .m3u8 manifest with pre-signed MinIO URLs for each segment.
    """
    permission_classes = [AllowAny]

    def get(self, request, recording_id):
        token = request.query_params.get('token')
        if not token:
            return Response({'detail': 'Authentication required.'}, status=401)
        
        decoded = _decode_recording_token(token)
        if not decoded or decoded['recording_id'] != str(recording_id):
            return Response({'detail': 'Invalid or expired token.'}, status=403)

        try:
            recording = Recording.objects.get(
                id=recording_id,
                user_id=decoded['user_id']
            )
        except Recording.DoesNotExist:
            return Response({'detail': 'Recording not found.'}, status=404)

        from .services import generate_m3u8_manifest
        manifest = generate_m3u8_manifest(recording)
        if not manifest:
            return Response({'detail': 'No segments uploaded yet.'}, status=404)

        return HttpResponse(
            manifest,
            content_type='application/vnd.apple.mpegurl',
        )


class RecordingSegmentProxyView(APIView):
    """
    Proxies a .ts segment from MinIO. Uses pre-signed URL redirect.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, recording_id, segment_index):
        try:
            recording = Recording.objects.get(
                id=recording_id,
                user=request.user,
            )
        except Recording.DoesNotExist:
            return Response({'detail': 'Recording not found.'}, status=404)

        from .services import get_minio_client
        try:
            seg = recording.segments.get(
                segment_index=int(segment_index),
                uploaded=True,
            )
        except RecordingSegment.DoesNotExist:
            return Response({'detail': 'Segment not found.'}, status=404)

        client = get_minio_client()
        presigned = client.presigned_get_object(
            recording.minio_bucket,
            seg.minio_key,
            expires=timedelta(minutes=5),
        )

        from django.shortcuts import redirect
        return redirect(presigned)


class RecordingMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, recording_id):
        try:
            recording = Recording.objects.get(
                id=recording_id,
                user=request.user,
            )
        except Recording.DoesNotExist:
            return Response({'detail': 'Recording not found.'}, status=404)

        start_ms = request.query_params.get('start_ms')
        end_ms = request.query_params.get('end_ms')
        fields = request.query_params.get('fields', '')

        if fields == 'timeline':
            from .services import get_threat_timeline, merge_threat_timeline_to_segments
            timeline = get_threat_timeline(recording)
            merged = merge_threat_timeline_to_segments(timeline)
            return Response({'timeline': merged})

        qs = recording.frame_metadata.all().order_by('timestamp_micros')

        if start_ms:
            qs = qs.filter(timestamp_micros__gte=int(float(start_ms)) * 1000)
        if end_ms:
            qs = qs.filter(timestamp_micros__lte=int(float(end_ms)) * 1000)

        limit = int(request.query_params.get('limit', 200))
        limit = max(1, min(limit, 2000))
        qs = qs[:limit]

        return Response({
            'count': qs.count() if not (start_ms or end_ms) else recording.frame_metadata.count(),
            'results': FrameMetadataSerializer(qs, many=True).data,
        })


# ── Configuration ────────────────────────────────────────────────────

TURN_SHARED_SECRET = os.getenv('TURN_SHARED_SECRET', '')
TURN_EXTERNAL_IP = os.getenv('TURN_EXTERNAL_IP', '')
TURN_REALM = os.getenv('TURN_REALM', 'cvsentry.local')
TURN_CREDENTIAL_TTL = int(os.getenv('TURN_CREDENTIAL_TTL', '86400'))


def _generate_turn_credentials(user_id):
    expiry = int(time.time()) + TURN_CREDENTIAL_TTL
    username = f"{expiry}:{user_id}:{TURN_REALM}"
    password = base64.b64encode(
        hmac.new(TURN_SHARED_SECRET.encode(), username.encode(), hashlib.sha1).digest()
    ).decode()
    return username, password


class ICEConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ice_servers = [
            {'urls': ['stun:stun.l.google.com:19302']},
        ]

        if TURN_EXTERNAL_IP and TURN_SHARED_SECRET:
            username, password = _generate_turn_credentials(str(request.user.id))

            ice_servers.append({
                'urls': [
                    f'stun:{TURN_EXTERNAL_IP}:3478',
                    f'stun:{TURN_EXTERNAL_IP}:5349',
                ],
            })
            ice_servers.append({
                'urls': [
                    f'turn:{TURN_EXTERNAL_IP}:3478?transport=udp',
                    f'turn:{TURN_EXTERNAL_IP}:3478?transport=tcp',
                    f'turns:{TURN_EXTERNAL_IP}:5349?transport=tcp',
                ],
                'username': username,
                'credential': password,
                'credentialType': 'password',
            })

        return Response({'iceServers': ice_servers})

import os
import time
import logging
from datetime import datetime, timedelta
from minio import Minio
from minio.error import S3Error

from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


def get_minio_client():
    return Minio(
        endpoint=os.getenv('MINIO_ENDPOINT', 'minio:9000'),
        access_key=os.getenv('MINIO_ROOT_USER', 'minioadmin'),
        secret_key=os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin'),
        secure=False,
    )




def build_minio_prefix(user_id, node_id, camera_id, started_at):
    dt = started_at if isinstance(started_at, datetime) else datetime.fromisoformat(str(started_at))
    date_str = dt.strftime('%Y-%m-%d')
    time_str = dt.strftime('%H-%M-%S')
    return f"{user_id}/{node_id}/{camera_id}/{date_str}/{time_str}"


def upload_segment_to_minio(local_path: str, minio_key: str, bucket: str = None) -> int:
    client = get_minio_client()
    bucket = bucket or os.getenv('MINIO_BUCKET', 'cvsentry-recordings')
    file_size = os.path.getsize(local_path)
    client.fput_object(bucket, minio_key, local_path)
    logger.info(f"Uploaded {local_path} → {bucket}/{minio_key} ({file_size} bytes)")
    return file_size


def generate_playlist_presigned_urls(recording, base_ttl=timedelta(minutes=30)):
    external_url = os.getenv('MINIO_EXTERNAL_URL', 'http://localhost:9000')
    external_endpoint = external_url.replace('http://', '').replace('https://', '').split('/')[0]
    secure = external_url.startswith('https://')

    signing_client = Minio(
        endpoint=external_endpoint,
        access_key=os.getenv('MINIO_ROOT_USER', 'minioadmin'),
        secret_key=os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin'),
        secure=secure,
        region='us-east-1'
    )

    segments = recording.segments.filter(uploaded=True).order_by('segment_index')
    urls = []
    for seg in segments:
        url = signing_client.presigned_get_object(
            recording.minio_bucket,
            seg.minio_key,
            expires=base_ttl,
        )

        urls.append({
            'segment_index': seg.segment_index,
            'duration_ms': seg.duration_ms,
            'url': url,
        })
    return urls


def generate_m3u8_manifest(recording, base_ttl=timedelta(minutes=30)):
    segments = recording.segments.filter(uploaded=True).order_by('segment_index')
    if not segments:
        return None

    target_duration = max(seg.duration_ms / 1000.0 for seg in segments)
    target_duration = max(int(target_duration) + 1, 3)

    lines = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        f'#EXT-X-TARGETDURATION:{target_duration}',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-PLAYLIST-TYPE:VOD',
    ]

    external_url = os.getenv('MINIO_EXTERNAL_URL', 'http://localhost:9000')
    # Strip protocol
    external_endpoint = external_url.replace('http://', '').replace('https://', '').split('/')[0]
    secure = external_url.startswith('https://')

    # Create a dummy client that thinks it's at the external endpoint.
    # We set a fixed region to prevent the client from trying to connect to MinIO during signing.
    signing_client = Minio(
        endpoint=external_endpoint,
        access_key=os.getenv('MINIO_ROOT_USER', 'minioadmin'),
        secret_key=os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin'),
        secure=secure,
        region='us-east-1' # Hardcode region to skip auto-detection
    )

    for seg in segments:
        url = signing_client.presigned_get_object(
            recording.minio_bucket,
            seg.minio_key,
            expires=base_ttl,
        )
        
        duration = seg.duration_ms / 1000.0
        lines.append(f'#EXTINF:{duration:.3f},')
        lines.append(url)

    lines.append('#EXT-X-ENDLIST')
    return '\n'.join(lines)


def get_threat_timeline(recording):
    threats = (
        recording.frame_metadata
        .filter(has_threat=True)
        .order_by('timestamp_micros')
        .values('timestamp_micros', 'severity')
    )
    if not threats:
        return []

    start_us = recording.started_at.timestamp() * 1_000_000
    timeline = []
    for t in threats:
        offset_ms = (t['timestamp_micros'] - start_us) // 1000
        timeline.append({
            'offset_ms': max(0, offset_ms),
            'severity': t['severity'],
        })
    return timeline


def merge_threat_timeline_to_segments(timeline, segment_duration_ms=2000):
    if not timeline:
        return []

    peers = sorted(timeline, key=lambda x: x['offset_ms'])
    merged = []
    current_start = peers[0]['offset_ms']
    current_severity = peers[0]['severity']

    for entry in peers[1:]:
        if entry['severity'] != current_severity or entry['offset_ms'] - current_start > segment_duration_ms * 2:
            merged.append({
                'start_ms': current_start,
                'end_ms': entry['offset_ms'],
                'severity': current_severity,
            })
            current_start = entry['offset_ms']
            current_severity = entry['severity']

    merged.append({
        'start_ms': current_start,
        'end_ms': peers[-1]['offset_ms'],
        'severity': current_severity,
    })
    return merged

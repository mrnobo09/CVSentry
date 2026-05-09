from django.urls import path
from . import views

urlpatterns = [
    # SRS internal callbacks
    path('internal/srs/on_publish/', views.SRSOnPublishView.as_view(), name='srs-on-publish'),
    path('internal/srs/on_unpublish/', views.SRSOnUnpublishView.as_view(), name='srs-on-unpublish'),
    path('internal/srs/on_play/', views.SRSOnPlayView.as_view(), name='srs-on-play'),
    path('internal/srs/on_stop/', views.SRSOnStopView.as_view(), name='srs-on-stop'),
    path('internal/srs/on_hls/', views.SRSOnHLSView.as_view(), name='srs-on-hls'),

    # Live streams
    path('api/v1/streams/', views.StreamListView.as_view(), name='stream-list'),
    path('api/v1/streams/register/', views.StreamRegisterView.as_view(), name='stream-register'),
    path('api/v1/streams/<str:stream_id>/whep-url/', views.StreamWHEPURLView.as_view(), name='stream-whep-url'),
    path('api/v1/streams/<str:stream_id>/latest-metadata/', views.StreamLatestMetadataView.as_view(), name='stream-latest-metadata'),
    path('api/v1/streams/metadata/batch/', views.StreamMetadataBatchView.as_view(), name='stream-metadata-batch'),

    # Recordings
    path('api/v1/recordings/', views.RecordingListView.as_view(), name='recording-list'),
    path('api/v1/recordings/<uuid:recording_id>/', views.RecordingDetailView.as_view(), name='recording-detail'),
    path('api/v1/recordings/<uuid:recording_id>/playlist.m3u8', views.RecordingPlaylistView.as_view(), name='recording-playlist'),
    path('api/v1/recordings/<uuid:recording_id>/segments/<int:segment_index>.ts', views.RecordingSegmentProxyView.as_view(), name='recording-segment'),
    path('api/v1/recordings/<uuid:recording_id>/metadata/', views.RecordingMetadataView.as_view(), name='recording-metadata'),
]

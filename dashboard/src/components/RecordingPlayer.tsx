import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Eye, EyeOff, Loader } from 'lucide-react';
import request from '../utils/request';
import DetectionOverlay from './DetectionOverlay';
import ThreatSeekerBar from './ThreatSeekerBar';
import type { FrameMetadata, ThreatSegment } from '../types/streaming';

interface RecordingPlayerProps {
    recordingId: string;
}

export default function RecordingPlayer({ recordingId }: RecordingPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    const [status, setStatus] = useState<'loading' | 'playing' | 'paused' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
    const [overlayEnabled, setOverlayEnabled] = useState(true);
    const [threatSegments, setThreatSegments] = useState<ThreatSegment[]>([]);
    const [durationMs, setDurationMs] = useState(0);
    const [currentTimeMs, setCurrentTimeMs] = useState(0);
    const [startTimestampMicros, setStartTimestampMicros] = useState<number>(0);

    const metadataCache = useRef<Map<number, FrameMetadata>>(new Map());
    const metadataInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastPrefetchTimeMs = useRef<number>(-10000);

    const fetchMetadataTimeline = useCallback(async () => {
        try {
            const data = await request.get<{ timeline: ThreatSegment[] }>(
                `/api/v1/recordings/${recordingId}/metadata/?fields=timeline`
            );
            setThreatSegments(data.timeline || []);
        } catch {}
    }, [recordingId]);

    const fetchMetadataAtTime = useCallback(async (timeMs: number, overrideStartMicros?: number) => {
        const startMicros = overrideStartMicros || startTimestampMicros;
        if (!startMicros) return;
        
        const absTimeMicros = startMicros + (timeMs * 1000);
        
        // 1. Try to get from cache first (100ms bucket)
        const bucket = Math.round(absTimeMicros / 100000);
        if (metadataCache.current.has(bucket)) {
            setMetadata(metadataCache.current.get(bucket)!);
        }

        // 2. Prefetch if we are getting close to the end of our cached window
        if (timeMs > lastPrefetchTimeMs.current + 5000) {
            lastPrefetchTimeMs.current = timeMs;
            try {
                const startSearch = absTimeMicros;
                const endSearch = absTimeMicros + 15000000; // Increase to +15s for more safety
                
                const data = await request.get<{ results: { detections: FrameMetadata; timestamp_micros: number }[] }>(
                    `/api/v1/recordings/${recordingId}/metadata/?start_ms=${startSearch / 1000}&end_ms=${endSearch / 1000}&limit=500`
                );
                
                if (data.results) {
                    data.results.forEach(item => {
                        const b = Math.round(item.timestamp_micros / 100000);
                        metadataCache.current.set(b, item.detections);
                    });
                    // Refresh current metadata immediately from newly fetched data
                    if (data.results.length > 0 && !metadataCache.current.has(bucket)) {
                        setMetadata(data.results[0].detections);
                    }
                }
            } catch {}
        }
    }, [recordingId, startTimestampMicros]);

    const handleSeek = useCallback((timeMs: number) => {
        const video = videoRef.current;
        if (video) {
            video.currentTime = timeMs / 1000;
            lastPrefetchTimeMs.current = -10000; // Trigger fresh prefetch
        }
    }, []);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setStatus('playing');
        } else {
            video.pause();
            setStatus('paused');
        }
    }, []);

    const timeUpdateHandler = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTimeMs(video.currentTime * 1000);
        if (video.duration && isFinite(video.duration)) {
            setDurationMs(video.duration * 1000);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const recordingData = await request.get<any>(`/api/v1/recordings/${recordingId}/`);
                if (isMounted) {
                    const startMicros = recordingData.start_timestamp_micros || 0;
                    setStartTimestampMicros(startMicros);
                    
                    // Trigger an immediate "Warm-up Prefetch" for the start of the video
                    if (startMicros) {
                        fetchMetadataAtTime(0, startMicros);
                    }
                }
                const manifestUrl = `${import.meta.env.VITE_BACKEND_URL}${recordingData.playlist_url}`;

                const Hls = (await import('hls.js')).default;

                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: false,
                    });
                    hlsRef.current = hls;

                    hls.loadSource(manifestUrl);
                    hls.attachMedia(videoRef.current!);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (isMounted) {
                            setStatus('playing');
                            videoRef.current?.play().catch(() => {});
                        }
                    });

                    hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
                        if (data.fatal) {
                            setStatus('error');
                            setErrorMsg(data.type + ': ' + (data.details || 'unknown'));
                        }
                    });
                } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                    videoRef.current.src = manifestUrl;
                    videoRef.current.addEventListener('loadedmetadata', () => {
                        if (isMounted) {
                            setStatus('playing');
                            videoRef.current?.play().catch(() => {});
                        }
                    });
                } else {
                    setStatus('error');
                    setErrorMsg('HLS playback not supported in this browser');
                }
            } catch (err: any) {
                setStatus('error');
                setErrorMsg(err?.message || 'Failed to load recording');
            }
        }

        load();
        fetchMetadataTimeline();

        metadataInterval.current = setInterval(() => {
            const video = videoRef.current;
            if (video && !video.paused) {
                fetchMetadataAtTime(video.currentTime * 1000);
            }
        }, 100);

        return () => {
            isMounted = false;
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (metadataInterval.current) {
                clearInterval(metadataInterval.current);
            }
            if (videoRef.current) {
                videoRef.current.src = '';
            }
        };
    }, [recordingId, fetchMetadataAtTime, fetchMetadataTimeline]);

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700 bg-gray-800">
                <span className="text-sm font-medium text-white truncate">
                    Recording Playback
                </span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setOverlayEnabled(!overlayEnabled)}
                        className="p-1 rounded hover:bg-gray-700 transition-colors"
                        title={overlayEnabled ? 'Hide overlays' : 'Show overlays'}
                    >
                        {overlayEnabled ? (
                            <Eye className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                            <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                        )}
                    </button>
                </div>
            </div>

            <div className="relative bg-black aspect-video">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                    onTimeUpdate={timeUpdateHandler}
                    onPlay={() => setStatus('playing')}
                    onPause={() => setStatus('paused')}
                    onEnded={() => setStatus('paused')}
                />
                <DetectionOverlay
                    videoRef={videoRef}
                    metadata={metadata}
                    enabled={overlayEnabled}
                />
                {status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20">
                        <div className="text-center">
                            <Loader className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
                            <p className="text-xs text-gray-400">Loading recording…</p>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20">
                        <p className="text-xs text-red-400">{errorMsg || 'Playback error'}</p>
                    </div>
                )}
            </div>

            <div className="px-3 py-3 border-t border-gray-700 bg-gray-800 space-y-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="p-1 rounded hover:bg-gray-700 transition-colors text-white"
                    >
                        {status === 'playing' ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                    <span className="text-xs text-gray-400 font-mono">
                        {formatTime(currentTimeMs)} / {formatTime(durationMs)}
                    </span>
                </div>
                <ThreatSeekerBar
                    segments={threatSegments}
                    durationMs={durationMs}
                    currentTimeMs={currentTimeMs}
                    onSeek={handleSeek}
                />
            </div>
        </div>
    );
}

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

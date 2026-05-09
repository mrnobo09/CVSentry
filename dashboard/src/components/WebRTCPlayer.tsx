import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, WifiOff, Eye, EyeOff } from 'lucide-react';
import request, { getAccessToken } from '../utils/request';
import DetectionOverlay from './DetectionOverlay';

interface Detection {
    class_name: string;
    box: [number, number, number, number];
    score: number;
    keypoints?: [number, number][];
    identity?: string;
    recognized?: boolean;
    has_weapon?: boolean;
    is_aiming?: boolean;
    aiming_vec?: [number, number];
    rec_confidence?: number;
}

interface FrameMetadata {
    weapon?: Detection[];
    face?: Detection[];
    combined_threat?: boolean;
}

interface ThreatSegment {
    offset_ms: number;
    severity: 'normal' | 'severe';
}

interface WebRTCPlayerProps {
    cameraId: string;
    recordingId?: string;
}

type PlayerStatus = 'connecting' | 'live' | 'error';

export default function WebRTCPlayer({ cameraId, recordingId }: WebRTCPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const [status, setStatus] = useState<PlayerStatus>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
    const [overlayEnabled, setOverlayEnabled] = useState(true);
    const [threatSegments, setThreatSegments] = useState<ThreatSegment[]>([]);
    const [durationMs, setDurationMs] = useState(0);
    const [currentTimeMs, setCurrentTimeMs] = useState(0);
    const metadataBuffer = useRef<Map<number, FrameMetadata>>(new Map());
    const frameCounter = useRef(0);
    const metadataPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const accessToken = getAccessToken() ?? '';

    useEffect(() => {
        let pc: RTCPeerConnection | null = null;
        let isMounted = true;
        let retryTimeout: ReturnType<typeof setTimeout>;

        async function start(retryCount = 0) {
            try {
                if (!isMounted) return;

                if (pc) {
                    pc.close();
                    pc = null;
                }

                setStatus('connecting');

                if (recordingId) {
                    return;
                }

                const data = await request.get<{
                    whep_url: string;
                    stream_url: string;
                    token: string;
                }>(`/api/v1/streams/${cameraId}/whep-url/`);

                const whepUrl = data.whep_url;
                const streamUrl = data.stream_url;
                const token = data.token;

                let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
                try {
                    const iceResp = await fetch('/api/v1/config/ice-servers/', {
                        headers: { 'Authorization': `Bearer ${accessToken}` },
                    });
                    if (iceResp.ok) {
                        const iceConfig = await iceResp.json();
                        if (iceConfig.iceServers && iceConfig.iceServers.length) {
                            iceServers = iceConfig.iceServers;
                        }
                    }
                } catch {}
                pc = new RTCPeerConnection({ iceServers });
                pcRef.current = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });

                pc.ondatachannel = (evt) => {
                    const channel = evt.channel;
                    dcRef.current = channel;
                    channel.onmessage = (msg) => {
                        try {
                            const data = JSON.parse(msg.data);
                            if (data.type === 'metadata') {
                                frameCounter.current = data.frame_number || 0;
                                metadataBuffer.current.set(
                                    data.frame_number,
                                    data.detections || {}
                                );
                                while (metadataBuffer.current.size > 60) {
                                    const oldest = Math.min(...metadataBuffer.current.keys());
                                    metadataBuffer.current.delete(oldest);
                                }
                                setMetadata(data.detections || null);
                            }
                        } catch { /* ignore malformed metadata */ }
                    };
                };

                pc.ontrack = (evt) => {
                    if (!isMounted || !videoRef.current) return;
                    if (evt.streams && evt.streams[0]) {
                        videoRef.current.srcObject = evt.streams[0];
                        videoRef.current.play().catch(() => {
                            if (videoRef.current) {
                                videoRef.current.muted = true;
                                videoRef.current.play().catch(() => { });
                            }
                        });
                        if (isMounted) setStatus('live');
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    if (!isMounted || !pc) return;
                    const state = pc.iceConnectionState;
                    if (state === 'failed' || state === 'disconnected') {
                        throw new Error('ICE Connection lost');
                    }
                };

                if (metadataPollRef.current) {
                    clearInterval(metadataPollRef.current);
                }

                if (!dcRef.current) {
                    metadataPollRef.current = setInterval(async () => {
                        if (!isMounted) return;
                        try {
                            const md = await request.get<{ results: { detections: FrameMetadata }[] }>(
                                `/api/v1/streams/${cameraId}/latest-metadata/?limit=1`
                            );
                            if (isMounted && md.results && md.results.length > 0) {
                                setMetadata(md.results[0].detections);
                            }
                        } catch { }
                    }, 500);
                }

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const response = await fetch(`${whepUrl}?token=${encodeURIComponent(token)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api: whepUrl,
                        streamurl: `${streamUrl}?token=${encodeURIComponent(token)}`,
                        clientip: null,
                        sdp: pc.localDescription!.sdp,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`WHEP error ${response.status}: ${await response.text()}`);
                }

                const srsData = await response.json();
                if (srsData.code !== 0) {
                    throw new Error(`SRS error: ${JSON.stringify(srsData)}`);
                }

                await pc.setRemoteDescription({
                    type: 'answer',
                    sdp: srsData.sdp,
                });

            } catch (err: any) {
                if (isMounted) {
                    setStatus('error');
                    setErrorMsg(err?.message || 'WebRTC failed');

                    if (retryCount < 5) {
                        const backoff = Math.min(1000 * Math.pow(2, retryCount), 10000);
                        retryTimeout = setTimeout(() => start(retryCount + 1), backoff);
                    } else {
                        if (metadataPollRef.current) {
                            clearInterval(metadataPollRef.current);
                            metadataPollRef.current = null;
                        }
                    }
                }
            }
        }

        start();

        return () => {
            isMounted = false;
            clearTimeout(retryTimeout);
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            dcRef.current = null;
            if (metadataPollRef.current) {
                clearInterval(metadataPollRef.current);
            }
        };
    }, [cameraId, recordingId]);

    const timeUpdateHandler = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        setCurrentTimeMs(video.currentTime * 1000);
        if (video.duration && isFinite(video.duration)) {
            setDurationMs(video.duration * 1000);
        }
    }, []);

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700 bg-gray-800">
                <Camera className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-white uppercase tracking-wide truncate">
                    {cameraId.replace(/_/g, ' ')}
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
                    <span className={`text-xs font-semibold shrink-0 ${status === 'live' ? 'text-green-400' :
                            status === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                        {status === 'live' ? '● LIVE' : status === 'error' ? errorMsg : 'Connecting…'}
                    </span>
                </div>
            </div>

            <div className="relative bg-black aspect-video">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                    autoPlay
                    onTimeUpdate={timeUpdateHandler}
                />
                <DetectionOverlay
                    videoRef={videoRef}
                    metadata={metadata}
                    enabled={overlayEnabled}
                />
                {status === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Establishing WebRTC…</p>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20">
                        <div className="text-center px-4">
                            <WifiOff className="w-8 h-8 mx-auto mb-2 text-red-500 opacity-60" />
                            <p className="text-xs text-red-400">{errorMsg || 'Stream unavailable'}</p>
                        </div>
                    </div>
                )}
            </div>

            {threatSegments.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-700 bg-gray-800">
                    {/* ThreatSeekerBar will be inserted here with actual segment data */}
                </div>
            )}
        </div>
    );
}

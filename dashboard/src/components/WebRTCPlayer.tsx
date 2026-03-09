import { useEffect, useRef, useState } from 'react';
import { Camera, WifiOff } from 'lucide-react';

interface WebRTCPlayerProps {
    cameraId: string;
    nodeBaseUrl: string;
    nodePort: number;
    accessToken: string;
}

type PlayerStatus = 'connecting' | 'live' | 'error';

export default function WebRTCPlayer({
    cameraId, nodeBaseUrl, nodePort, accessToken
}: WebRTCPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [status, setStatus] = useState<PlayerStatus>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let pc: RTCPeerConnection;
        let isMounted = true;

        async function start() {
            try {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                });
                pcRef.current = pc;

                // We need a receive-only transceiver for video
                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                pc.ontrack = (evt) => {
                    if (!isMounted || !videoRef.current) return;
                    if (evt.streams && evt.streams[0]) {
                        videoRef.current.srcObject = evt.streams[0];
                        videoRef.current.play().catch(() => {
                            if (videoRef.current) {
                                videoRef.current.muted = true;
                                videoRef.current.play().catch(() => {});
                            }
                        });
                        if (isMounted) setStatus('live');
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    if (!isMounted) return;
                    const state = pc.iceConnectionState;
                    if (state === 'failed' || state === 'disconnected') {
                        setStatus('error');
                        setErrorMsg('Connection lost');
                    }
                };

                // Create SDP offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Send offer to Node's WHEP proxy
                const whepUrl = `${nodeBaseUrl}:${nodePort}/webrtc/${cameraId}/whep?token=${encodeURIComponent(accessToken)}`;
                const response = await fetch(whepUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/sdp'
                    },
                    body: pc.localDescription!.sdp,
                });

                if (!response.ok) {
                    throw new Error(`WHEP error ${response.status}: ${await response.text()}`);
                }

                const answerSdp = await response.text();
                await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            } catch (err: any) {
                if (isMounted) {
                    setStatus('error');
                    setErrorMsg(err?.message || 'WebRTC failed');
                }
            }
        }

        start();

        return () => {
            isMounted = false;
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [cameraId, nodeBaseUrl, nodePort, accessToken]);

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            {/* Title bar */}
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700 bg-gray-800">
                <Camera className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-white uppercase tracking-wide truncate">
                    {cameraId.replace(/_/g, ' ')}
                </span>
                <span className={`ml-auto text-xs font-semibold shrink-0 ${
                    status === 'live' ? 'text-green-400' :
                    status === 'error' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                    {status === 'live' ? '● LIVE' : status === 'error' ? errorMsg : 'Connecting…'}
                </span>
            </div>

            {/* Video */}
            <div className="relative bg-black aspect-video">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                    autoPlay
                />
                {status === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Establishing WebRTC…</p>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
                        <div className="text-center px-4">
                            <WifiOff className="w-8 h-8 mx-auto mb-2 text-red-500 opacity-60" />
                            <p className="text-xs text-red-400">{errorMsg || 'Stream unavailable'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

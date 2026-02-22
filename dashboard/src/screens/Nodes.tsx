import { useState, useEffect, useRef } from 'react';
import request from '../utils/request';
import { Monitor, Camera, ExternalLink, RefreshCw } from 'lucide-react';
import mpegts from 'mpegts.js';

interface NodeCamera {
    id: number;
    camera_id: string;
    stream_key: string;
    is_active: boolean;
    flv_url: string;
}

interface Node {
    id: number;
    user_email: string;
    label: string;
    base_url: string;
    port: number;
    srs_port: number;
    last_seen: string;
    cameras: NodeCamera[];
}

// ---------------------------------------------------------------------------
// Single camera video player (mpegts.js → HTTP-FLV)
// ---------------------------------------------------------------------------
function NodeCameraPlayer({ camera, nodeBaseUrl, nodeSrsPort }: {
    camera: NodeCamera;
    nodeBaseUrl: string;
    nodeSrsPort: number;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<mpegts.Player | null>(null);
    const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Direct HTTP-FLV URL on the node's SRS server
    const streamUrl = `${nodeBaseUrl}:${nodeSrsPort}/live/${camera.stream_key}.flv`;

    useEffect(() => {
        if (!mpegts.getFeatureList().mseLivePlayback) {
            setStatus('error');
            setErrorMsg('MSE not supported in this browser');
            return;
        }

        let isMounted = true;
        const player = mpegts.createPlayer(
            { type: 'flv', url: streamUrl, isLive: true, hasAudio: false, cors: true },
            { enableWorker: true, enableStashBuffer: false }
        );
        playerRef.current = player;

        const tryPlay = async () => {
            if (!videoRef.current || !isMounted) return;
            player.attachMediaElement(videoRef.current);
            player.load();
            try {
                await player.play();
                if (isMounted) setStatus('live');
            } catch {
                if (videoRef.current) {
                    videoRef.current.muted = true;
                    try {
                        await player.play();
                        if (isMounted) setStatus('live');
                    } catch (e) {
                        if (isMounted) { setStatus('error'); setErrorMsg('Stream unavailable'); }
                    }
                }
            }
        };

        tryPlay();

        return () => {
            isMounted = false;
            try { player.pause(); player.unload(); player.detachMediaElement(); player.destroy(); }
            catch { /* ignore */ }
            playerRef.current = null;
        };
    }, [streamUrl]);

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            {/* Title bar */}
            <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700 bg-gray-800">
                <Camera className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-white uppercase tracking-wide truncate">
                    {camera.camera_id.replace(/_/g, ' ')}
                </span>
                {status === 'error' && (
                    <span className="text-xs text-red-400 ml-auto shrink-0">{errorMsg}</span>
                )}
                {status === 'live' && (
                    <span className="text-xs text-green-400 ml-auto shrink-0 font-semibold">LIVE</span>
                )}
            </div>
            {/* Video */}
            <div className="relative bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />
                {status === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                            <p className="text-xs">Connecting to stream…</p>
                            <p className="text-xs text-gray-600 mt-1 font-mono break-all px-2">{streamUrl}</p>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                        <div className="text-center px-4">
                            <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">{errorMsg || 'Stream unavailable'}</p>
                            <p className="text-xs mt-1 text-gray-700 font-mono break-all">{streamUrl}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Nodes page
// ---------------------------------------------------------------------------
export default function Nodes() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchNodes = async () => {
        setIsLoading(true);
        try {
            const data = await request.get('/nodes/');
            setNodes(data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch nodes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNodes();
        const interval = setInterval(fetchNodes, 10_000); // poll every 10 s
        return () => clearInterval(interval);
    }, []);

    const totalCameras = nodes.reduce((sum, n) => sum + n.cameras.filter(c => c.is_active).length, 0);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white">Nodes</h1>
                        <p className="text-gray-400 mt-2">
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                            {totalCameras > 0 && ` · ${totalCameras} active camera${totalCameras !== 1 ? 's' : ''}`}
                            {lastRefresh && (
                                <span className="ml-2 text-gray-600">
                                    · refreshed {lastRefresh.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={fetchNodes}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </header>

                {/* States */}
                {isLoading && nodes.length === 0 ? (
                    <div className="flex items-center justify-center py-24 text-gray-500">
                        <div className="text-center">
                            <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-500" />
                            <p>Loading nodes…</p>
                        </div>
                    </div>
                ) : nodes.length === 0 ? (
                    <div className="text-center py-24 border border-gray-800 rounded-xl bg-gray-800/30 text-gray-500">
                        <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-semibold mb-2">No active nodes</p>
                        <p className="text-sm">Start a CVSentry Desktop Client and log in to register it here.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {nodes.map(node => {
                            const activeCameras = node.cameras.filter(c => c.is_active);
                            return (
                                <div key={node.id} className="bg-gray-800/60 rounded-2xl border border-gray-700 p-6">
                                    {/* Node header */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">
                                                {node.label || `Node #${node.id}`}
                                            </h2>
                                            <p className="text-sm text-gray-400 mt-0.5">
                                                {node.user_email}
                                                <span className="mx-1.5 text-gray-600">·</span>
                                                <span className="font-mono">{node.base_url}:{node.port}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            {activeCameras.length > 0 && (
                                                <span className="flex items-center gap-1.5">
                                                    <Camera className="w-4 h-4" />
                                                    {activeCameras.length} active
                                                </span>
                                            )}
                                            <a
                                                href={`${node.base_url}:${node.port}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Open node API"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Camera feeds */}
                                    {activeCameras.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {activeCameras.map(camera => (
                                                <NodeCameraPlayer
                                                    key={camera.id}
                                                    camera={camera}
                                                    nodeBaseUrl={node.base_url}
                                                    nodeSrsPort={node.srs_port}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border border-gray-700/50 rounded-xl text-gray-600 text-sm">
                                            <Camera className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                            No active camera feeds on this node
                                        </div>
                                    )}

                                    {/* Last seen */}
                                    <p className="text-xs text-gray-600 mt-4">
                                        Last seen: {new Date(node.last_seen).toLocaleString()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Monitor, Camera, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Clock } from 'lucide-react';
import request from '../utils/request';
import WebRTCPlayer from '../components/WebRTCPlayer';
import type { Node, LiveStream } from '../types/node';

export default function Nodes() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [expandedNodeId, setExpandedNodeId] = useState<number | null>(null);


    const fetchNodes = async () => {
        setIsLoading(true);
        try {
            const data = await request.get('/nodes/');
            setNodes(data);
            setLastRefresh(new Date());
        } catch {
            /* silently fail */
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLiveStreams = async () => {
        try {
            const data = await request.get('/api/v1/streams/');
            setLiveStreams(data || []);
        } catch { }
    };

    useEffect(() => {
        fetchNodes();
        fetchLiveStreams();
        const interval = setInterval(() => {
            fetchNodes();
            fetchLiveStreams();
        }, 15_000);
        return () => clearInterval(interval);
    }, []);

    const toggleNode = (nodeId: number) => {
        setExpandedNodeId(prev => (prev === nodeId ? null : nodeId));
    };

    const totalCameras = nodes.reduce((s, n) => s + n.cameras.filter(c => c.is_active).length, 0);
    const activeStreamsCount = liveStreams.filter(s => s.is_active).length;

    return (
        <div className="min-h-screen bg-transparent text-gray-100 pt-8 pb-28 px-4 sm:pt-28 sm:pb-12 sm:px-8">
            <div className="max-w-7xl mx-auto">

                <header className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Nodes</h1>
                        <p className="text-gray-400 mt-1 text-sm">
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                            {totalCameras > 0 && ` · ${totalCameras} active camera${totalCameras !== 1 ? 's' : ''}`}
                            {activeStreamsCount > 0 && ` · ${activeStreamsCount} live stream${activeStreamsCount !== 1 ? 's' : ''}`}
                            {lastRefresh && (
                                <span className="ml-2 text-gray-600">
                                    · updated {lastRefresh.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => { fetchNodes(); fetchLiveStreams(); }}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </header>

                {!isLoading && nodes.length === 0 && activeStreamsCount === 0 && (
                    <div className="text-center py-32 px-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl text-gray-400">
                        <Monitor className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold mb-1">No active nodes</p>
                        <p className="text-sm">Start a CVSentry Desktop Client and log in to register it here.</p>
                    </div>
                )}



                {/* Node list */}
                <div className="space-y-3">
                    {nodes.map(node => {
                        const activeCameras = node.cameras.filter(c => c.is_active);
                        const isExpanded = expandedNodeId === node.id;

                        return (
                            <div
                                key={node.id}
                                className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden
                                    ${isExpanded
                                        ? 'border-blue-500/50 bg-white/10 backdrop-blur-lg shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                        : 'border-white/10 bg-white/5 backdrop-blur-md hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <button
                                    onClick={() => toggleNode(node.id)}
                                    className="w-full flex items-center gap-4 px-4 sm:px-6 py-4 text-left"
                                >
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse shrink-0" />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-white">
                                            {node.label || `Node #${node.id}`}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {node.user_email}
                                            <span className="mx-1.5 text-gray-700">·</span>
                                            <span className="font-mono">{node.base_url}:{node.port}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-sm text-emerald-400 shrink-0">
                                        <Camera className="w-4 h-4" />
                                        {activeCameras.length} active
                                    </div>

                                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {new Date(node.last_seen).toLocaleTimeString()}
                                    </div>

                                    <a
                                        href={`${node.base_url}:${node.port}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="text-blue-400 hover:text-blue-300 shrink-0 ml-1"
                                        title="Open node API"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>

                                    <div className="shrink-0 ml-1 text-gray-400">
                                        {isExpanded
                                            ? <ChevronDown className="w-5 h-5" />
                                            : <ChevronRight className="w-5 h-5" />
                                        }
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 sm:px-6 pb-6 border-t border-white/10 bg-white/5">
                                        <div className="pt-5">
                                            {activeCameras.length === 0 ? (
                                                <div className="text-center py-10 border border-white/10 rounded-xl text-gray-400 text-sm bg-black/20">
                                                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    No active camera feeds on this node
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                        Streaming {activeCameras.length} camera{activeCameras.length !== 1 ? 's' : ''} via WebRTC
                                                    </p>
                                                    <div className={`grid gap-4
                                                        ${activeCameras.length === 1 ? 'grid-cols-1 max-w-xl' :
                                                            activeCameras.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                                                                'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
                                                    >
                                                        {activeCameras.map(camera => (
                                                            <WebRTCPlayer
                                                                key={camera.id}
                                                                cameraId={camera.camera_id}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

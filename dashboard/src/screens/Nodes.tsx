import { useState, useEffect } from 'react';
import { Monitor, Camera, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Clock } from 'lucide-react';
import request, { getAccessToken } from '../utils/request';
import WebRTCPlayer from '../components/WebRTCPlayer';

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

export default function Nodes() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [expandedNodeId, setExpandedNodeId] = useState<number | null>(null);

    const accessToken = getAccessToken() ?? '';

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

    useEffect(() => {
        fetchNodes();
        const interval = setInterval(fetchNodes, 15_000); // poll every 15 s
        return () => clearInterval(interval);
    }, []);

    const toggleNode = (nodeId: number) => {
        setExpandedNodeId(prev => (prev === nodeId ? null : nodeId));
    };

    const totalCameras = nodes.reduce((s, n) => s + n.cameras.filter(c => c.is_active).length, 0);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 pb-12 px-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <header className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Nodes</h1>
                        <p className="text-gray-400 mt-1 text-sm">
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                            {totalCameras > 0 && ` · ${totalCameras} active camera${totalCameras !== 1 ? 's' : ''}`}
                            {lastRefresh && (
                                <span className="ml-2 text-gray-600">
                                    · updated {lastRefresh.toLocaleTimeString()}
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

                {/* Empty state */}
                {!isLoading && nodes.length === 0 && (
                    <div className="text-center py-24 border border-gray-800 rounded-2xl bg-gray-900/30 text-gray-500">
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
                                className={`rounded-2xl border transition-all duration-200
                                    ${isExpanded
                                        ? 'border-blue-500/30 bg-gray-900'
                                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                                    }`}
                            >
                                {/* Node header row — clicking expands/collapses */}
                                <button
                                    onClick={() => toggleNode(node.id)}
                                    className="w-full flex items-center gap-4 px-6 py-4 text-left"
                                >
                                    {/* Online dot */}
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />

                                    {/* Label + meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-white">
                                            {node.label || `Node #${node.id}`}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {node.user_email}
                                            <span className="mx-1.5 text-gray-700">·</span>
                                            <span className="font-mono">{node.base_url}:{node.port}</span>
                                        </p>
                                    </div>

                                    {/* Camera count */}
                                    <div className="flex items-center gap-1.5 text-sm text-emerald-400 shrink-0">
                                        <Camera className="w-4 h-4" />
                                        {activeCameras.length} active
                                    </div>

                                    {/* Last seen */}
                                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {new Date(node.last_seen).toLocaleTimeString()}
                                    </div>

                                    {/* External link */}
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

                                    {/* Expand chevron */}
                                    <div className="shrink-0 ml-1 text-gray-500">
                                        {isExpanded
                                            ? <ChevronDown className="w-5 h-5" />
                                            : <ChevronRight className="w-5 h-5" />
                                        }
                                    </div>
                                </button>

                                {/* Expanded camera feeds */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 border-t border-gray-800">
                                        <div className="pt-5">
                                            {activeCameras.length === 0 ? (
                                                <div className="text-center py-10 border border-gray-800 rounded-xl text-gray-600 text-sm">
                                                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    No active camera feeds on this node
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
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
                                                                cameraId={camera.stream_key}
                                                                nodeBaseUrl={node.base_url}
                                                                nodePort={node.port}
                                                                accessToken={accessToken}
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

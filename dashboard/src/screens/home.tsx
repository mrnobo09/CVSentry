import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, ShieldAlert, Camera, Activity, ArrowRight, Clock } from 'lucide-react';
import request from '../utils/request';
import { useAlerts } from '../hooks/useAlerts';

interface NodeSummary {
    id: number;
    label: string;
    base_url: string;
    port: number;
    cameras: { is_active: boolean }[];
}

export default function Home() {
    const [nodes, setNodes] = useState<NodeSummary[]>([]);
    const { alerts, unreadCount } = useAlerts();

    useEffect(() => {
        request.get('/nodes/').then(setNodes).catch(() => {});
    }, []);

    const activeNodes = nodes.length;
    const activeCameras = nodes.reduce((s, n) => s + n.cameras.filter(c => c.is_active).length, 0);
    const recentAlerts = alerts.slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto">

                {/* Hero */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-white">
                        Security Overview
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Real-time threat intelligence across all your CVSentry nodes.
                    </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                    {[
                        {
                            label: 'Active Nodes',
                            value: activeNodes,
                            icon: Monitor,
                            color: 'blue',
                            href: '/nodes',
                        },
                        {
                            label: 'Active Cameras',
                            value: activeCameras,
                            icon: Camera,
                            color: 'emerald',
                            href: '/nodes',
                        },
                        {
                            label: 'Unread Alerts',
                            value: unreadCount,
                            icon: ShieldAlert,
                            color: unreadCount > 0 ? 'red' : 'gray',
                            href: '/alerts',
                        },
                    ].map(({ label, value, icon: Icon, color, href }) => (
                        <Link
                            key={label}
                            to={href}
                            className={`group bg-gray-900 border rounded-2xl p-6 flex items-center gap-5
                                border-gray-800 hover:border-${color}-500/40 transition-all`}
                        >
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center
                                bg-${color}-600/10 border border-${color}-500/20
                                group-hover:border-${color}-500/40 transition-colors`}>
                                <Icon className={`w-7 h-7 text-${color}-400`} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">{value}</p>
                                <p className="text-sm text-gray-400">{label}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Recent Alerts */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-red-400" />
                                Recent Alerts
                            </h2>
                            <Link
                                to="/alerts"
                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                View all <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-800">
                            {recentAlerts.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-600">
                                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No alerts yet. System is monitoring.</p>
                                </div>
                            ) : recentAlerts.map(alert => (
                                <div key={alert.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-gray-800/40 transition-colors">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0
                                        ${alert.severity === 'severe' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white truncate uppercase">
                                                {alert.severity} THREAT
                                            </span>
                                            {alert.identities?.length > 0 && (
                                                <span className="text-xs text-red-400 truncate">
                                                    — {alert.identities.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span className="font-mono">{alert.camera_id}</span>
                                            <span>·</span>
                                            <span>{alert.node_label || alert.node_ip}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Node Quick View */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-400" />
                                Connected Nodes
                            </h2>
                            <Link
                                to="/nodes"
                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Manage <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-800">
                            {nodes.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-600">
                                    <Monitor className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No nodes connected. Start a Desktop Client.</p>
                                </div>
                            ) : nodes.map(node => {
                                const active = node.cameras.filter(c => c.is_active).length;
                                return (
                                    <div key={node.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-800/40 transition-colors">
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">
                                                {node.label || `Node #${node.id}`}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono">{node.base_url}:{node.port}</p>
                                        </div>
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
                                            <Camera className="w-3.5 h-3.5" />
                                            {active} active
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
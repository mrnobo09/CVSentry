import { useState, useEffect } from 'react';
import { ShieldAlert, Camera, User, Search, Filter, Clock } from 'lucide-react';
import request from '../utils/request';
import type { Alert } from '../hooks/useAlerts';

const PAGE_SIZE = 25;

export default function Alerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const data: Alert[] = await request.get(`/alerts/?limit=${PAGE_SIZE}`);
                setAlerts(data || []);
            } catch {
                setAlerts([]);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const filtered = alerts.filter(a => {
        const matchesType = typeFilter === 'ALL' || a.alert_type === typeFilter;
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            a.camera_id.toLowerCase().includes(q) ||
            a.node_label?.toLowerCase().includes(q) ||
            a.identities?.some(id => id.toLowerCase().includes(q));
        return matchesType && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 pb-12 px-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-400" />
                        Alert History
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">All threat events detected across your nodes</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search camera, node, identity…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        {['ALL', 'COMBINED_THREAT', 'WEAPON_DETECTED', 'FACE_RECOGNIZED'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    typeFilter === type
                                        ? 'bg-red-600/20 border-red-500/40 text-red-300'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                                }`}
                            >
                                {type === 'ALL' ? 'All Types' : type.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-24 text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                        Loading alerts…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 border border-gray-800 rounded-2xl bg-gray-900/40 text-gray-500">
                        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">No alerts found</p>
                        <p className="text-sm mt-1">Alerts from your nodes will appear here when threats are detected.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-800 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3 bg-gray-800/60 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <span>Time</span>
                            <span>Node</span>
                            <span>Camera</span>
                            <span>Identities</span>
                            <span>Type</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-gray-800">
                            {filtered.map(alert => (
                                <div
                                    key={alert.id}
                                    className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3.5
                                        hover:bg-gray-800/40 transition-colors items-center"
                                >
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                    </div>

                                    <div className="text-sm text-gray-300 truncate" title={alert.node_label}>
                                        {alert.node_label || alert.node_ip}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-sm text-gray-300">
                                        <Camera className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                                        <span className="font-mono text-xs">{alert.camera_id}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {alert.identities && alert.identities.length > 0 ? (
                                            alert.identities.map((id, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1 text-xs bg-red-900/40 border border-red-700/40 text-red-300 px-2 py-0.5 rounded-full"
                                                >
                                                    <User className="w-3 h-3" />
                                                    {id}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-600">—</span>
                                        )}
                                    </div>

                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap
                                        ${alert.alert_type === 'COMBINED_THREAT'
                                            ? 'bg-red-900/40 border-red-700/40 text-red-300'
                                            : alert.alert_type === 'WEAPON_DETECTED'
                                            ? 'bg-amber-900/40 border-amber-700/40 text-amber-300'
                                            : 'bg-blue-900/40 border-blue-700/40 text-blue-300'
                                        }`}>
                                        {alert.alert_type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

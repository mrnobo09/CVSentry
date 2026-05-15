import { useState, useEffect } from 'react';
import { ShieldAlert, Camera, User, Search, Filter, Clock, Crosshair, Calendar } from 'lucide-react';
import request from '../utils/request';
import type { Alert } from '../hooks/useAlerts';

const PAGE_SIZE = 50;

export default function Alerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                let url = `/alerts/?limit=${PAGE_SIZE}`;
                if (dateFilter) {
                    url += `&date=${dateFilter}`;
                }
                const data: Alert[] = await request.get(url);
                setAlerts(data || []);
            } catch {
                setAlerts([]);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [dateFilter]);

    const filtered = alerts.filter(a => {
        const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter.toLowerCase();
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            a.camera_id.toLowerCase().includes(q) ||
            a.node_label?.toLowerCase().includes(q) ||
            a.identities?.some(id => id.toLowerCase().includes(q));
        return matchesSeverity && matchesSearch;
    });

    const formatDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        if (diff < 1000) return 'Instant';
        return `${Math.round(diff / 1000)}s`;
    };

    return (
        <div className="min-h-screen bg-transparent text-gray-100 pt-8 pb-28 px-4 sm:pt-28 sm:pb-12 sm:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-400" />
                        Threat History
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Historical records of all detected threats.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search camera, node, identity…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                        />
                    </div>

                    <div className="relative max-w-xs">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [color-scheme:dark] backdrop-blur-sm transition-all duration-300"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        {['ALL', 'NORMAL', 'SEVERE'].map(sev => (
                            <button
                                key={sev}
                                onClick={() => setSeverityFilter(sev)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${severityFilter === sev
                                    ? sev === 'SEVERE' ? 'bg-red-600/20 border-red-500/40 text-red-300'
                                        : 'bg-yellow-600/20 border-yellow-500/40 text-yellow-300'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-24 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                        Loading history…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-32 px-12 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md shadow-xl text-gray-400">
                        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">No threats found</p>
                        <p className="text-sm mt-1">Adjust your filters or date selection to see historical data.</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md shadow-xl">
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3 bg-black/20 border-b border-white/10 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            <span>Time & Duration</span>
                            <span>Node / Camera</span>
                            <span>Weapons</span>
                            <span>Identities</span>
                            <span>Severity</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5">
                            {filtered.map(alert => (
                                <div
                                    key={alert.id}
                                    className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3.5
                                        hover:bg-white/10 transition-colors items-center duration-200"
                                >
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 ml-5">
                                            {new Date(alert.timestamp).toLocaleDateString()}
                                            <span className="mx-1">•</span>
                                            {formatDuration(alert.timestamp, alert.updated_at)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-sm text-gray-300 truncate" title={alert.node_label}>
                                            {alert.node_label || alert.node_ip}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                            <Camera className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                                            <span className="font-mono">{alert.camera_id}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {alert.number_of_guns > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 text-sm text-amber-400">
                                                <Crosshair className="w-4 h-4" />
                                                <span className="font-semibold">{alert.number_of_guns}</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-600">—</span>
                                        )}
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

                                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap uppercase text-center min-w-[90px]
                                        ${alert.severity === 'severe'
                                            ? 'bg-red-900/40 border-red-700/40 text-red-300'
                                            : 'bg-yellow-900/40 border-yellow-700/40 text-yellow-300'
                                        }`}>
                                        {alert.severity}
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

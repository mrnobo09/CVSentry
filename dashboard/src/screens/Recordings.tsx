import { useState, useEffect } from 'react';
import { Film, Search, Calendar, Filter, ChevronRight } from 'lucide-react';
import request from '../utils/request';
import RecordingPlayer from '../components/RecordingPlayer';

interface Recording {
    id: string;
    node_label: string;
    camera_id: string;
    status: string;
    total_duration_ms: number;
    total_size_bytes: number;
    segment_count: number;
    started_at: string;
    ended_at: string | null;
    threat_segments: { offset_ms: number; severity: string }[];
}

export default function Recordings() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const fetchRecordings = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = { limit: '50' };
            if (filterDate) params.date = filterDate;
            const data = await request.get('/api/v1/recordings/', { params });
            setRecordings(data || []);
        } catch {} finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecordings();
    }, [filterDate]);

    const filtered = recordings.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.camera_id.toLowerCase().includes(q) ||
            (r.node_label || '').toLowerCase().includes(q)
        );
    });

    const formatDuration = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    if (selectedRecording) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => setSelectedRecording(null)}
                        className="mb-4 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to recordings
                    </button>
                    <RecordingPlayer recordingId={selectedRecording} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 pt-20 pb-12 px-6">
            <div className="max-w-7xl mx-auto">

                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Recordings</h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        {recordings.length} recording{recordings.length !== 1 ? 's' : ''} stored
                    </p>
                </header>

                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by camera or node…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-24 border border-gray-800 rounded-2xl bg-gray-900/30 text-gray-500">
                        <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold mb-1">No recordings found</p>
                        <p className="text-sm">Recordings from live streams will appear here automatically.</p>
                    </div>
                )}

                <div className="grid gap-3">
                    {filtered.map(rec => (
                        <button
                            key={rec.id}
                            onClick={() => setSelectedRecording(rec.id)}
                            className="flex items-center gap-4 w-full text-left px-5 py-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                rec.status === 'recording' ? 'bg-red-900/30' :
                                rec.status === 'completed' ? 'bg-green-900/30' :
                                'bg-gray-800'
                            }`}>
                                <Film className={`w-5 h-5 ${
                                    rec.status === 'recording' ? 'text-red-400 animate-pulse' :
                                    rec.status === 'completed' ? 'text-green-400' :
                                    'text-gray-500'
                                }`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {rec.camera_id.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {rec.node_label || 'Unknown node'}
                                    <span className="mx-1.5 text-gray-700">·</span>
                                    {new Date(rec.started_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="text-right shrink-0 hidden sm:block">
                                <p className="text-sm text-gray-300 font-mono">
                                    {formatDuration(rec.total_duration_ms)}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {rec.segment_count} segments · {formatSize(rec.total_size_bytes)}
                                </p>
                            </div>

                            <div className="hidden sm:flex items-center gap-1 shrink-0">
                                {rec.threat_segments && rec.threat_segments.length > 0 && (
                                    <>
                                        {rec.threat_segments.some(s => s.severity === 'severe') && (
                                            <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-xs font-medium">
                                                SEVERE
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded text-xs font-medium">
                                            {rec.threat_segments.length} threats
                                        </span>
                                    </>
                                )}
                                {(!rec.threat_segments || rec.threat_segments.length === 0) && (
                                    <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded text-xs">
                                        No threats
                                    </span>
                                )}
                            </div>

                            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase shrink-0 ${
                                rec.status === 'recording' ? 'bg-red-900/50 text-red-300' :
                                rec.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                                'bg-gray-800 text-gray-500'
                            }`}>
                                {rec.status}
                            </span>

                            <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

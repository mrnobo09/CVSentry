import { useRef, useCallback, useState } from 'react';
import type { ThreatSegment } from '../types/streaming';

interface Props {
    segments: ThreatSegment[];
    durationMs: number;
    currentTimeMs: number;
    onSeek: (timeMs: number) => void;
}

export default function ThreatSeekerBar({ segments, durationMs, currentTimeMs, onSeek }: Props) {
    const barRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [hoverPos, setHoverPos] = useState(0);

    const percent = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!barRef.current || durationMs <= 0) return;
        const rect = barRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        onSeek(pct * durationMs);
    }, [durationMs, onSeek]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!barRef.current) return;
        const rect = barRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setHoverPos(x / rect.width);
    }, []);

    const buildRegions = () => {
        if (durationMs <= 0 || segments.length === 0) return null;

        return segments.map((seg) => {
            const left = (seg.start_ms / durationMs) * 100;
            const width = ((seg.end_ms - seg.start_ms) / durationMs) * 100;
            return {
                left,
                width: Math.max(width, 0.3),
                severity: seg.severity
            };
        });
    };

    const regions = buildRegions();

    return (
        <div className="relative w-full group">
            <div
                ref={barRef}
                className="relative h-6 bg-gray-800 rounded-full cursor-pointer overflow-hidden border border-gray-700"
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onMouseMove={handleMouseMove}
            >
                {regions && regions.map((r, i) => (
                    <div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                            left: `${r.left}%`,
                            width: `${r.width}%`,
                            backgroundColor: r.severity === 'severe' ? 'rgba(239,68,68,0.5)' : 'rgba(251,146,60,0.4)',
                        }}
                    />
                ))}

                <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100 pointer-events-none"
                    style={{ width: `${Math.min(percent, 100)}%`, opacity: 0.3 }}
                />

                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full shadow pointer-events-none"
                    style={{ left: `calc(${Math.min(percent, 100)}% - 6px)` }}
                />
            </div>

            {hovered && (
                <div
                    className="absolute -top-8 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow border border-gray-700 pointer-events-none"
                    style={{ left: `${hoverPos * 100}%`, transform: 'translateX(-50%)' }}
                >
                    {formatTime(hoverPos * durationMs)}
                </div>
            )}

            {regions && regions.length > 0 && (
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block bg-orange-400/50" />
                        <span>Normal threat</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-500/50" />
                        <span>Severe threat</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

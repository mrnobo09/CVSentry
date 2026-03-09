import { useState, useEffect, useRef, useCallback } from 'react';
import request from '../utils/request';

export interface Alert {
    id: number;
    node_label: string;
    node_ip: string;
    camera_id: string;
    frame_id: string;
    alert_type: string;
    identities: string[];
    timestamp: string;
    created_at: string;
}

interface UseAlertsResult {
    alerts: Alert[];
    latestAlert: Alert | null;
    unreadCount: number;
    clearUnread: () => void;
}

const POLL_INTERVAL_MS = 5000;

// Audio singleton — reuse across renders
let alertAudio: HTMLAudioElement | null = null;
function playAlertSound() {
    try {
        if (!alertAudio) {
            alertAudio = new Audio('/alert.mp3');
            alertAudio.volume = 0.8;
        }
        alertAudio.currentTime = 0;
        alertAudio.play().catch(() => {/* autoplay blocked — ignore */});
    } catch { /* ignore */ }
}

export function useAlerts(): UseAlertsResult {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const sinceRef = useRef<string | null>(null);
    const initialLoad = useRef(true);

    const fetchAlerts = useCallback(async () => {
        try {
            const params = sinceRef.current
                ? `?since=${encodeURIComponent(sinceRef.current)}&limit=20`
                : '?limit=50';
            const data: Alert[] = await request.get(`/alerts/${params}`);

            if (data && data.length > 0) {
                // Update the "since" cursor to the most recent timestamp
                sinceRef.current = data[0].timestamp;

                if (initialLoad.current) {
                    // On first load just populate history, no alarm
                    setAlerts(data);
                    initialLoad.current = false;
                } else {
                    // New alerts — notify
                    setAlerts(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const fresh = data.filter(a => !existingIds.has(a.id));
                        if (fresh.length > 0) {
                            const newest = fresh[0];
                            setLatestAlert(newest);
                            setUnreadCount(c => c + fresh.length);
                            if (['COMBINED_THREAT', 'WEAPON_DETECTED', 'FACE_RECOGNIZED'].includes(newest.alert_type)) {
                                playAlertSound();
                            }
                        }
                        return [...fresh, ...prev].slice(0, 200);
                    });
                }
            } else if (initialLoad.current) {
                initialLoad.current = false;
            }
        } catch {
            // silently fail — don't spam the user with auth errors
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    const clearUnread = useCallback(() => {
        setUnreadCount(0);
        setLatestAlert(null);
    }, []);

    return { alerts, latestAlert, unreadCount, clearUnread };
}

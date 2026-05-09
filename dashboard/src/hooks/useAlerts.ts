import { useState, useEffect, useRef, useCallback } from 'react';
import request from '../utils/request';

export interface Alert {
    id: number;
    threat_id: string | null;
    node_label: string;
    node_ip: string;
    camera_id: string;
    frame_id: string;
    alert_type: string;
    severity: string;
    number_of_guns: number;
    identities: string[];
    timestamp: string;
    updated_at: string;
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
                // Update the "since" cursor to the most recent updated_at timestamp
                // The backend sorts by -updated_at, so data[0] is the most recently updated
                sinceRef.current = data[0].updated_at;

                if (initialLoad.current) {
                    // On first load just populate history, no alarm
                    setAlerts(data);
                    initialLoad.current = false;
                } else {
                    // New or updated alerts — notify and merge
                    setAlerts(prev => {
                        const updatedMap = new Map(data.map(a => [a.id, a]));
                        const newAlerts = data.filter(a => !prev.find(p => p.id === a.id));
                        
                        // Replace updated ones, append entirely new ones
                        let merged = prev.map(p => updatedMap.get(p.id) || p);
                        merged = [...newAlerts, ...merged].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

                        if (newAlerts.length > 0 || data.some(a => a.severity === 'severe')) {
                            const newest = data[0];
                            setLatestAlert(newest);
                            // Only increment unread for genuinely new alerts
                            setUnreadCount(c => c + newAlerts.length);
                            if (newest.severity === 'severe' || newAlerts.length > 0) {
                                playAlertSound();
                            }
                        }
                        return merged.slice(0, 200);
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

import { useEffect, useState } from 'react';
import { ShieldAlert, X, Camera, User } from 'lucide-react';
import type { Alert } from '../hooks/useAlerts';

interface AlertBannerProps {
    alert: Alert;
    onDismiss: () => void;
}

const AUTO_DISMISS_MS = 10000;

export default function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setVisible(true));

        // Progress bar countdown
        const start = Date.now();
        const tick = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
            setProgress(pct);
            if (pct === 0) {
                clearInterval(tick);
                handleDismiss();
            }
        }, 50);

        return () => clearInterval(tick);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 300); // wait for slide-out
    };

    const isCombined = alert.alert_type === 'COMBINED_THREAT';
    const isFace = alert.alert_type === 'FACE_RECOGNIZED';

    let containerClasses = 'bg-amber-950/95 border-amber-500/60 shadow-amber-900/50';
    let progressClasses = 'bg-amber-400';
    let iconBgClasses = 'bg-amber-500/20';
    let iconClasses = 'text-amber-400';
    let titleClasses = 'text-amber-300';
    let titleText = '⚠ Weapon Detected';

    if (isFace) {
        containerClasses = 'bg-orange-950/95 border-orange-500/60 shadow-orange-900/50';
        progressClasses = 'bg-orange-400';
        iconBgClasses = 'bg-orange-500/20';
        iconClasses = 'text-orange-400';
        titleClasses = 'text-orange-300';
        titleText = '⚠ Severe Threat: Target Recognized';
    } else if (isCombined) {
        containerClasses = 'bg-red-950/95 border-red-500/60 shadow-red-900/50';
        progressClasses = 'bg-red-400';
        iconBgClasses = 'bg-red-500/20';
        iconClasses = 'text-red-400 animate-pulse';
        titleClasses = 'text-red-300';
        titleText = '⚠ Highly Severe: Armed Suspect';
    }

    return (
        <div
            className={`fixed top-4 right-4 z-[9999] w-full max-w-md transition-all duration-300
                ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
        >
            <div className={`rounded-2xl border shadow-2xl overflow-hidden ${containerClasses}`}>
                {/* Auto-dismiss progress bar */}
                <div className="h-0.5 bg-white/10 w-full">
                    <div
                        className={`h-full transition-none ${progressClasses}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="p-4">
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClasses}`}>
                            <ShieldAlert className={`w-5 h-5 ${iconClasses}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-bold tracking-wide uppercase ${titleClasses}`}>
                                    {titleText}
                                </p>
                                <button
                                    onClick={handleDismiss}
                                    className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mt-1.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-white/60">
                                    <Camera className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-mono">{alert.camera_id.replace(/_/g, ' ')}</span>
                                    <span className="text-white/30">·</span>
                                    <span>{alert.node_label}</span>
                                </div>

                                {alert.identities && alert.identities.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <User className="w-3.5 h-3.5 shrink-0 text-red-400" />
                                        <span className="text-red-300 font-semibold">
                                            {alert.identities.join(', ')}
                                        </span>
                                    </div>
                                )}

                                <p className="text-xs text-white/40">
                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

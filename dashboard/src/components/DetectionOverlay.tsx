import { useRef, useEffect, useCallback } from 'react';

interface Detection {
    class_name: string;
    box: [number, number, number, number];
    score: number;
    keypoints?: [number, number][];
    identity?: string;
    recognized?: boolean;
    has_weapon?: boolean;
    is_aiming?: boolean;
    aiming_vec?: [number, number];
    rec_confidence?: number;
}

interface FrameMetadata {
    weapon?: Detection[];
    face?: Detection[];
    combined_threat?: boolean;
}

interface DetectionOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    metadata: FrameMetadata | null;
    enabled: boolean;
}

const SKELETON = [
    [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 6], [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
] as const;

function getColor(det: Detection): string {
    const label = det.class_name;
    if (label === 'THREAT_AIMING') return '#ff0000';
    if (label === 'person_pose') {
        if (det.is_aiming) return '#ff0000';
        if (det.has_weapon) return '#ff8c00';
        return '#00e5ff'; // Cyan
    }
    if (['pistol', 'rifle', 'knife', 'weapon'].includes(label.toLowerCase())) return '#ff0000';
    if (label === 'COMBINED_THREAT') return '#0000dc';
    if (label === 'known_face') return '#00dc64';
    if (label === 'face') return '#00ff00'; // Green
    return '#00ff00';
}

export default function DetectionOverlay({ videoRef, metadata, enabled }: DetectionOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const draw = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        if (!enabled || !metadata) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            animRef.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const displayW = video.clientWidth;
        const displayH = video.clientHeight;

        if (canvas.width !== displayW || canvas.height !== displayH) {
            canvas.width = displayW;
            canvas.height = displayH;
        }

        ctx.clearRect(0, 0, displayW, displayH);

        const scaleX = displayW / vw;
        const scaleY = displayH / vh;

        const allDets: Detection[] = [
            ...(metadata.weapon || []),
            ...(metadata.face || []),
        ];

        for (const det of allDets) {
            const box = det.box;
            if (!box || box.length !== 4) continue;

            const [x1, y1, x2, y2] = box;
            const sx1 = x1 * scaleX;
            const sy1 = y1 * scaleY;
            const sx2 = x2 * scaleX;
            const sy2 = y2 * scaleY;

            const color = getColor(det);
            ctx.strokeStyle = color;
            ctx.lineWidth = det.class_name === 'COMBINED_THREAT' ? 3 : 2;
            ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

            let label = det.class_name;
            let score = det.score || 0;
            if (label === 'known_face' && det.identity) {
                label = `${det.identity} (${(det.rec_confidence || 0).toFixed(2)})`;
            } else if (label === 'COMBINED_THREAT') {
                label = `ARMED SUSPECT: ${det.identity || 'Unknown'}`;
            } else if (label === 'person_pose' && det.is_aiming) {
                label = 'WEAPON THREAT';
            }

            ctx.fillStyle = color;
            const text = `${label} ${score.toFixed(2)}`;
            const textW = ctx.measureText(text).width;
            const textH = 16;
            const textY = Math.max(sy1 - 20, 0);
            ctx.fillRect(sx1, textY, textW + 4, textH + 4);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(text, sx1 + 2, textY + 14);

            if (det.keypoints) {
                const kps = det.keypoints;
                for (const [p1, p2] of SKELETON) {
                    if (p1 < kps.length && p2 < kps.length) {
                        const pt1 = kps[p1];
                        const pt2 = kps[p2];
                        if (pt1[0] > 0 && pt2[0] > 0 && !isNaN(pt1[0]) && !isNaN(pt2[0])) {
                            ctx.beginPath();
                            ctx.moveTo(pt1[0] * scaleX, pt1[1] * scaleY);
                            ctx.lineTo(pt2[0] * scaleX, pt2[1] * scaleY);
                            ctx.strokeStyle = color;
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }
                }
                for (let i = 0; i < kps.length; i++) {
                    const kp = kps[i];
                    if (kp[0] > 0 && kp[1] > 0 && !isNaN(kp[0]) && !isNaN(kp[1])) {
                        ctx.beginPath();
                        ctx.arc(kp[0] * scaleX, kp[1] * scaleY, 3, 0, Math.PI * 2);
                        ctx.fillStyle = (i === 9 || i === 10) && det.has_weapon ? '#ff0000' : color;
                        ctx.fill();
                    }
                }
            }

            if (det.is_aiming && det.aiming_vec) {
                const [avx, avy] = det.aiming_vec;
                const midX = (sx1 + sx2) / 2;
                const midY = (sy1 + sy2) / 2;
                ctx.beginPath();
                ctx.moveTo(midX, midY);
                ctx.lineTo(midX + avx * 200 * scaleX, midY + avy * 200 * scaleY);
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        }

        if (metadata.combined_threat) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.fillRect(0, 0, displayW, 4);
        } else {
            const hasThreat = (metadata.weapon || []).some(
                d => d.class_name !== 'person_pose' || d.has_weapon
            );
            if (hasThreat) {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.15)';
                ctx.fillRect(0, 0, displayW, 4);
            }
        }

        animRef.current = requestAnimationFrame(draw);
    }, [videoRef, metadata, enabled]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        />
    );
}

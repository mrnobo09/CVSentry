export interface Detection {
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

export interface FrameMetadata {
    weapon?: Detection[];
    face?: Detection[];
    combined_threat?: boolean;
}

export interface ThreatSegment {
    start_ms: number;
    end_ms: number;
    severity: 'normal' | 'severe';
}

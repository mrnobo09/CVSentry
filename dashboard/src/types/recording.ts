export interface Recording {
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
    playlist_url: string;
    start_timestamp_micros: number;
}

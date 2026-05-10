export interface NodeCamera {
    id: number;
    camera_id: string;
    stream_key: string;
    is_active: boolean;
    flv_url: string;
    webrtc_url: string;
}

export interface Node {
    id: number;
    user_email: string;
    label: string;
    base_url: string;
    port: number;
    srs_port: number;
    webrtc_port: number;
    last_seen: string;
    cameras: NodeCamera[];
}

export interface LiveStream {
    id: string;
    camera_id: string;
    srs_stream_id: string;
    started_at: string;
    is_active: boolean;
}

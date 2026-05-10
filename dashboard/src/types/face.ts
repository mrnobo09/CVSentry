export interface FaceImageData {
    id: string;
    image: string;
    created_at: string;
}

export interface FaceIdentity {
    id: string;
    name: string;
    qdrant_id: string;
    images: FaceImageData[];
    image_count: number;
    is_active: boolean;
    updated_at: string;
    is_global: boolean;
}

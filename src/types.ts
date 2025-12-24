export interface Sock {
    id: string;
    color: string;
    color_hex: string;
    style: string;
    pattern?: string;
    material?: string;
    size: string;
    brand?: string;
    photo_filename?: string;
    photo_url?: string;
    clean: boolean;
    created_at: string;
    created_at_formatted?: string;
    last_washed?: string;
    last_washed_formatted?: string;
    notes?: string;
    wear_count: number;
}

export interface ColorOption {
    name: string;
    hex: string;
}

export interface Stats {
    total: number;
    clean: number;
    dirty: number;
    avg_wear_count: number;
    colors_count?: number;
    styles_count?: number;
    total_wears?: number;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}
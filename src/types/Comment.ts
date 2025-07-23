export interface Comment {
    id?: number;
    post_id: number;
    user_id: number;
    comentario: string;
    resposta_id?: number;
    created_at?: string;
} 
import { Like } from "./Like"

export interface LikeControllerActions {
    toggleLike(postId: number, userId: number): Promise<{ liked: boolean }>
    getLikeCount(postId: number): Promise<number>
    getUserLikes(userId: number): Promise<Like[]>
    getPostLikes(postId: number): Promise<Like[]>
} 
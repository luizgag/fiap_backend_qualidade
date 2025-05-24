import { DB } from "../infra/db/db";
import { Like } from "../types/Like";
import { LikeControllerActions } from "../types/LikeControllerActions";

export class LikeController implements LikeControllerActions {
    private db: DB;

    constructor() {
        this.db = new DB();
    }

    async toggleLike(postId: number, userId: number): Promise<{ liked: boolean }> {
        const result = await this.db.toggleLike(postId, userId);
        return result;
    }

    async getLikeCount(postId: number): Promise<number> {
        const count = await this.db.getLikeCount(postId)
        return count
        
    }

    async getUserLikes(userId: number): Promise<Like[]> {
        const likes = await this.db.getUserLikes(userId)
        return likes
    }

    async getPostLikes(postId: number): Promise<Like[]> {
        const likes = await this.db.getPostLikes(postId);
        return likes;
    }
} 
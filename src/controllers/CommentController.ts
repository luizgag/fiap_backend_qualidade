import { DB } from "../infra/db/db";
import { Comment } from "../types/Comment";
import { CommentControllerActions } from "../types/CommentControllerActions";

export class CommentController implements CommentControllerActions {
    private db: DB;

    constructor() {
        this.db = new DB();
    }

    async create(data: Comment): Promise<number> {
        const commentId = await this.db.createComment(data)
        return Number(commentId)
    }

    async getByPostId(postId: number): Promise<Comment[]> {
        const comments = await this.db.queryCommentsByPostId(postId)
        return comments
    }

    async update(id: number, data: Partial<Comment>): Promise<Comment> {
        const comment = await this.db.updateComment(id, data)
        return comment
    }

    async delete(id: number): Promise<Comment> {
        const comment = await this.db.deleteComment(id)
        return comment
    }
} 
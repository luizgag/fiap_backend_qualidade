import { Comment } from "./Comment"

export interface CommentControllerActions {
    create(data: Comment): Promise<number>
    getByPostId(postId: number): Promise<Comment[]>
    update(id: number, data: Partial<Comment>): Promise<Comment>
    delete(id: number): Promise<Comment>
} 
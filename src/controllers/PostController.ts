import { DB } from "../infra/db/db";
import { Post, ReadParams } from "../types";
import { PostControllerActions } from "../types/PostControllerActions";

export class PostController implements PostControllerActions {
    private db: DB;

    constructor() {
        this.db = new DB();
    }

    async read({ id, search }: ReadParams): Promise<Post[]> {
        try {
            const posts = await this.db.queryPosts({ id, search });
            return posts;
        } catch (error) {
            console.error('Erro ao buscar posts:', error);
            throw new Error('Falha ao buscar posts');
        }
    }

    async create(data: Post): Promise<number> {
        try {
            const postId = await this.db.createPost(data);
            return Number(postId);
        } catch (error) {
            console.error('Erro ao criar post:', error);
            throw new Error('Falha ao criar post');
        }
    }

    async delete(id: number): Promise<Post> {
        try {
            const post = await this.db.queryPosts({ id });
            await this.db.deletePost(id);
            return post[0] ?? post;
        } catch (error) {
            console.error('Erro ao deletar post:', error);
            throw new Error('Falha ao deletar post');
        }
    }

    async update(id: number, data: Partial<Post>): Promise<Post> {
        try {
            const post = await this.db.queryPosts({ id });
            if (!post.length) {
                throw new Error('Post não encontrado');
            }
            const updatedPost = await this.db.updatePost(id, data);
            return updatedPost;
        } catch (error) {
            console.error('Erro ao atualizar post:', error);
            throw new Error('Falha ao atualizar post');
        }
    }
}

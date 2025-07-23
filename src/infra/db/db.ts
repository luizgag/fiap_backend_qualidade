import sqlite from 'sqlite3'
import { db } from '../../main/server';
import { User } from '../../types/User';
import { Post } from '../../types/Post';
import { Comment } from '../../types/Comment';
import { Like } from '../../types/Like';

export class DB {
    private db: sqlite.Database;

    constructor() {
        this.db = db
    }

    async queryPosts(params: { id?: number, search?: string }): Promise<Post[]> {
        let query = `
            SELECT posts.id, posts.title, posts.content, posts.author_id
            FROM posts
        `;
        const values = [];

        if (params.id) {
            query += ' WHERE posts.id = ?';
            values.push(params.id);
        } else if (params.search) {
            query += ' WHERE posts.title LIKE ? OR posts.content LIKE ?';
            values.push(`%${params.search}%`, `%${params.search}%`);
        }

        return new Promise((resolve, reject) => {
            this.db.all(query, values, (error: Error | null, rows: any[]) => {
                if (error) {
                    return reject(error);
                }
                resolve(rows);
            });
        });
    }

    async createPost(post: Omit<Post, 'id'>): Promise<number> {
        const query = 'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?, ?)';
        const values = [post.title, post.content, post.author_id];

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function (error: Error | null) {
                if (error) {
                    return reject(error);
                }
                resolve(this.lastID);
            });
        });
    }

    async deletePost(id: number): Promise<{}> {
        const query = 'DELETE FROM posts WHERE id = ?';
        const values = [id];

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function (error: Error | null) {
                if (error) {
                    return reject(error);
                }
                if (this.changes > 0) {
                    resolve({});
                } else {
                    resolve({});
                }
            });
        });
    }

    async updatePost(id: number, post: Partial<Omit<Post, 'id'>>): Promise<void> {
        const fields = [];
        const values = [];

        if (post.title) {
            fields.push('title = ?');
            values.push(post.title);
        }
        if (post.content) {
            fields.push('content = ?');
            values.push(post.content);
        }
        if (post.author_id !== undefined) {
            // Validate that author_id is a number
            if (typeof post.author_id !== 'number' || isNaN(post.author_id)) {
                throw new Error('author_id deve ser um número válido');
            }
            fields.push('author_id = ?');
            values.push(post.author_id);
        }

        if (fields.length === 0) {
            throw new Error('Nenhum campo fornecido para atualização');
        }

        values.push(id);
        const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`;

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function (error: Error | null) {
                if (error) {
                    return reject(error);
                }
                if (this.changes > 0) {
                    resolve();
                } else {
                    reject(new Error('Post não encontrado'));
                }
            });
        });
    }

    async queryUser(identifier: string | number): Promise<User | null> {
        return new Promise((resolve, reject) => {
            const query = typeof identifier === 'string'
                ? 'SELECT * FROM usuarios WHERE email = ?'
                : 'SELECT * FROM usuarios WHERE id = ?';

            this.db.get(query, [identifier], (error, row) => {
                if (error) {
                    return reject(error);
                }
                console.log(row)
                if (!row) {
                    return resolve(null);
                }
                const userRow = row as { id: number, nome: string, email: string, senha: string, tipo_usuario: 'aluno' | 'professor' };
                resolve({
                    id: userRow.id,
                    nome: userRow.nome,
                    email: userRow.email,
                    senha: userRow.senha,
                    tipo_usuario: userRow.tipo_usuario
                });
            });
        });
    }

    async createUser(user: { nome: string, email: string, senha: string, tipo_usuario: 'aluno' | 'professor' }): Promise<Number> {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES (?, ?, ?, ?)';
            const values = [user.nome, user.email, user.senha, user.tipo_usuario];

            this.db.run(query, values, function (error: Error | null) {
                if (error) {
                    return reject(error);
                }
                resolve(this.lastID);
            });
        });
    }

    async updateUser(id: number, data: Partial<User>): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const query = `UPDATE usuarios SET ${setClause} WHERE id = ?`;

            this.db.run(query, [...values, id], function (error) {
                if (error) {
                    return reject(error);
                }
                if (this.changes > 0) {
                    resolve();
                } else {
                    reject(new Error('Usuário não encontrado'));
                }
            });
        });
    }

    async createSession(data: { userId: number, refreshTokenHash: string, expiresAt: string, ip: string, userAgent: string }): Promise<void> {
        const { userId, refreshTokenHash, expiresAt, ip, userAgent } = data
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO sessions (user_id, refresh_token_hash, expires_at, ip, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `;
            const values = [userId, refreshTokenHash, expiresAt, ip, userAgent];

            this.db.run(query, values, function (error) {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    async querySession(refreshTokenHash: string): Promise<{ userId: number, expiresAt: string } | null> {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * 
                FROM sessions 
                WHERE refresh_token_hash = ? 
                AND expires_at > datetime('now')
            `;

            this.db.get(query, [refreshTokenHash], (error, row) => {
                if (error) {
                    return reject(error);
                }
                if (!row) {
                    return resolve(null);
                }
                const sessionRow = row as { user_id: number, expires_at: string };
                resolve({
                    userId: sessionRow.user_id,
                    expiresAt: sessionRow.expires_at
                });
            });
        });
    }

    async deleteSession(refreshTokenHash: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = `
                DELETE FROM sessions
                WHERE refresh_token_hash = ?
            `;

            this.db.run(query, [refreshTokenHash], function (error) {
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    async updateSession(refreshTokenHash: string, data: { expiresAt: string }): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE sessions
                SET expires_at = ?
                WHERE refresh_token_hash = ?
            `;

            const values = [data.expiresAt, refreshTokenHash];

            this.db.run(query, values, function (error) {
                if (error) {
                    return reject(error);
                }
                if (this.changes > 0) {
                    resolve();
                } else {
                    reject(new Error('Sessão não encontrada'));
                }
            });
        });
    }

    async createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<number> {
        const query = 'INSERT INTO comentarios (post_id, user_id, comentario, resposta_id, created_at) VALUES (?, ?, ?, ?, datetime("now"))';
        const values = [comment.post_id, comment.user_id, comment.comentario, comment.resposta_id || null];

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function (error: Error | null) {
                if (error) {
                    return reject(error);
                }
                resolve(this.lastID);
            });
        });
    }

    async queryCommentsByPostId(postId: number): Promise<Comment[]> {
        const query = `
            SELECT comentarios.id, comentarios.post_id, comentarios.user_id, 
                   comentarios.comentario, comentarios.resposta_id, comentarios.created_at
            FROM comentarios
            WHERE comentarios.post_id = ?
            ORDER BY comentarios.created_at DESC
        `;
        const values = [postId];

        return new Promise((resolve, reject) => {
            this.db.all(query, values, (error: Error | null, rows: any[]) => {
                if (error) {
                    return reject(error);
                }
                resolve(rows);
            });
        });
    }

    async deleteComment(id: number): Promise<Comment> {
        const query = 'SELECT id, post_id, user_id, comentario, resposta_id, created_at FROM comentarios WHERE id = ?';
        const deleteQuery = 'DELETE FROM comentarios WHERE id = ?';
        const values = [id];

        return new Promise((resolve, reject) => {
            this.db.get(query, values, (error: Error | null, row: any) => {
                if (error) {
                    return reject(error);
                }
                if (!row) {
                    return reject(new Error('Comentário não encontrado'));
                }

                this.db.run(deleteQuery, values, (error: Error | null) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(row);
                });
            });
        });
    }

    async updateComment(id: number, data: Partial<Comment>): Promise<Comment> {
        const fields = [];
        const values = [];

        if (data.comentario) {
            fields.push('comentario = ?');
            values.push(data.comentario);
        }
        if (data.resposta_id !== undefined) {
            fields.push('resposta_id = ?');
            values.push(data.resposta_id);
        }

        if (fields.length === 0) {
            throw new Error('Nenhum campo fornecido para atualização');
        }

        values.push(id);
        const query = `UPDATE comentarios SET ${fields.join(', ')} WHERE id = ?`;
        const getQuery = 'SELECT id, post_id, user_id, comentario, resposta_id, created_at FROM comentarios WHERE id = ?';

        return new Promise((resolve, reject) => {
            this.db.run(query, values, (error: Error | null) => {
                if (error) {
                    return reject(error);
                }

                this.db.get(getQuery, [id], (error: Error | null, row: any) => {
                    if (error) {
                        return reject(error);
                    }
                    if (!row) {
                        return reject(new Error('Comentário não encontrado'));
                    }
                    resolve(row);
                });
            });
        });
    }

    async toggleLike(postId: number, userId: number): Promise<{ liked: boolean }> {
        const checkQuery = 'SELECT * FROM likes WHERE post_id = ? AND user_id = ?';
        const deleteQuery = 'DELETE FROM likes WHERE post_id = ? AND user_id = ?';
        const insertQuery = 'INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, datetime("now"))';
        const values = [postId, userId];

        return new Promise((resolve, reject) => {
            this.db.get(checkQuery, values, (error: Error | null, row: any) => {
                if (error) {
                    return reject(error);
                }

                if (row) {
                    // Like exists, remove it
                    this.db.run(deleteQuery, values, (error: Error | null) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve({ liked: false });
                    });
                } else {
                    // Like doesn't exist, add it
                    this.db.run(insertQuery, values, (error: Error | null) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve({ liked: true });
                    });
                }
            });
        });
    }

    async getLikeCount(postId: number): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM likes WHERE post_id = ?';
        const values = [postId];

        return new Promise((resolve, reject) => {
            this.db.get(query, values, (error: Error | null, row: any) => {
                if (error) {
                    return reject(error);
                }
                resolve(row.count);
            });
        });
    }

    async getUserLikes(userId: number): Promise<Like[]> {
        const query = 'SELECT * FROM likes WHERE user_id = ?';
        const values = [userId];

        return new Promise((resolve, reject) => {
            this.db.all(query, values, (error: Error | null, rows: any[]) => {
                if (error) {
                    return reject(error);
                }
                resolve(rows);
            });
        });
    }

    async getPostLikes(postId: number): Promise<Like[]> {
        const query = `
            SELECT likes.*, usuarios.nome as user_name
            FROM likes
            INNER JOIN usuarios ON likes.user_id = usuarios.id
            WHERE likes.post_id = ?
        `;
        const values = [postId];

        return new Promise((resolve, reject) => {
            this.db.all(query, values, (error: Error | null, rows: any[]) => {
                if (error) {
                    return reject(error);
                }
                resolve(rows);
            });
        });
    }
}
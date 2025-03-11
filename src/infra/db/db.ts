import sqlite from 'sqlite3'

export class DB {
    private db: sqlite.Database;

    constructor() {
        this.db = new sqlite.Database('./database.db');
    }

    async queryPosts(params: { id?: number, search?: string }): Promise<any[]> {
        let query = 'SELECT * FROM posts';
        const values = [];

        if (params.id) {
            query += ' WHERE id = ?';
            values.push(params.id);
        } else if (params.search) {
            query += ' WHERE title LIKE ? OR content LIKE ?';
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

    async createPost(post: { title: string, content: string, author: string }): Promise<number> {
        const query = 'INSERT INTO posts (title, content, author) VALUES (?, ?, ?)';
        const values = [post.title, post.content, post.author];

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function(error: Error | null) {
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
            this.db.run(query, values, function(error: Error | null) {
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

    async updatePost(id: number, post: { title?: string, content?: string, author?: string }): Promise<{ title: string, content: string, author: string }> {
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
        if (post.author) {
            fields.push('author = ?');
            values.push(post.author);
        }

        if (fields.length === 0) {
            throw new Error('Nenhum campo fornecido para atualização');
        }

        values.push(id);
        const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`;

        return new Promise((resolve, reject) => {
            this.db.run(query, values, function(error: Error | null) {
                if (error) {
                    return reject(error);
                }
                if (this.changes > 0) {
                    resolve(void 0);
                } else {
                    reject(new Error('Post não encontrado'));
                }
            });
        });
    }
}
import express from "express"
import sqlite from "sqlite3"
import cookieParser from "cookie-parser"
import setupRoutes from '../infra/routes/routes'
import cors from 'cors'

export const db = new sqlite.Database('./database.db')

class Server {
    private app: express.Application
    private port: number

    constructor() {
        this.app = express()
        this.port = 3001
        this.configureMiddlewares()
        this.setupDatabase()
    }

    private configureMiddlewares(): void {
        this.app.use(express.json())
        this.app.use(express.urlencoded({ extended: true }))
        this.app.use(cookieParser())
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'accessToken ']
        }))
        setupRoutes(this.app as express.Express)
        
        // Global error handler - must be last
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Global error handler:', error)
            
            // Check if response was already sent
            if (res.headersSent) {
                return next(error)
            }
            
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
            })
        })
    }

    private setupDatabase(): void {
        try {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS usuarios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        email TEXT NOT NULL UNIQUE,
                        senha TEXT NOT NULL,
                        tipo_usuario TEXT CHECK(tipo_usuario IN ('professor', 'aluno')) NOT NULL
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela usuarios:', err.message);
                    } else {
                        console.log('Tabela "usuarios" criada ou já existe.');
                    }
                })

                db.run(`
                    CREATE TABLE IF NOT EXISTS posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        author_id INTEGER NOT NULL,
                        FOREIGN KEY (author_id) REFERENCES usuarios(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela posts:', err.message);
                    } else {
                        console.log('Tabela "posts" criada ou já existe.');
                    }
                })

                db.run(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        refresh_token_hash TEXT NOT NULL,
                        expires_at DATETIME NOT NULL,
                        ip TEXT NOT NULL,
                        user_agent TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES usuarios(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela sessions:', err.message);
                    } else {
                        console.log('Tabela "sessions" criada ou já existe.');
                    }
                })

                db.run(`
                    CREATE TABLE IF NOT EXISTS likes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        post_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES usuarios(id),
                        FOREIGN KEY (post_id) REFERENCES posts(id),
                        UNIQUE(user_id, post_id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela likes:', err.message);
                    } else {
                        console.log('Tabela "likes" criada ou já existe.');
                    }
                })

                db.run(`
                    CREATE TABLE IF NOT EXISTS comentarios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        comentario TEXT NOT NULL,
                        resposta_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (post_id) REFERENCES posts(id),
                        FOREIGN KEY (user_id) REFERENCES usuarios(id),
                        FOREIGN KEY (resposta_id) REFERENCES comentarios(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela comentarios:', err.message);
                    } else {
                        console.log('Tabela "comentarios" criada ou já existe.');
                    }
                })
            })

            this.startServer()
        } catch (err) {
            console.error('Server Error: ', err.message)
            process.exit(1)
        }
    }

    private startServer(): void {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${this.port}`)
            console.log(`Acessível via Android emulator em: 10.0.2.2:${this.port}`)
        })
    }
}

new Server()


// // Verificar se a tabela está vazia antes de inserir dados
// db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
//     if (err) {
//         console.error('Erro ao verificar tabela:', err.message);
//         return;
//     }

//     if ((row as { count: number }).count === 0) {
//         // Primeiro inserir usuários professores
//         const stmtUsers = db.prepare('INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES (?, ?, ?, ?)');
//         const professores = [
//             ['João Silva', 'joao@gmail.com', '123456', 'professor'],
//             ['Maria Souza', 'maria@email.com', 'senha456', 'professor']
//         ];

//         professores.forEach((professor) => {
//             stmtUsers.run(professor, (err) => {
//                 if (err) {
//                     console.error('Erro ao inserir professor:', err.message);
//                 }
//             });
//         });
//         stmtUsers.finalize();

//         // Agora inserir posts com os IDs dos professores
//         const stmtPosts = db.prepare('INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)');
//         const posts = [
//             ['Primeiro Post', 'Este é o conteúdo do primeiro post', 1],
//             ['Dicas de Programação', 'Aqui estão algumas dicas úteis para programadores', 2]
//         ];

//         posts.forEach((post) => {
//             stmtPosts.run(post, (err) => {
//                 if (err) {
//                     console.error('Erro ao inserir post:', err.message);
//                 }
//             });
//         });
//         stmtPosts.finalize();
//         console.log('Dados iniciais inseridos nas tabelas');
//     }
// });
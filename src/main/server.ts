import express from "express"
import sqlite from "sqlite3"
import setupRoutes from '../infra/routes/routes'
import cors from 'cors'

class Server {
    private app: express.Application
    private port: number

    constructor() {
        this.app = express()
        this.port = 3000
        this.configureMiddlewares()
        this.setupDatabase()
    }

    private configureMiddlewares(): void {
        this.app.use(express.json())
        this.app.use(express.urlencoded({ extended: true }))
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }))
        setupRoutes(this.app as express.Express)
    }

    private setupDatabase(): void {
        try {
            const db = new sqlite.Database('./database.db', (err) => {
                if (err) {
                    console.error('Erro ao conectar ao banco de dados: ', err.message)
                    process.exit(1)
                }
                console.log('Conectado ao banco de dados')

                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS posts (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            title TEXT NOT NULL,
                            content TEXT NOT NULL,
                            author TEXT NOT NULL
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erro ao criar tabela:', err.message);
                        } else {
                            console.log('Tabela "posts" criada ou já existe.');
                            
                            // Verificar se a tabela está vazia antes de inserir dados
                            db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
                                if (err) {
                                    console.error('Erro ao verificar tabela:', err.message);
                                    return;
                                }

                                if ((row as { count: number }).count === 0) {
                                    // Inserir os dados apenas se a tabela estiver vazia
                                    const stmt = db.prepare('INSERT INTO posts (title, content, author) VALUES (?, ?, ?)');
                                    const posts = [
                                        ['Primeiro Post', 'Este é o conteúdo do primeiro post', 'João Silva'],
                                        ['Dicas de Programação', 'Aqui estão algumas dicas úteis para programadores', 'Maria Souza'],
                                        ['Novidades Tecnológicas', 'As últimas tendências em tecnologia', 'Carlos Oliveira'],
                                        ['Aprendendo TypeScript', 'Um guia básico para iniciantes em TypeScript', 'Ana Costa'],
                                        ['Desenvolvimento Web Moderno', 'Como construir aplicações web modernas', 'Pedro Almeida']
                                    ];

                                    for (const post of posts) {
                                        stmt.run(post, (err) => {
                                            if (err) {
                                                console.error('Erro ao inserir:', err.message);
                                            }
                                        });
                                    }
                                    stmt.finalize();
                                    console.log('Dados iniciais inseridos na tabela posts');
                                }
                            });
                        }
                    });
                });

                this.startServer()
            })
        } catch (err) {
            console.error('Server Error: ', err.message)
            process.exit(1)
        }
    }

    private startServer(): void {
        this.app.listen(this.port, () => {
            console.log(`Servidor rodando na porta ${this.port}`)
        })
    }
}

// Inicialização do servidor
new Server()

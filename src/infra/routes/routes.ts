import { Express, Router, Request, Response } from "express"
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { UserController, SessionController, CommentController, LikeController, PostController } from "../../controllers"
import { RegisterValidator } from "../../services/validators/RegisterValidator"
import { LoginValidator } from "../../services/validators/LoginValidators"

const JWT_SECRET = process.env.JWT_SECRET || 'fiap_secret';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_MS = 1000 * 60 * 60 * 24 * 7;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (userId: number, userName: string, userType: string) => jwt.sign({ userId, userName, userType }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

export default (app: Express) => {
    const router = Router()
    router.use((req: Request, res: Response, next) => {
        // Ignora verificação de token para rotas de login e register
        if (req.path === '/login' || req.path === '/register') {
            return next()
        }
        
        const token = req.headers['accesstoken'] as string
        if (!token) {
            res.status(401).json({ error: 'Token de acesso não fornecido' })
            return
        }

        try {
            jwt.verify(token, JWT_SECRET)
            next()
        } catch (error) {
            res.status(401).json({ error: 'Token de acesso inválido ou expirado' })
            return 
        }
    })
    app.use('/api', router)

    /**
     * @swagger
     * /posts:
     *   get:
     *     summary: Lista todos os posts
     *     tags: [Posts]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Lista de posts retornada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Post'
     *       401:
     *         description: Token de acesso não fornecido ou inválido
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get('/posts', async (request: Request, response: Response) => {
        try {
            response.json(await new PostController().read({}))
        } catch (error) {
            console.error('Erro ao buscar posts:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    /**
     * @swagger
     * /posts/search/{search}:
     *   get:
     *     summary: Busca posts por termo de pesquisa
     *     tags: [Posts]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - in: path
     *         name: search
     *         required: true
     *         schema:
     *           type: string
     *         description: Termo de pesquisa para filtrar posts
     *     responses:
     *       200:
     *         description: Posts encontrados com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Post'
     *       401:
     *         description: Token de acesso não fornecido ou inválido
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get('/posts/search/:search', async (request: Request, response: Response) => {
        try {
            const { search } = request.params
            response.json(await new PostController().read({ search }))
        } catch (error) {
            console.error('Erro ao buscar posts:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    /**
     * @swagger
     * /posts/{id}:
     *   get:
     *     summary: Busca um post específico por ID
     *     tags: [Posts]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID único do post
     *     responses:
     *       200:
     *         description: Post encontrado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Post'
     *       401:
     *         description: Token de acesso não fornecido ou inválido
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       404:
     *         description: Post não encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get('/posts/:id', async (request: Request, response: Response) => {
        try {
            const { id } = request.params
            response.json(await new PostController().read({ id: Number(id) }))
        } catch (error) {
            console.error('Erro ao buscar post:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.delete('/posts/:id', async (request: Request, response: Response) => {
        try {
            const { id } = request.params
            response.json(await new PostController().delete(Number(id)))
        } catch (error) {
            console.error('Erro ao deletar post:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.put('/posts/:id', async (request: Request, response: Response) => {
        try {
            const { id } = request.params
            const data = request.body
            
            // Validate author field if present
            if (data.author !== undefined) {
                if (typeof data.author === 'string') {
                    // Try to convert string to number
                    const authorId = parseInt(data.author, 10);
                    if (isNaN(authorId)) {
                        response.status(400).json({ 
                            error: 'Campo author deve ser um ID numérico válido do usuário' 
                        });
                        return;
                    }
                    data.author = authorId;
                } else if (typeof data.author !== 'number') {
                    response.status(400).json({ 
                        error: 'Campo author deve ser um ID numérico válido do usuário' 
                    });
                    return;
                }
            }
            
            // Validate author_id field if present
            if (data.author_id !== undefined) {
                if (typeof data.author_id === 'string') {
                    const authorId = parseInt(data.author_id, 10);
                    if (isNaN(authorId)) {
                        response.status(400).json({ 
                            error: 'Campo author_id deve ser um ID numérico válido do usuário' 
                        });
                        return;
                    }
                    data.author_id = authorId;
                } else if (typeof data.author_id !== 'number') {
                    response.status(400).json({ 
                        error: 'Campo author_id deve ser um ID numérico válido do usuário' 
                    });
                    return;
                }
            }
            
            response.json(await new PostController().update(Number(id), data))
        } catch (error) {
            console.error('Erro ao atualizar post:', error)
            if (error.message.includes('deve ser um número válido')) {
                response.status(400).json({ error: error.message });
            } else {
                response.status(500).json({ error: 'Erro interno do servidor' });
            }
        }
    })

    /**
     * @swagger
     * /posts:
     *   post:
     *     summary: Cria um novo post
     *     tags: [Posts]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *                 description: Título do post
     *               content:
     *                 type: string
     *                 description: Conteúdo do post
     *               author:
     *                 type: integer
     *                 description: ID do autor do post
     *             required:
     *               - title
     *               - content
     *               - author
     *     responses:
     *       200:
     *         description: Post criado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Post'
     *       400:
     *         description: Campos obrigatórios ausentes
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 missingFields:
     *                   type: array
     *                   items:
     *                     type: string
     *       401:
     *         description: Token de acesso não fornecido ou inválido
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post('/posts', async (request: Request, response: Response) => {
        try {
            const data = request.body
            const requiredFields = ["title", "author_id", "content"]
            const missingFields = []
            
            for (const field of requiredFields) {
                if (!data[field]) {
                    missingFields.push(field)
                }
            }
            
            if (missingFields.length > 0) {
                response.status(400).json({ 
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                    missingFields 
                })
                return
            }
            
            const result = await new PostController().create(data)
            response.json(result)
        } catch (error) {
            console.error('Erro ao criar post:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    /**
     * @swagger
     * /register:
     *   post:
     *     summary: Registra um novo usuário
     *     tags: [Autenticação]
     *     security: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         description: Usuário criado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Usuário Criado"
     *                 data:
     *                   $ref: '#/components/schemas/User'
     *       400:
     *         description: Falha na validação ou email já em uso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post('/register', async (request: Request, response: Response) => {
        try {
            const { body } = request
            const { validate, step } = new RegisterValidator(body).handle()
            if (!validate) {
                response.status(400).json({ error: 'Falha na validação', step })
                return
            }
            const { nome, email, senha, tipo_usuario } = request.body
            const userExist = await new UserController().read(email)
            if (userExist) {
                response.status(400).json({ error: 'Email já esta em uso' })
                return
            }
            
            const hashed = await bcrypt.hash(senha, 10)
            const user = await new UserController().create({ senha: hashed, email, nome, tipo_usuario })
            response.status(201).json({ message: 'Usuário Criado', data: user })
        } catch (error) {
            console.error('Erro ao registrar usuário:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    /**
     * @swagger
     * /login:
     *   post:
     *     summary: Autentica um usuário
     *     tags: [Autenticação]
     *     security: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login realizado com sucesso
     *         headers:
     *           Set-Cookie:
     *             description: Cookie com refresh token
     *             schema:
     *               type: string
     *               example: refreshToken=abc123; HttpOnly; Path=/
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       400:
     *         description: Falha na validação dos dados
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       401:
     *         description: Credenciais inválidas
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Erro interno do servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post('/login', async (request: Request, response: Response) => {
        try {
            const { body } = request
            const { validate, step } = new LoginValidator(body).handle()

            if (!validate) {
                response.status(400).json({ error: 'Falha na autenticação', step })
                return
            }
            const { email, senha } = body
            const user = await new UserController().read(email)
            if (!user || !(await bcrypt.compare(senha, user.senha))) {
                response.status(401).json({ error: 'Credenciais inválidas, e-mail ou senha incorretos' })
                return
            }
            
            const accessToken = generateAccessToken(user.id, user.nome, user.tipo_usuario)
            const refreshToken = generateRefreshToken()
            const hashedRefresh = hashToken(refreshToken)
    
            const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString()
            await new SessionController().create({ 
                ip: request.ip || 'unknown', 
                expiresAt, 
                refreshTokenHash: hashedRefresh, 
                userAgent: request.headers['user-agent'] || 'unknown', 
                userId: user.id 
            })
    
            response.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: REFRESH_EXPIRES_MS
            })
            response.status(200).json({ accessToken })
        } catch (error) {
            console.error('Erro ao fazer login:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.post('/logout', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (token) {
                const hashed = hashToken(token)
                await new SessionController().delete(hashed)
            }
            response.clearCookie('refreshToken').status(200).json({ message: 'Logout realizado com sucesso' })
        } catch (error) {
            console.error('Erro ao fazer logout:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    // CRUD para Likes
    router.post('/posts/like', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { postId } = request.body
            const userId = session.userId

            await new LikeController().toggleLike(userId, Number(postId))
            response.status(201).json({ message: 'Post curtido com sucesso' })
        } catch (error) {
            console.error('Erro ao curtir post:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.put('/posts/like/:postId', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { postId } = request.params
            const userId = session.userId

            await new LikeController().toggleLike(userId, Number(postId))
            response.status(200).json({ message: 'Curtida atualizada com sucesso' })
        } catch (error) {
            console.error('Erro ao atualizar curtida:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.get('/posts/like/:postId', async (request: Request, response: Response) => {
        try {
            const { postId } = request.params
            const likes = await new LikeController().getPostLikes(Number(postId))
            response.status(200).json(likes)
        } catch (error) {
            console.error('Erro ao buscar curtidas:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.delete('/posts/like/:postId', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { postId } = request.params
            const userId = session.userId

            await new LikeController().toggleLike(userId, Number(postId))
            response.status(200).json({ message: 'Curtida removida com sucesso' })
        } catch (error) {
            console.error('Erro ao remover curtida:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    // CRUD para Comentários
    router.post('/posts/comentarios', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { postId, comentario } = request.body
            const userId = session.userId

            const novoComentario = await new CommentController().create({
                post_id: Number(postId),
                author_id: userId,
                comentario: comentario
            })
            response.status(201).json(novoComentario)
        } catch (error) {
            console.error('Erro ao criar comentário:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.get('/posts/comentarios/:postId', async (request: Request, response: Response) => {
        try {
            const { postId } = request.params
            const comentarios = await new CommentController().getByPostId(Number(postId))
            response.status(200).json(comentarios)
        } catch (error) {
            console.error('Erro ao buscar comentários:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.put('/posts/comentarios/:id', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { id } = request.params
            const { comentario } = request.body
            const userId = session.userId

            const comentarioAtualizado = await new CommentController().update(Number(id), {
                comentario: comentario
            })
            response.status(200).json(comentarioAtualizado)
        } catch (error) {
            console.error('Erro ao atualizar comentário:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.delete('/posts/comentarios/:id', async (request: Request, response: Response) => {
        try {
            const token = request.cookies?.refreshToken
            if (!token) {
                response.status(401).json({ error: 'Token de refresh não fornecido' })
                return
            }

            const hashed = hashToken(token)
            const session = await new SessionController().read(hashed)
            if (!session) {
                response.status(401).json({ error: 'Sessão inválida ou expirada' })
                return
            }

            const { id } = request.params

            await new CommentController().delete(Number(id))
            response.status(200).json({ message: 'Comentário removido com sucesso' })
        } catch (error) {
            console.error('Erro ao deletar comentário:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })

    router.get('/users/:id', async (request: Request, response: Response) => {
        try {
            const { id } = request.params
            const user = await new UserController().read(Number(id))
            response.status(200).json(user)
        } catch (error) {
            console.error('Erro ao buscar usuário:', error)
            response.status(500).json({ error: 'Erro interno do servidor' })
        }
    })
}

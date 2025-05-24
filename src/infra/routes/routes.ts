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

    router.get('/posts', async (request: Request, response: Response) => {
        response.json(await new PostController().read({}))
    })

    router.get('/posts/search/:search', async (request: Request, response: Response) => {
        const { search } = request.params
        response.json(await new PostController().read({ search }))
    })

    router.get('/posts/:id', async (request: Request, response: Response) => {
        const { id } = request.params
        response.json(await new PostController().read({ id: Number(id) }))
    })

    router.delete('/posts/:id', async (request: Request, response: Response) => {
        const { id } = request.params
        response.json(await new PostController().delete(Number(id)))
    })

    router.put('/posts/:id', async (request: Request, response: Response) => {
        const { id } = request.params
        const data = request.body
        response.json(await new PostController().update(Number(id), data))
    })

    router.post('/posts', async (request: Request, response: Response) => {
        const data = request.body
        const requiredFields = ["title", "author", "content"]
        let failed = false
        for (const field of requiredFields) {
            if (!data[field]) {
                response.status(400).json({ message: `Missing Param ${field}` })
                failed = true
            }
        }
        if (!failed) response.json(await new PostController().create(data))
    })

    router.post('/register', async (request: Request, response: Response) => {
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
        } else {
            const hashed = await bcrypt.hash(senha, 10)
            const user = await new UserController().create({ senha: hashed, email, nome, tipo_usuario })
            response.status(201).json({ message: 'Usuário Criado', data: user })
            return
        }
    })

    router.post('/login', async (request: Request, response: Response) => {
        const { body } = request
        const { validate, step } = new LoginValidator(body).handle()

        if (!validate) {
            response.status(400).json({ error: 'Falha na autenticação', step }).send()
        }
        const { email, senha } = body
        const user = await new UserController().read(email)
        if (!user || !(await bcrypt.compare(senha, user.senha))) {
            response.status(401).json({ error: 'Credenciais inválidas, e-mail ou senha incorretos' }).send()
        } else {
            const accessToken = generateAccessToken(user.id, user.nome, user.tipo_usuario)
            const refreshToken = generateRefreshToken()
            const hashedRefresh = hashToken(refreshToken)
    
            const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString()
            await new SessionController().create({ ip: request.ip ,expiresAt, refreshTokenHash: hashedRefresh, userAgent: request.headers['user-agent'], userId: user.id })
    
            response.status(200).json({ accessToken }).send()
        }
    })

    router.post('/logout', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (token) {
            const hashed = hashToken(token)
            await new SessionController().delete(hashed)
        }

        response.clearCookie('refreshToken').sendStatus(200)
    })

    // CRUD para Likes
    router.post('/posts/like', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { postId } = request.body
        const userId = session.userId

        try {
            await new LikeController().toggleLike(userId, Number(postId))
            response.status(201).json({ message: 'Post curtido com sucesso' }).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.put('/posts/like/:postId', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { postId } = request.params
        const userId = session.userId

        try {
            await new LikeController().toggleLike(userId, Number(postId))
            response.status(200).json({ message: 'Curtida atualizada com sucesso' }).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.get('/posts/like/:postId', async (request: Request, response: Response) => {
        const { postId } = request.params
        try {
            const likes = await new LikeController().getPostLikes(Number(postId))
            response.status(200).json(likes).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.delete('/posts/like/:postId', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { postId } = request.params
        const userId = session.userId

        try {
            await new LikeController().toggleLike(userId, Number(postId))
            response.status(200).json({ message: 'Curtida removida com sucesso' }).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    // CRUD para Comentários
    router.post('/posts/comentarios', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { postId, comentario, resposta_id } = request.body
        const userId = session.userId

        try {
            const novoComentario = await new CommentController().create({
                post_id: Number(postId),
                author_id: userId,
                content: comentario
            })
            response.status(201).json(novoComentario).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.get('/posts/comentarios/:postId', async (request: Request, response: Response) => {
        const { postId } = request.params
        try {
            const comentarios = await new CommentController().getByPostId(Number(postId))
            response.status(200).json(comentarios).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.put('/posts/comentarios/:id', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { id } = request.params
        const { comentario } = request.body
        const userId = session.userId

        try {
            const comentarioAtualizado = await new CommentController().update(Number(id), {
                id: userId,
                content: comentario
            })
            response.status(200).json(comentarioAtualizado).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.delete('/posts/comentarios/:id', async (request: Request, response: Response) => {
        const token = request.cookies.refreshToken
        if (!token) response.sendStatus(401).send()

        const hashed = hashToken(token)
        const session = await new SessionController().read(hashed)
        if (!session) response.sendStatus(401).send()

        const { id } = request.params
        const userId = session.userId

        try {
            await new CommentController().delete(Number(id))
            response.status(200).json({ message: 'Comentário removido com sucesso' }).send()
        } catch (error) {
            response.status(400).json({ error: error.message }).send()
        }
    })

    router.get('/users/:id', async (request: Request, response: Response) => {
        const { id } = request.params
        const user = await new UserController().read(Number(id))
        response.status(200).json(user).send()
    })
}

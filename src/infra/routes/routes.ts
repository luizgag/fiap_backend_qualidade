import { Express, Router } from "express"
import { PostController } from "../../controllers/PostController"

export default (app: Express) => {
    const router = Router()
    app.use('/api', router)

    router.get('/posts', async (request, response) => {
        response.json(await new PostController().read({}))
    })

    router.get('/posts/search/:search', async (request, response) => {
        const { search } = request.params
        response.json(await new PostController().read({ search }))
    })

    router.get('/posts/:id', async (request, response) => {
        const { id } = request.params
        response.json(await new PostController().read({ id: Number(id) }))
    })

    router.delete('/posts/:id', async (request, response) => {
        const { id } = request.params
        response.json(await new PostController().delete(Number(id)))
    })

    router.put('/posts/:id', async (request, response) => {
        const { id } = request.params
        const data = request.body
        response.json(await new PostController().update(Number(id), data))
    })

    router.post('/posts', async (request, response) => {
        const data = request.body
        const requiredFields = ["title", "author", "content"]
        let failed = false
        for (const field of requiredFields) {
            if (!data[field]) {
                response.status(400).json({ message: `Missing Param ${field}` });
                failed = true
            }
        }
        if(!failed) response.json(await new PostController().create(data))
    })

}
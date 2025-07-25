// Arquivo de teste Jest (PostController.test.ts)
import { PostController } from './PostController';
import { DB } from '../infra/db/db';
import { Post } from '../types';

describe('PostController', () => {
    let postController: PostController;
    let mockDb: jest.Mocked<DB>;

    beforeEach(() => {
        mockDb = {
            queryPosts: jest.fn(),
            createPost: jest.fn(),
            deletePost: jest.fn(),
            updatePost: jest.fn()
        } as unknown as jest.Mocked<DB>;
        
        // Injeta o mock do DB no controller
        postController = new PostController();
        (postController as any).db = mockDb;
    });

    describe('read', () => {
        it('deve retornar uma lista de posts', async () => {
            const mockPosts: Post[] = [{ id: 1, title: 'Teste', content: 'Conteúdo', author_id: 1 }];
            mockDb.queryPosts.mockResolvedValue(mockPosts);

            const result = await postController.read({});
            expect(result).toEqual(mockPosts);
            expect(mockDb.queryPosts).toHaveBeenCalledWith({});
        });

        it('deve lançar erro ao falhar a busca', async () => {
            mockDb.queryPosts.mockRejectedValue(new Error('Erro de banco'));

            await expect(postController.read({})).rejects.toThrow('Falha ao buscar posts');
        });
    });

    describe('create', () => {
        it('deve criar um novo post e retornar o ID', async () => {
            const newPost: Post = { title: 'Novo', content: 'Conteúdo', author_id: 1 };
            mockDb.createPost.mockResolvedValue(1);

            const result = await postController.create(newPost);
            expect(result).toBe(1);
            expect(mockDb.createPost).toHaveBeenCalledWith(newPost);
        });

        it('deve lançar erro ao falhar a criação', async () => {
            const newPost: Post = { title: 'Novo', content: 'Conteúdo', author_id: 1 };
            mockDb.createPost.mockRejectedValue(new Error('Erro de banco'));

            await expect(postController.create(newPost)).rejects.toThrow('Falha ao criar post');
        });
    });

    describe('delete', () => {
        it('deve deletar um post existente', async () => {
            const mockPost: Post = { id: 1, title: 'Teste', content: 'Conteúdo', author_id: 1 };
            mockDb.queryPosts.mockResolvedValue([mockPost]);
            mockDb.deletePost.mockResolvedValue({});

            const result = await postController.delete(1);
            expect(result).toEqual(mockPost);
            expect(mockDb.queryPosts).toHaveBeenCalledWith({ id: 1 });
            expect(mockDb.deletePost).toHaveBeenCalledWith(1);
        });

        it('deve lançar erro ao falhar ao deletar', async () => {
            mockDb.queryPosts.mockResolvedValue([]);
            mockDb.deletePost.mockRejectedValue(new Error('Erro de banco'));

            await expect(postController.delete(1)).rejects.toThrow('Falha ao deletar post');
        });
    });

    describe('update', () => {
        it('deve atualizar um post existente', async () => {
            const mockPost: Post = { id: 1, title: 'Teste', content: 'Conteúdo', author_id: 1 };
            const updatedData = { title: 'Atualizado', content: 'Conteúdo', author_id: 1 };
            mockDb.queryPosts.mockResolvedValue([mockPost]);
            mockDb.updatePost.mockResolvedValue();

            // Mock the second queryPosts call (after update) to return updated data
            mockDb.queryPosts.mockResolvedValueOnce([mockPost]).mockResolvedValueOnce([{ ...mockPost, ...updatedData }]);
            
            const result = await postController.update(1, updatedData);
            expect(result).toEqual({ ...mockPost, ...updatedData });
            expect(mockDb.queryPosts).toHaveBeenCalledWith({ id: 1 });
            expect(mockDb.updatePost).toHaveBeenCalledWith(1, updatedData);
        });

        it('deve lançar erro ao tentar atualizar post inexistente', async () => {
            mockDb.queryPosts.mockResolvedValue([]);

            await expect(postController.update(1, { title: 'Atualizado' }))
                .rejects.toThrow('Post não encontrado para atualização');
        });

        it('deve lançar erro ao falhar a atualização', async () => {
            const mockPost: Post = { id: 1, title: 'Teste', content: 'Conteúdo', author_id: 1 };
            mockDb.queryPosts.mockResolvedValue([mockPost]);
            mockDb.updatePost.mockRejectedValue(new Error('Erro de banco'));

            await expect(postController.update(1, { title: 'Atualizado' }))
                .rejects.toThrow('Falha ao atualizar post');
        });
    });
});
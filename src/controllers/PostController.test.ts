import { PostController } from './PostController';
import { DB } from '../infra/db/db';
import { Post } from '../types';

// Mock the server module to prevent it from starting
jest.mock('../main/server', () => {
  const sqlite = require('sqlite3');
  return {
    db: new sqlite.Database(':memory:')
  };
});

// Interface for what the database actually returns
interface PostFromDB {
    id: number;
    title: string;
    content: string;
    nome: string;
    author_id: number;
    tipo_usuario: string;
}

describe('PostController Integration Tests', () => {
    let postController: PostController;
    let db: DB;
    let testUserId: number;
    let testPostId: number;

    beforeAll(async () => {
        // Setup in-memory database tables
        const { db: testDb } = require('../main/server');
        
        await new Promise<void>((resolve, reject) => {
            testDb.serialize(() => {
                testDb.run(`
                    CREATE TABLE IF NOT EXISTS usuarios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT NOT NULL,
                        email TEXT NOT NULL UNIQUE,
                        senha TEXT NOT NULL,
                        tipo_usuario TEXT CHECK(tipo_usuario IN ('professor', 'aluno')) NOT NULL
                    )
                `, (err: any) => {
                    if (err) reject(err);
                });

                testDb.run(`
                    CREATE TABLE IF NOT EXISTS posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        author_id INTEGER NOT NULL,
                        FOREIGN KEY (author_id) REFERENCES usuarios(id)
                    )
                `, (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        postController = new PostController();
        db = new DB();
        
        // Create a test user first with unique email
        const testUser = {
            nome: 'Test User',
            email: `test-${Date.now()}-${Math.random()}@example.com`, // Make email unique
            senha: 'password123',
            tipo_usuario: 'professor' as const
        };
        
        testUserId = Number(await db.createUser(testUser));
    });

    beforeEach(async () => {
        // Create a fresh test post for each test
        const testPost: Post = {
            title: 'Original Test Post',
            content: 'Original content for testing',
            author_id: testUserId
        };
        
        testPostId = await postController.create(testPost);
    });

    afterEach(async () => {
        // Clean up the test post after each test
        try {
            await postController.delete(testPostId);
        } catch (error) {
            // Post might already be deleted, ignore error
        }
    });

    describe('Update Post Functionality', () => {
        it('should successfully update post title', async () => {
            const updateData = { title: 'Updated Test Post Title' };
            
            const updatedPost = await postController.update(testPostId, updateData) as unknown as PostFromDB;
            
            expect(updatedPost).toBeDefined();
            expect(updatedPost.title).toBe('Updated Test Post Title');
            expect(updatedPost.content).toBe('Original content for testing');
            expect(updatedPost.author_id).toBe(testUserId);
        });

        it('should successfully update post content', async () => {
            const updateData = { content: 'Updated content for the test post' };
            
            const updatedPost = await postController.update(testPostId, updateData) as unknown as PostFromDB;
            
            expect(updatedPost).toBeDefined();
            expect(updatedPost.title).toBe('Original Test Post');
            expect(updatedPost.content).toBe('Updated content for the test post');
            expect(updatedPost.author_id).toBe(testUserId);
        });

        it('should successfully update post author', async () => {
            // Create another test user for this test
            const anotherUser = {
                nome: 'Another Test User',
                email: `another-${Date.now()}-${Math.random()}@example.com`,
                senha: 'password456',
                tipo_usuario: 'professor' as const
            };
            const anotherUserId = Number(await db.createUser(anotherUser));
            
            const updateData = { author_id: anotherUserId };
            
            const updatedPost = await postController.update(testPostId, updateData) as unknown as PostFromDB;
            
            expect(updatedPost).toBeDefined();
            expect(updatedPost.title).toBe('Original Test Post');
            expect(updatedPost.content).toBe('Original content for testing');
            expect(updatedPost.author_id).toBe(anotherUserId);
        });

        it('should successfully update multiple fields at once', async () => {
            const updateData = {
                title: 'Completely Updated Title',
                content: 'Completely updated content'
            };
            
            const updatedPost = await postController.update(testPostId, updateData) as unknown as PostFromDB;
            
            expect(updatedPost).toBeDefined();
            expect(updatedPost.title).toBe('Completely Updated Title');
            expect(updatedPost.content).toBe('Completely updated content');
            expect(updatedPost.author_id).toBe(testUserId);
        });

        it('should throw error when trying to update non-existent post', async () => {
            const nonExistentId = 99999;
            const updateData = { title: 'This should fail' };
            
            await expect(postController.update(nonExistentId, updateData))
                .rejects
                .toThrow('Post não encontrado para atualização');
        });

        it('should handle empty update data gracefully', async () => {
            const updateData = {};
            
            await expect(postController.update(testPostId, updateData))
                .rejects
                .toThrow('Nenhum campo fornecido para atualização');
        });
    });

    describe('Full CRUD Flow Test', () => {
        it('should create, update, read, and verify post changes', async () => {
            // 1. Create a new post
            const initialPost: Post = {
                title: 'CRUD Test Post',
                content: 'Initial content for CRUD testing',
                author_id: testUserId
            };
            
            const createdPostId = await postController.create(initialPost);
            expect(createdPostId).toBeDefined();
            expect(typeof createdPostId).toBe('number');

            // 2. Read the created post
            const createdPosts = await postController.read({ id: createdPostId });
            expect(createdPosts).toHaveLength(1);
            expect(createdPosts[0].title).toBe('CRUD Test Post');
            expect(createdPosts[0].content).toBe('Initial content for CRUD testing');

            // 3. Update the post
            const updateData = {
                title: 'Updated CRUD Test Post',
                content: 'Updated content after modification'
            };
            
            const updatedPost = await postController.update(createdPostId, updateData);
            expect(updatedPost.title).toBe('Updated CRUD Test Post');
            expect(updatedPost.content).toBe('Updated content after modification');

            // 4. Read all posts to verify the update persisted
            const allPosts = await postController.read({}) as unknown as PostFromDB[];
            const ourPost = allPosts.find(post => post.id === createdPostId);
            expect(ourPost).toBeDefined();
            expect(ourPost?.title).toBe('Updated CRUD Test Post');
            expect(ourPost?.content).toBe('Updated content after modification');

            // 5. Clean up
            await postController.delete(createdPostId);
        });
    });

    describe('Database Consistency Tests', () => {
        it('should maintain data integrity after multiple updates', async () => {
            // Perform multiple sequential updates
            await postController.update(testPostId, { title: 'First Update' });
            await postController.update(testPostId, { content: 'Second Update Content' });
            
            // Verify final state
            const finalPost = await postController.read({ id: testPostId }) as unknown as PostFromDB[];
            expect(finalPost).toHaveLength(1);
            expect(finalPost[0].title).toBe('First Update');
            expect(finalPost[0].content).toBe('Second Update Content');
            expect(finalPost[0].author_id).toBe(testUserId);
        });

        it('should handle sequential updates correctly', async () => {
            // Perform multiple updates in sequence
            await postController.update(testPostId, { title: 'Sequential Update 1' });
            await postController.update(testPostId, { content: 'Sequential Update Content' });
            
            // Verify final state
            const finalPost = await postController.read({ id: testPostId }) as unknown as PostFromDB[];
            expect(finalPost).toHaveLength(1);
            expect(finalPost[0].title).toBe('Sequential Update 1');
            expect(finalPost[0].content).toBe('Sequential Update Content');
            expect(finalPost[0].author_id).toBe(testUserId);
        });

        it('should reject invalid author data types and preserve post', async () => {
            // Try to update with invalid author (string instead of number)
            await expect(postController.update(testPostId, { 
                title: 'Should Not Update',
                author_id: 'invalid_string' as any 
            })).rejects.toThrow('author_id deve ser um número válido');
            
            // Verify post still exists and wasn't corrupted
            const posts = await postController.read({ id: testPostId }) as unknown as PostFromDB[];
            expect(posts).toHaveLength(1);
            expect(posts[0].title).toBe('Original Test Post'); // Should still have original title
            expect(posts[0].author_id).toBe(testUserId); // Should still have original author
        });

        it('should reject NaN author values', async () => {
            // Try to update with NaN author
            await expect(postController.update(testPostId, { 
                author_id: NaN 
            })).rejects.toThrow('author_id deve ser um número válido');
            
            // Verify post still exists
            const posts = await postController.read({ id: testPostId }) as unknown as PostFromDB[];
            expect(posts).toHaveLength(1);
            expect(posts[0].author_id).toBe(testUserId);
        });
    });
});
import { PostController } from './controllers/PostController';
import { CommentController } from './controllers/CommentController';
import { LikeController } from './controllers/LikeController';
import { DB } from './infra/db/db';
import { Post, Comment, Like, User } from './types';

// Mock the server module to prevent it from starting
jest.mock('./main/server', () => {
  const sqlite = require('sqlite3');
  return {
    db: new sqlite.Database(':memory:')
  };
});

describe('End-to-End API Database Alignment Integration Tests', () => {
    let postController: PostController;
    let commentController: CommentController;
    let likeController: LikeController;
    let db: DB;
    let testUserId: number;
    let testUser2Id: number;

    beforeAll(async () => {
        // Setup in-memory database tables
        const { db: testDb } = require('./main/server');
        
        await new Promise<void>((resolve, reject) => {
            testDb.serialize(() => {
                // Create usuarios table
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

                // Create posts table
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
                });

                // Create comentarios table
                testDb.run(`
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
                `, (err: any) => {
                    if (err) reject(err);
                });

                // Create likes table
                testDb.run(`
                    CREATE TABLE IF NOT EXISTS likes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        post_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (post_id) REFERENCES posts(id),
                        FOREIGN KEY (user_id) REFERENCES usuarios(id),
                        UNIQUE(post_id, user_id)
                    )
                `, (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // Initialize controllers and DB
        postController = new PostController();
        commentController = new CommentController();
        likeController = new LikeController();
        db = new DB();
        
        // Create test users
        const testUser1: Omit<User, 'id'> = {
            nome: 'Test User 1',
            email: `test1-${Date.now()}-${Math.random()}@example.com`,
            senha: 'password123',
            tipo_usuario: 'professor'
        };
        
        const testUser2: Omit<User, 'id'> = {
            nome: 'Test User 2',
            email: `test2-${Date.now()}-${Math.random()}@example.com`,
            senha: 'password456',
            tipo_usuario: 'aluno'
        };
        
        testUserId = Number(await db.createUser(testUser1));
        testUser2Id = Number(await db.createUser(testUser2));
    });

    describe('Post Model Alignment Tests', () => {
        it('should create and retrieve post with aligned field names', async () => {
            // Create post using aligned model
            const postData: Post = {
                title: 'Test Post Title',
                content: 'Test post content',
                author_id: testUserId
            };

            const postId = await postController.create(postData);
            expect(postId).toBeDefined();
            expect(typeof postId).toBe('number');

            // Retrieve post and verify field alignment
            const retrievedPosts = await postController.read({ id: postId });
            expect(retrievedPosts).toHaveLength(1);
            
            const retrievedPost = retrievedPosts[0];
            expect(retrievedPost.id).toBe(postId);
            expect(retrievedPost.title).toBe('Test Post Title');
            expect(retrievedPost.content).toBe('Test post content');
            expect(retrievedPost.author_id).toBe(testUserId);
            
            // Verify no field mapping issues - should have author_id, not author
            expect(retrievedPost).toHaveProperty('author_id');
            expect(retrievedPost).not.toHaveProperty('author');

            // Clean up
            await postController.delete(postId);
        });

        it('should update post with aligned field names', async () => {
            // Create initial post
            const postData: Post = {
                title: 'Original Title',
                content: 'Original content',
                author_id: testUserId
            };

            const postId = await postController.create(postData);

            // Update using aligned field names
            const updateData = {
                title: 'Updated Title',
                content: 'Updated content',
                author_id: testUser2Id
            };

            const updatedPost = await postController.update(postId, updateData);
            
            // Verify all fields are properly aligned
            expect(updatedPost.title).toBe('Updated Title');
            expect(updatedPost.content).toBe('Updated content');
            expect(updatedPost.author_id).toBe(testUser2Id);
            expect(updatedPost.id).toBe(postId);

            // Clean up
            await postController.delete(postId);
        });
    });

    describe('Comment Model Alignment Tests', () => {
        let testPostId: number;

        beforeEach(async () => {
            // Create a test post for comments
            const postData: Post = {
                title: 'Test Post for Comments',
                content: 'Content for comment testing',
                author_id: testUserId
            };
            testPostId = await postController.create(postData);
        });

        afterEach(async () => {
            // Clean up test post
            try {
                await postController.delete(testPostId);
            } catch (error) {
                // Post might already be deleted
            }
        });

        it('should create and retrieve comment with aligned field names', async () => {
            // Create comment using aligned model
            const commentData: Comment = {
                post_id: testPostId,
                user_id: testUserId,
                comentario: 'This is a test comment'
            };

            const commentId = await commentController.create(commentData);
            expect(commentId).toBeDefined();
            expect(typeof commentId).toBe('number');

            // Retrieve comments and verify field alignment
            const retrievedComments = await commentController.getByPostId(testPostId);
            expect(retrievedComments).toHaveLength(1);
            
            const retrievedComment = retrievedComments[0];
            expect(retrievedComment.id).toBe(commentId);
            expect(retrievedComment.post_id).toBe(testPostId);
            expect(retrievedComment.user_id).toBe(testUserId);
            expect(retrievedComment.comentario).toBe('This is a test comment');
            expect(retrievedComment.created_at).toBeDefined();
            
            // Verify no field mapping issues - should have user_id and comentario
            expect(retrievedComment).toHaveProperty('user_id');
            expect(retrievedComment).toHaveProperty('comentario');
            expect(retrievedComment).not.toHaveProperty('author_id');
            expect(retrievedComment).not.toHaveProperty('content');

            // Clean up
            await commentController.delete(commentId);
        });

        it('should update comment with aligned field names', async () => {
            // Create initial comment
            const commentData: Comment = {
                post_id: testPostId,
                user_id: testUserId,
                comentario: 'Original comment text'
            };

            const commentId = await commentController.create(commentData);

            // Update using aligned field names
            const updateData = {
                comentario: 'Updated comment text'
            };

            const updatedComment = await commentController.update(commentId, updateData);
            
            // Verify all fields are properly aligned
            expect(updatedComment.id).toBe(commentId);
            expect(updatedComment.post_id).toBe(testPostId);
            expect(updatedComment.user_id).toBe(testUserId);
            expect(updatedComment.comentario).toBe('Updated comment text');
            expect(updatedComment.created_at).toBeDefined();

            // Clean up
            await commentController.delete(commentId);
        });

        it('should handle resposta_id field correctly', async () => {
            // Create parent comment
            const parentCommentData: Comment = {
                post_id: testPostId,
                user_id: testUserId,
                comentario: 'Parent comment'
            };

            const parentCommentId = await commentController.create(parentCommentData);

            // Create reply comment with resposta_id
            const replyCommentData: Comment = {
                post_id: testPostId,
                user_id: testUser2Id,
                comentario: 'Reply to parent comment',
                resposta_id: parentCommentId
            };

            const replyCommentId = await commentController.create(replyCommentData);

            // Retrieve and verify resposta_id field
            const comments = await commentController.getByPostId(testPostId);
            const replyComment = comments.find(c => c.id === replyCommentId);
            
            expect(replyComment).toBeDefined();
            expect(replyComment!.resposta_id).toBe(parentCommentId);
            expect(replyComment!.user_id).toBe(testUser2Id);
            expect(replyComment!.comentario).toBe('Reply to parent comment');

            // Clean up
            await commentController.delete(replyCommentId);
            await commentController.delete(parentCommentId);
        });
    });

    describe('Like Model Alignment Tests', () => {
        let testPostId: number;

        beforeEach(async () => {
            // Create a test post for likes
            const postData: Post = {
                title: 'Test Post for Likes',
                content: 'Content for like testing',
                author_id: testUserId
            };
            testPostId = await postController.create(postData);
        });

        afterEach(async () => {
            // Clean up test post
            try {
                await postController.delete(testPostId);
            } catch (error) {
                // Post might already be deleted
            }
        });

        it('should toggle like with aligned field names', async () => {
            // Toggle like on
            const likeResult1 = await likeController.toggleLike(testPostId, testUserId);
            expect(likeResult1.liked).toBe(true);

            // Verify like count
            const likeCount1 = await likeController.getLikeCount(testPostId);
            expect(likeCount1).toBe(1);

            // Get user likes and verify field alignment
            const userLikes = await likeController.getUserLikes(testUserId);
            expect(userLikes).toHaveLength(1);
            
            const userLike = userLikes[0];
            expect(userLike.post_id).toBe(testPostId);
            expect(userLike.user_id).toBe(testUserId);
            expect(userLike.id).toBeDefined();
            
            // Verify no field mapping issues
            expect(userLike).toHaveProperty('user_id');
            expect(userLike).toHaveProperty('post_id');

            // Toggle like off
            const likeResult2 = await likeController.toggleLike(testPostId, testUserId);
            expect(likeResult2.liked).toBe(false);

            // Verify like count is back to 0
            const likeCount2 = await likeController.getLikeCount(testPostId);
            expect(likeCount2).toBe(0);
        });

        it('should get post likes with aligned field names', async () => {
            // Add likes from both users
            await likeController.toggleLike(testPostId, testUserId);
            await likeController.toggleLike(testPostId, testUser2Id);

            // Get post likes and verify field alignment
            const postLikes = await likeController.getPostLikes(testPostId);
            expect(postLikes).toHaveLength(2);

            postLikes.forEach(like => {
                expect(like.post_id).toBe(testPostId);
                expect(like.user_id).toBeDefined();
                expect(like.id).toBeDefined();
                
                // Verify no field mapping issues
                expect(like).toHaveProperty('user_id');
                expect(like).toHaveProperty('post_id');
            });

            // Clean up likes
            await likeController.toggleLike(testPostId, testUserId);
            await likeController.toggleLike(testPostId, testUser2Id);
        });
    });

    describe('Complete CRUD Flow Tests', () => {
        it('should handle complete post lifecycle with aligned models', async () => {
            // 1. Create post
            const postData: Post = {
                title: 'Complete Flow Test Post',
                content: 'Testing complete CRUD flow',
                author_id: testUserId
            };

            const postId = await postController.create(postData);
            expect(postId).toBeDefined();

            // 2. Read post and verify alignment
            const createdPosts = await postController.read({ id: postId });
            expect(createdPosts).toHaveLength(1);
            expect(createdPosts[0].author_id).toBe(testUserId);

            // 3. Add comment to post
            const commentData: Comment = {
                post_id: postId,
                user_id: testUser2Id,
                comentario: 'Great post!'
            };

            const commentId = await commentController.create(commentData);
            const comments = await commentController.getByPostId(postId);
            expect(comments).toHaveLength(1);
            expect(comments[0].user_id).toBe(testUser2Id);
            expect(comments[0].comentario).toBe('Great post!');

            // 4. Add like to post
            const likeResult = await likeController.toggleLike(postId, testUserId);
            expect(likeResult.liked).toBe(true);

            const likeCount = await likeController.getLikeCount(postId);
            expect(likeCount).toBe(1);

            // 5. Update post
            const updateData = {
                title: 'Updated Complete Flow Test Post',
                content: 'Updated content for testing'
            };

            const updatedPost = await postController.update(postId, updateData);
            expect(updatedPost.title).toBe('Updated Complete Flow Test Post');
            expect(updatedPost.author_id).toBe(testUserId);

            // 6. Update comment
            const updatedComment = await commentController.update(commentId, {
                comentario: 'Updated comment text'
            });
            expect(updatedComment.comentario).toBe('Updated comment text');
            expect(updatedComment.user_id).toBe(testUser2Id);

            // 7. Clean up in reverse order
            await likeController.toggleLike(postId, testUserId);
            await commentController.delete(commentId);
            await postController.delete(postId);
        });

        it('should maintain data consistency across all operations', async () => {
            // Create multiple posts, comments, and likes
            const post1Data: Post = {
                title: 'Consistency Test Post 1',
                content: 'First post for consistency testing',
                author_id: testUserId
            };

            const post2Data: Post = {
                title: 'Consistency Test Post 2',
                content: 'Second post for consistency testing',
                author_id: testUser2Id
            };

            const post1Id = await postController.create(post1Data);
            const post2Id = await postController.create(post2Data);

            // Add comments to both posts
            const comment1Data: Comment = {
                post_id: post1Id,
                user_id: testUser2Id,
                comentario: 'Comment on post 1'
            };

            const comment2Data: Comment = {
                post_id: post2Id,
                user_id: testUserId,
                comentario: 'Comment on post 2'
            };

            const comment1Id = await commentController.create(comment1Data);
            const comment2Id = await commentController.create(comment2Data);

            // Add likes
            await likeController.toggleLike(post1Id, testUserId);
            await likeController.toggleLike(post1Id, testUser2Id);
            await likeController.toggleLike(post2Id, testUserId);

            // Verify all data is consistent and aligned
            const allPosts = await postController.read({});
            const post1Comments = await commentController.getByPostId(post1Id);
            const post2Comments = await commentController.getByPostId(post2Id);
            const post1Likes = await likeController.getPostLikes(post1Id);
            const post2Likes = await likeController.getPostLikes(post2Id);

            // Verify posts have correct field names
            const post1 = allPosts.find(p => p.id === post1Id);
            const post2 = allPosts.find(p => p.id === post2Id);
            
            expect(post1!.author_id).toBe(testUserId);
            expect(post2!.author_id).toBe(testUser2Id);

            // Verify comments have correct field names
            expect(post1Comments[0].user_id).toBe(testUser2Id);
            expect(post1Comments[0].comentario).toBe('Comment on post 1');
            expect(post2Comments[0].user_id).toBe(testUserId);
            expect(post2Comments[0].comentario).toBe('Comment on post 2');

            // Verify likes have correct field names
            expect(post1Likes).toHaveLength(2);
            expect(post2Likes).toHaveLength(1);
            
            post1Likes.forEach(like => {
                expect(like.post_id).toBe(post1Id);
                expect([testUserId, testUser2Id]).toContain(like.user_id);
            });

            // Clean up
            await likeController.toggleLike(post1Id, testUserId);
            await likeController.toggleLike(post1Id, testUser2Id);
            await likeController.toggleLike(post2Id, testUserId);
            await commentController.delete(comment1Id);
            await commentController.delete(comment2Id);
            await postController.delete(post1Id);
            await postController.delete(post2Id);
        });
    });

    describe('Type Safety and Field Mapping Tests', () => {
        it('should reject operations with incorrect field names', async () => {
            const postData: Post = {
                title: 'Type Safety Test',
                content: 'Testing type safety',
                author_id: testUserId
            };

            const postId = await postController.create(postData);

            // Try to update with invalid field (this should be caught by TypeScript)
            // But we can test runtime validation
            await expect(postController.update(postId, {
                author_id: 'invalid_string' as any
            })).rejects.toThrow('author_id deve ser um número válido');

            // Clean up
            await postController.delete(postId);
        });

        it('should ensure no field mapping errors occur in database operations', async () => {
            // Create post
            const postData: Post = {
                title: 'Field Mapping Test',
                content: 'Testing field mapping consistency',
                author_id: testUserId
            };

            const postId = await postController.create(postData);

            // Create comment
            const commentData: Comment = {
                post_id: postId,
                user_id: testUser2Id,
                comentario: 'Testing field mapping in comments'
            };

            const commentId = await commentController.create(commentData);

            // Verify that database returns exactly what the models expect
            const posts = await postController.read({ id: postId });
            const comments = await commentController.getByPostId(postId);

            // Check that returned objects match model interfaces exactly
            const post = posts[0];
            const comment = comments[0];

            // Post should have author_id, not author
            expect(post).toHaveProperty('author_id');
            expect(post).not.toHaveProperty('author');
            expect(typeof post.author_id).toBe('number');

            // Comment should have user_id and comentario, not author_id and content
            expect(comment).toHaveProperty('user_id');
            expect(comment).toHaveProperty('comentario');
            expect(comment).not.toHaveProperty('author_id');
            expect(comment).not.toHaveProperty('content');
            expect(typeof comment.user_id).toBe('number');
            expect(typeof comment.comentario).toBe('string');

            // Clean up
            await commentController.delete(commentId);
            await postController.delete(postId);
        });
    });
});
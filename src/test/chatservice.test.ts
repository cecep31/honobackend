import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks, createChainableMock } from './helpers/drizzleMock';
import { chatService, openrouterService } from '../services';

// Mock OpenRouterService
const mockGenerateResponse = mock();
const mockGenerateStream = mock();
mock.module('../modules/chat/services/openrouterService', () => {
    return {
        __esModule: true,
        default: mock(() => {
            return {
                generateResponse: mockGenerateResponse,
                generateStream: mockGenerateStream,
            }
        }),
    }
});

// Create mocks using helper
const mocks = createDrizzleMocks();

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mocks.mockInsert,
            select: mocks.mockSelect,
            delete: mocks.mockDelete,
        }
    }
});

describe('ChatService', () => {
    beforeEach(() => {
        mocks.reset();
        mockGenerateResponse.mockReset();
        mockGenerateStream.mockReset();
    });

    describe('createConversation', () => {
        it('should create a new conversation', async () => {
            const userId = 'user-1';
            const body = { title: 'Test Conversation' };
            
            mocks.mockReturning.mockResolvedValue([{ 
                id: 'conv-1', 
                title: 'Test Conversation',
                user_id: userId 
            }]);

            const result = await chatService.createConversation(userId, body);

            expect(result).toHaveProperty('id');
            expect(result.title).toBe('Test Conversation');
            expect(mocks.mockInsert).toHaveBeenCalled();
        });
    });

    describe('saveStreamingMessage', () => {
        it('should save a streaming message with usage stats', async () => {
            const conversationId = 'conv-1';
            const userId = 'user-1';
            const content = 'AI response content';
            const model = 'gpt-4';
            const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };

            mocks.mockReturning.mockResolvedValue([{
                id: 'msg-ai',
                conversation_id: conversationId,
                content,
                role: 'assistant',
                model,
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens
            }]);

            const result = await chatService.saveStreamingMessage(conversationId, userId, content, model, usage);

            expect(result).toHaveProperty('content', content);
            expect(result).toHaveProperty('role', 'assistant');
            expect(result).toHaveProperty('total_tokens', 30);
            expect(mocks.mockInsert).toHaveBeenCalled();
        });

        it('should save a streaming message without usage stats', async () => {
            const conversationId = 'conv-1';
            const userId = 'user-1';
            const content = 'AI response';
            const model = 'gpt-4';

            mocks.mockReturning.mockResolvedValue([{
                id: 'msg-ai',
                conversation_id: conversationId,
                content,
                role: 'assistant',
                model
            }]);

            const result = await chatService.saveStreamingMessage(conversationId, userId, content, model);

            expect(result).toHaveProperty('content', content);
            expect(mocks.mockInsert).toHaveBeenCalled();
        });
    });

    // Note: The following tests are simplified since they depend on complex DB query chains
    // In a real scenario, you might want to use integration tests or a more sophisticated mock setup
    
    describe('createConversationStream', () => {
        it('should create a conversation and return stream generator', async () => {
            const userId = 'user-1';
            const body = { content: 'Hello AI', model: 'gpt-4' };

            // Mock conversation creation
            mocks.mockReturning.mockResolvedValue([{ 
                id: 'conv-1', 
                title: 'Hello AI',
                user_id: userId 
            }]);

            // Mock stream generator
            mockGenerateStream.mockReturnValue((async function* () {
                yield 'Hello';
                yield ' world';
            })());

            const result = await chatService.createConversationStream(userId, body);

            expect(result).toHaveProperty('user_message');
            expect(result).toHaveProperty('stream_generator');
            expect(result).toHaveProperty('conversation_id');
        });
    });
});

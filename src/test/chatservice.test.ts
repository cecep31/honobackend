import { describe, it, expect, beforeEach, mock } from 'bun:test';
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


// Mock DB with flexible chain
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockDeleteReturning = mock();
const mockDeleteWhere = mock(() => ({ returning: mockDeleteReturning }));
const mockDelete = mock(() => ({ where: mockDeleteWhere }));

// Chainable select mock
const createChainableMock = (finalResult: any) => {
    const chainMock: any = {};
    chainMock.from = mock(() => chainMock);
    chainMock.where = mock(() => chainMock);
    chainMock.orderBy = mock(() => chainMock);
    chainMock.offset = mock(() => chainMock);
    chainMock.limit = mock(() => chainMock);
    chainMock.then = mock((cb: any) => cb(finalResult));
    return mock(() => chainMock);
};

let mockSelectResult: any = [];
const mockSelect = createChainableMock([]);

mock.module('../database/drizzle', () => {
    return {
        db: {
            insert: mockInsert,
            select: mockSelect,
            delete: mockDelete,
        }
    }
});

describe('ChatService', () => {
    beforeEach(() => {
        mockReturning.mockReset();
        mockDeleteReturning.mockReset();
        mockGenerateResponse.mockReset();
        mockGenerateStream.mockReset();
        mockInsert.mockClear();
        mockDelete.mockClear();
    });

    describe('createConversation', () => {
        it('should create a new conversation', async () => {
            const userId = 'user-1';
            const body = { title: 'Test Conversation' };
            
            mockReturning.mockResolvedValue([{ 
                id: 'conv-1', 
                title: 'Test Conversation',
                user_id: userId 
            }]);

            const result = await chatService.createConversation(userId, body);

            expect(result).toHaveProperty('id');
            expect(result.title).toBe('Test Conversation');
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('saveStreamingMessage', () => {
        it('should save a streaming message with usage stats', async () => {
            const conversationId = 'conv-1';
            const userId = 'user-1';
            const content = 'AI response content';
            const model = 'gpt-4';
            const usage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };

            mockReturning.mockResolvedValue([{
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
            expect(mockInsert).toHaveBeenCalled();
        });

        it('should save a streaming message without usage stats', async () => {
            const conversationId = 'conv-1';
            const userId = 'user-1';
            const content = 'AI response';
            const model = 'gpt-4';

            mockReturning.mockResolvedValue([{
                id: 'msg-ai',
                conversation_id: conversationId,
                content,
                role: 'assistant',
                model
            }]);

            const result = await chatService.saveStreamingMessage(conversationId, userId, content, model);

            expect(result).toHaveProperty('content', content);
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    // Note: The following tests are simplified since they depend on complex DB query chains
    // In a real scenario, you might want to use integration tests or a more sophisticated mock setup
    
    describe('createConversationStream', () => {
        it('should create a conversation and return stream generator', async () => {
            const userId = 'user-1';
            const body = { content: 'Hello AI', model: 'gpt-4' };

            // Mock conversation creation
            mockReturning.mockResolvedValue([{ 
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

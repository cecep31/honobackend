import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ChatService } from '../modules/chat/services/chatService';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockConversationFindFirst = mock();

const buildSelectChain = (result: any) => {
  const chain: any = {};
  chain.where = mock(() => chain);
  chain.orderBy = mock(() => chain);
  chain.offset = mock(() => chain);
  chain.limit = mock(() => chain);
  chain.then = (resolve: any) => resolve(result);
  return chain;
};

const mockGenerateResponse = mock();
const mockGenerateStream = mock();

mock.module('../database/drizzle', () => ({
  db: {
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
    select: mocks.mockSelect,
    delete: mocks.mockDelete,
    query: {
      chat_conversations: {
        findFirst: mockConversationFindFirst,
      },
    },
  },
}));

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService({
      generateResponse: mockGenerateResponse,
      generateStream: mockGenerateStream,
    } as any);

    mocks.reset();
    mockConversationFindFirst.mockReset();
    mockGenerateResponse.mockReset();
    mockGenerateStream.mockReset();
    mocks.mockSelect.mockImplementation(() => ({
      from: mock(() => buildSelectChain([])),
    }));
  });

  it('creates a conversation with a fallback title', async () => {
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'conv-1',
        title: 'New conversation',
        user_id: 'user-1',
      },
    ]);

    const result = await chatService.createConversation('user-1', {});

    expect(result.title).toBe('New conversation');
    expect(mocks.mockInsert).toHaveBeenCalled();
  });

  it('creates a streamed conversation with title from first message', async () => {
    mocks.mockReturning
      .mockResolvedValueOnce([
        {
          id: 'conv-1',
          title: 'Hello AI from the first user message',
          user_id: 'user-1',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          content: 'Hello AI from the first user message',
          role: 'user',
        },
      ]);
    mockGenerateStream.mockReturnValue(
      (async function* () {
        yield 'Hi there';
      })()
    );

    const result = await chatService.createConversationStream('user-1', {
      content: 'Hello AI from the first user message',
    });

    expect(result.conversation_id).toBe('conv-1');
    expect(result.user_message.content).toBe('Hello AI from the first user message');
    expect(mockGenerateStream).toHaveBeenCalled();
  });

  it('updates conversation metadata for pinning', async () => {
    mocks.mockSelect.mockImplementation(() => ({
      from: mock(() =>
        buildSelectChain([
          {
            id: 'conv-1',
            title: 'Existing conversation',
            user_id: 'user-1',
            is_pinned: false,
            deleted_at: null,
          },
        ])
      ),
    }));
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'conv-1',
        title: 'Existing conversation',
        is_pinned: true,
      },
    ]);

    const result = await chatService.updateConversation('conv-1', 'user-1', { is_pinned: true });

    expect(result.is_pinned).toBe(true);
    expect(mocks.mockUpdate).toHaveBeenCalled();
  });

  it('saves a streaming message with usage stats', async () => {
    mocks.mockReturning.mockResolvedValue([
      {
        id: 'msg-ai',
        conversation_id: 'conv-1',
        content: 'AI response content',
        role: 'assistant',
        model: 'gpt-4',
        total_tokens: 30,
      },
    ]);

    const result = await chatService.saveStreamingMessage(
      'conv-1',
      'user-1',
      'AI response content',
      'gpt-4',
      { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    );

    expect(result.total_tokens).toBe(30);
    expect(mocks.mockInsert).toHaveBeenCalled();
  });
});

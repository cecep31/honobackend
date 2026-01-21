import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { openrouterService } from '../services';

// Mock config
mock.module('../config', () => {
    return {
        default: {
            openrouter: {
                baseUrl: 'https://openrouter.ai/api/v1',
                apiKey: 'test-api-key',
                defaultModel: 'openai/gpt-3.5-turbo'
            }
        }
    }
});

// Store original fetch
const originalFetch = globalThis.fetch;

describe('OpenRouterService', () => {
    let mockFetch: ReturnType<typeof mock>;

    beforeEach(() => {
        mockFetch = mock();
        globalThis.fetch = mockFetch as unknown as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('generateResponse', () => {
        it('should return AI response for valid messages', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const mockResponse = {
                choices: [{ message: { role: 'assistant', content: 'Hi there!' } }],
                usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await openrouterService.generateResponse(messages);

            expect(result.choices[0].message.content).toBe('Hi there!');
            expect(result.usage.total_tokens).toBe(30);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/chat/completions'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key',
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        it('should use custom model if provided', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const customModel = 'anthropic/claude-3-opus';

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { role: 'assistant', content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
                })
            });

            await openrouterService.generateResponse(messages, customModel);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining(customModel)
                })
            );
        });

        it('should use custom temperature if provided', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const temperature = 0.9;

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { role: 'assistant', content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
                })
            });

            await openrouterService.generateResponse(messages, undefined, temperature);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"temperature":0.9')
                })
            );
        });

        it('should throw error on API failure', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('Server error')
            });

            await expect(openrouterService.generateResponse(messages)).rejects.toThrow('OpenRouter API error');
        });

        it('should handle API rate limiting', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            mockFetch.mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: () => Promise.resolve('Rate limited')
            });

            await expect(openrouterService.generateResponse(messages)).rejects.toThrow('OpenRouter API error');
        });

        it('should pass abort signal to fetch', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const controller = new AbortController();

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { role: 'assistant', content: 'Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
                })
            });

            await openrouterService.generateResponse(messages, undefined, 0.7, controller.signal);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    signal: controller.signal
                })
            );
        });
    });

    describe('generateStream', () => {
        it('should yield streamed content chunks', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            // Create a mock readable stream
            const chunks = [
                'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
                'data: {"choices":[{"delta":{"content":" world"}}]}\n',
                'data: {"choices":[{"delta":{"content":"!"}}],"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13}}\n',
                'data: [DONE]\n'
            ];

            let chunkIndex = 0;
            const mockReader = {
                read: mock(() => {
                    if (chunkIndex < chunks.length) {
                        const value = new TextEncoder().encode(chunks[chunkIndex]);
                        chunkIndex++;
                        return Promise.resolve({ done: false, value });
                    }
                    return Promise.resolve({ done: true, value: undefined });
                }),
                releaseLock: mock()
            };

            mockFetch.mockResolvedValue({
                ok: true,
                body: { getReader: () => mockReader }
            });

            const generator = openrouterService.generateStream(messages);
            const results: string[] = [];

            for await (const chunk of generator) {
                if (typeof chunk === 'string') {
                    results.push(chunk);
                }
            }

            expect(results).toContain('Hello');
            expect(results).toContain(' world');
            expect(results).toContain('!');
        });

        it('should throw error if no response body', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            mockFetch.mockResolvedValue({
                ok: true,
                body: null
            });

            const generator = openrouterService.generateStream(messages);

            await expect(async () => {
                for await (const _ of generator) {
                    // consume
                }
            }).toThrow('No response body');
        });

        it('should throw error on API failure', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('Server error')
            });

            const generator = openrouterService.generateStream(messages);

            await expect(async () => {
                for await (const _ of generator) {
                    // consume
                }
            }).toThrow('OpenRouter API error');
        });

        it('should handle abort signal', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            const controller = new AbortController();

            const mockReader = {
                read: mock(() => Promise.resolve({ done: true, value: undefined })),
                releaseLock: mock()
            };

            mockFetch.mockResolvedValue({
                ok: true,
                body: { getReader: () => mockReader }
            });

            const generator = openrouterService.generateStream(messages, undefined, 0.7, controller.signal);

            for await (const _ of generator) {
                // consume
            }

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    signal: controller.signal
                })
            );
        });

        it('should release reader lock on completion', async () => {
            const messages = [{ role: 'user', content: 'Hello' }];

            const mockReleaseLock = mock();
            const mockReader = {
                read: mock(() => Promise.resolve({ done: true, value: undefined })),
                releaseLock: mockReleaseLock
            };

            mockFetch.mockResolvedValue({
                ok: true,
                body: { getReader: () => mockReader }
            });

            const generator = openrouterService.generateStream(messages);

            for await (const _ of generator) {
                // consume
            }

            expect(mockReleaseLock).toHaveBeenCalled();
        });
    });
});


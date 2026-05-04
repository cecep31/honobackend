import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { externalApiClient } from '../utils/httpClient';

describe('externalApiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('get', () => {
    it('returns parsed JSON on success', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: 1, name: 'Test' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;

      const result = await externalApiClient.get<{ id: number; name: string }>('https://api.example.com/data');

      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    it('sends custom headers', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;
      globalThis.fetch = fetchMock;

      await externalApiClient.get('https://api.example.com/data', {
        headers: { Authorization: 'Bearer token' },
      });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual({ Authorization: 'Bearer token' });
    });

    it('throws on non-OK response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response('Not Found', {
            status: 404,
            statusText: 'Not Found',
          })
        )
      ) as typeof fetch;

      await expect(externalApiClient.get('https://api.example.com/data')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('throws with timeout message on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = mock(() => Promise.reject(abortError)) as typeof fetch;

      await expect(externalApiClient.get('https://api.example.com/data', { timeout: 100 })).rejects.toThrow(
        'Request timeout after 100ms'
      );
    });

    it('throws with timeout message on TimeoutError', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      globalThis.fetch = mock(() => Promise.reject(timeoutError)) as typeof fetch;

      await expect(externalApiClient.get('https://api.example.com/data', { timeout: 200 })).rejects.toThrow(
        'Request timeout after 200ms'
      );
    });

    it('re-throws generic errors unchanged', async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('Network failure'))) as typeof fetch;

      await expect(externalApiClient.get('https://api.example.com/data')).rejects.toThrow('Network failure');
    });

    it('uses default timeout when not specified', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;
      globalThis.fetch = fetchMock;

      await externalApiClient.get('https://api.example.com/data');

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].signal).toBeDefined();
    });
  });

  describe('post', () => {
    it('returns parsed JSON on success', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ created: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;

      const result = await externalApiClient.post<{ created: boolean }>('https://api.example.com/data', {
        name: 'Test',
      });

      expect(result.data).toEqual({ created: true });
    });

    it('sends JSON body with correct headers', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;
      globalThis.fetch = fetchMock;

      await externalApiClient.post('https://api.example.com/data', { key: 'value' });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].body).toBe(JSON.stringify({ key: 'value' }));
      expect(callArgs[1].headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    });

    it('merges custom headers', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      ) as typeof fetch;
      globalThis.fetch = fetchMock;

      await externalApiClient.post('https://api.example.com/data', {}, { headers: { 'X-Custom': '1' } });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Custom': '1',
      });
    });

    it('throws on non-OK response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response('Bad Request', {
            status: 400,
            statusText: 'Bad Request',
          })
        )
      ) as typeof fetch;

      await expect(externalApiClient.post('https://api.example.com/data', {})).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('throws with timeout message on timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = mock(() => Promise.reject(abortError)) as typeof fetch;

      await expect(externalApiClient.post('https://api.example.com/data', {}, { timeout: 50 })).rejects.toThrow(
        'Request timeout after 50ms'
      );
    });
  });
});

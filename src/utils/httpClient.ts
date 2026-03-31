/**
 * Default timeout for outbound HTTP requests (e.g. GitHub, market data) in milliseconds
 */
const EXTERNAL_API_TIMEOUT_MS = 15000;

function applyTimeoutMessage(error: unknown, timeoutMs: number): void {
  if (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  ) {
    console.error(`Request timeout after ${timeoutMs}ms`);
    error.message = `Request timeout after ${timeoutMs}ms`;
  }
}

/**
 * Fetch-based client for external APIs with JSON bodies and configurable timeout.
 */
export const externalApiClient = {
  async get<T>(
    url: string,
    config?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<{ data: T }> {
    const timeoutMs = config?.timeout ?? EXTERNAL_API_TIMEOUT_MS;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: config?.headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as T;
      return { data };
    } catch (error) {
      applyTimeoutMessage(error, timeoutMs);
      throw error;
    }
  },

  async post<T>(
    url: string,
    body: Record<string, unknown>,
    config?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<{ data: T }> {
    const timeoutMs = config?.timeout ?? EXTERNAL_API_TIMEOUT_MS;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...config?.headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as T;
      return { data };
    } catch (error) {
      applyTimeoutMessage(error, timeoutMs);
      throw error;
    }
  },
};

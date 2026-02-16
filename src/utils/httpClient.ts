import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

/**
 * Default timeout for axios requests in milliseconds
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Create an axios instance with default timeout configuration
 */
export function createAxiosInstance(timeout: number = DEFAULT_TIMEOUT): AxiosInstance {
  const instance = axios.create({
    timeout,
  });

  // Add request error interceptor for better error handling
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.code === 'ECONNABORTED') {
        console.error(`Request timeout after ${timeout}ms`);
        error.message = `Request timeout after ${timeout}ms`;
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Default axios instance with 10 second timeout
 */
export const httpClient = createAxiosInstance();

/**
 * Axios instance for external APIs (GitHub, etc.) with 15 second timeout
 */
export const externalApiClient = createAxiosInstance(15000);

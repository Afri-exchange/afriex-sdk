import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';
import { Config } from '../config/Config';
import { Logger } from '../utils/logger';
import {
    AfriexError,
    ApiError,
    NetworkError,
    RateLimitError,
    ApiErrorResponse,
} from '../errors';

export interface RequestOptions {
    headers?: Record<string, string>;
    params?: object;
    timeout?: number;
}

interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
    __retryCount?: number;
}

export class HttpClient {
    private axiosInstance: AxiosInstance;
    private logger: Logger;
    private config: Config;

    constructor(config: Config) {
        this.config = config;
        this.logger = new Logger(config.logLevel, config.enableLogging);

        this.axiosInstance = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'User-Agent': 'Afriex-TypeScript-SDK/1.0.0',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                this.logger.debug('Request:', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    params: config.params,
                });
                return config;
            },
            (error) => {
                this.logger.error('Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                this.logger.debug('Response:', {
                    status: response.status,
                    url: response.config.url,
                });
                return response;
            },
            async (error: AxiosError) => {
                return this.handleError(error);
            }
        );
    }

    private async handleError(error: AxiosError): Promise<unknown> {
        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;

            this.logger.error('API Error:', {
                status,
                data,
                url: error.config?.url,
            });

            // Check if we should retry
            if (this.shouldRetry(error)) {
                return this.retryRequest(error);
            }

            // Handle rate limiting
            if (status === 429) {
                throw new RateLimitError(
                    data as ApiErrorResponse,
                    error.response.headers['retry-after'] as string | undefined
                );
            }

            // Handle other API errors
            throw new ApiError(data as ApiErrorResponse, status);
        } else if (error.request) {
            // Request made but no response
            this.logger.error('Network Error:', error.message);
            throw new NetworkError('No response received from server', error);
        } else {
            // Something else happened
            this.logger.error('Unknown Error:', error.message);
            throw new AfriexError(error.message);
        }
    }

    private shouldRetry(error: AxiosError): boolean {
        if (!error.config || !error.response) {
            return false;
        }

        const status = error.response.status;
        const config = error.config as AxiosRequestConfigWithRetry;
        const retryCount = config.__retryCount || 0;

        return (
            retryCount < this.config.maxRetries &&
            this.config.retryableStatusCodes.includes(status)
        );
    }

    private async retryRequest(error: AxiosError): Promise<unknown> {
        const config = error.config as AxiosRequestConfigWithRetry;
        config.__retryCount = (config.__retryCount || 0) + 1;

        const delay = this.config.retryDelay * Math.pow(2, config.__retryCount - 1);

        this.logger.info(`Retrying request (${config.__retryCount}/${this.config.maxRetries}) after ${delay}ms`);

        await this.sleep(delay);

        try {
            const response = await this.axiosInstance.request(config);
            return response.data;
        } catch (retryError) {
            if (retryError instanceof AxiosError) {
                return this.handleError(retryError);
            }
            throw retryError;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async get<T>(
        path: string,
        options?: RequestOptions
    ): Promise<T> {
        const response = await this.axiosInstance.get<T>(path, {
            params: options?.params,
            headers: options?.headers,
            timeout: options?.timeout,
        });
        return response.data;
    }

    async post<T>(
        path: string,
        data?: unknown,
        options?: RequestOptions
    ): Promise<T> {
        const response = await this.axiosInstance.post<T>(path, data, {
            params: options?.params,
            headers: options?.headers,
            timeout: options?.timeout,
        });
        return response.data;
    }

    async put<T>(
        path: string,
        data?: unknown,
        options?: RequestOptions
    ): Promise<T> {
        const response = await this.axiosInstance.put<T>(path, data, {
            params: options?.params,
            headers: options?.headers,
            timeout: options?.timeout,
        });
        return response.data;
    }

    async patch<T>(
        path: string,
        data?: unknown,
        options?: RequestOptions
    ): Promise<T> {
        const response = await this.axiosInstance.patch<T>(path, data, {
            params: options?.params,
            headers: options?.headers,
            timeout: options?.timeout,
        });
        return response.data;
    }

    async delete<T>(
        path: string,
        options?: RequestOptions
    ): Promise<T> {
        const response = await this.axiosInstance.delete<T>(path, {
            params: options?.params,
            headers: options?.headers,
            timeout: options?.timeout,
        });
        return response.data;
    }
}

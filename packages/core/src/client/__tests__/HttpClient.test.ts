import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { HttpClient } from '../HttpClient';
import { Config } from '../../config/Config';
import { Environment } from '../../config/Environment';
import { ApiError, NetworkError, RateLimitError } from '../../errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpClient', () => {
    let config: Config;
    let httpClient: HttpClient;
    let responseErrorHandler: (error: any) => Promise<any>;

    beforeEach(() => {
        config = new Config({
            apiKey: 'test-api-key',
            environment: Environment.STAGING,
            retryConfig: {
                maxRetries: 3,
                retryDelay: 10,
                retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            },
        });

        const mockCreate = jest.fn(() => ({
            interceptors: {
                request: { use: jest.fn() },
                response: {
                    use: jest.fn((_, error) => {
                        responseErrorHandler = error;
                        // Return rejected promise to simulate axios behavior if needed, 
                        // but since we capture the handler, we call it manually.
                        // Ideally interceptor returns the error or new promise.
                    }),
                },
            },
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            request: jest.fn(),
        }));

        mockedAxios.create.mockImplementation(mockCreate as any);

        httpClient = new HttpClient(config);
        // Inject mock for internal usage - this creates a NEW instance but mocks are fresh
        (httpClient as any).axiosInstance = mockedAxios.create();
    });

    const createAxiosError = (status?: number, data?: any, code?: string): AxiosError => {
        const error = new Error('Axios Error') as AxiosError;
        error.isAxiosError = true;
        error.config = { url: '/test', headers: {} as any } as InternalAxiosRequestConfig;
        if (status) {
            error.response = {
                status,
                data: data || {},
                statusText: 'Error',
                headers: {},
                config: error.config,
            };
        }
        if (code) {
            error.code = code;
        }
        error.toJSON = jest.fn();
        return error;
    };

    describe('get', () => {
        it('should make a GET request', async () => {
            const mockResponse = { data: { id: '123' } };
            // Mock the instance method, not global axios
            const instance = (httpClient as any).axiosInstance;
            instance.get.mockResolvedValue(mockResponse);

            const result = await httpClient.get('/test');

            expect(instance.get).toHaveBeenCalledWith('/test', {
                headers: undefined,
                params: undefined,
                timeout: undefined,
            });
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('Error Handling', () => {
        it('should throw ApiError on 400 Bad Request', async () => {
            const error = createAxiosError(400, { message: 'Bad Request' });
            await expect(responseErrorHandler(error)).rejects.toThrow(ApiError);
        });

        it('should throw RateLimitError on 429', async () => {
            const error = createAxiosError(429, { message: 'Too Many Requests' });
            error.response!.headers['retry-after'] = '60';

            // Exhaust retries
            const retryConfig = (error.config as any);
            retryConfig.__retryCount = 3;

            await expect(responseErrorHandler(error)).rejects.toThrow(RateLimitError);
        });

        it('should throw NetworkError when no response received', async () => {
            const error = createAxiosError(undefined, undefined, 'ECONNREFUSED');
            error.request = {};
            await expect(responseErrorHandler(error)).rejects.toThrow(NetworkError);
        });
    });

    describe('Retry Logic', () => {
        it('should retry on 503 Service Unavailable', async () => {
            const error = createAxiosError(503, { message: 'Service Unavailable' });

            // Mock the instance's request method for the RETRY call
            const instance = (httpClient as any).axiosInstance;
            const successResponse = { data: { success: true } };
            instance.request.mockResolvedValueOnce(successResponse);

            // Mock sleep
            (httpClient as any).sleep = jest.fn().mockResolvedValue(undefined);

            const result = await responseErrorHandler(error);

            expect(instance.request).toHaveBeenCalled();
            expect(result).toEqual(successResponse.data);
            expect((httpClient as any).sleep).toHaveBeenCalled();
        });
    });
});

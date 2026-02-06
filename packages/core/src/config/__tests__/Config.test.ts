import { Config } from '../Config';
import { Environment } from '../Environment';

describe('Config', () => {
    it('should initialize with valid config', () => {
        const config = new Config({
            apiKey: 'test-api-key',
            environment: Environment.STAGING,
        });

        expect(config.apiKey).toBe('test-api-key');
        expect(config.environment).toBe(Environment.STAGING);
    });

    it('should throw error if apiKey is missing', () => {
        expect(() => new Config({} as any)).toThrow('API key is required');
    });

    it('should throw error if apiKey is empty', () => {
        expect(() => new Config({ apiKey: '' } as any)).toThrow('API key is required');
    });

    it('should use default values if not provided', () => {
        const config = new Config({
            apiKey: 'test-api-key',
        });

        expect(config.environment).toBe(Environment.PRODUCTION);
        expect(config.maxRetries).toBe(0); // Disabled by default
    });

    it('should allow overriding default values', () => {
        const config = new Config({
            apiKey: 'test-api-key',
            retryConfig: {
                maxRetries: 5,
                retryDelay: 2000,
                retryableStatusCodes: [500],
            },
        });

        expect(config.maxRetries).toBe(5);
        expect(config.retryDelay).toBe(2000);
        expect(config.retryableStatusCodes).toEqual([500]);
    });
});

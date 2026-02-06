import { Environment, DEFAULT_CONFIG, EnvironmentConfig } from './Environment';
import { LogLevel } from '../utils/logger';

export interface AfriexConfig {
    apiKey: string;
    environment?: Environment;
    customConfig?: Partial<EnvironmentConfig>;
    logLevel?: LogLevel;
    enableLogging?: boolean;
    retryConfig?: RetryConfig;
    webhookSecret?: string;
}

export interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryableStatusCodes: number[];
}

export class Config {
    public readonly apiKey: string;
    public readonly environment: Environment;
    public readonly baseUrl: string;
    public readonly timeout: number;
    public readonly maxRetries: number;
    public readonly retryDelay: number;
    public readonly logLevel: LogLevel;
    public readonly enableLogging: boolean;
    public readonly retryableStatusCodes: number[];
    public readonly webhookSecret?: string;

    constructor(config: AfriexConfig) {
        this.validateConfig(config);

        this.apiKey = config.apiKey;
        this.environment = config.environment || Environment.PRODUCTION;
        this.logLevel = config.logLevel || LogLevel.ERROR;
        this.enableLogging = config.enableLogging ?? true;
        this.webhookSecret = config.webhookSecret;

        const envConfig = DEFAULT_CONFIG[this.environment];
        const customConfig = config.customConfig || {};

        this.baseUrl = customConfig.baseUrl || envConfig.baseUrl;
        this.timeout = customConfig.timeout || envConfig.timeout;
        this.maxRetries = config.retryConfig?.maxRetries ?? envConfig.maxRetries;
        this.retryDelay = config.retryConfig?.retryDelay || envConfig.retryDelay;
        this.retryableStatusCodes = config.retryConfig?.retryableStatusCodes || [
            408, 429, 500, 502, 503, 504,
        ];
    }

    private validateConfig(config: AfriexConfig): void {
        if (!config.apiKey || typeof config.apiKey !== 'string') {
            throw new Error('API key is required and must be a string');
        }

        if (config.apiKey.trim().length === 0) {
            throw new Error('API key cannot be empty');
        }
    }
}

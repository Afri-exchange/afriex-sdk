export enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production',
}

export const BASE_URLS = {
    [Environment.STAGING]: 'https://staging.afx-server.com',
    [Environment.PRODUCTION]: 'https://prod.afx-server.com',
} as const;

export interface EnvironmentConfig {
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
}

export const DEFAULT_CONFIG: Record<Environment, EnvironmentConfig> = {
    [Environment.STAGING]: {
        baseUrl: BASE_URLS[Environment.STAGING],
        timeout: 30000,
        maxRetries: 0,
        retryDelay: 1000,
    },
    [Environment.PRODUCTION]: {
        baseUrl: BASE_URLS[Environment.PRODUCTION],
        timeout: 30000,
        maxRetries: 0,
        retryDelay: 1000,
    },
};

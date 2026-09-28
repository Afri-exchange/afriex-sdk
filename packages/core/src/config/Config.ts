import {
  Environment,
  DEFAULT_CONFIG,
  EnvironmentConfig,
} from "./Environment.js";
import { LogLevel } from "../utils/logger.js";

/**
 * The API version this SDK was written for, sent as the `x-api-version`
 * header. It is also what the API serves when the header is left out.
 */
export const DEFAULT_API_VERSION = "2026-05-18";

/** The header the API version is sent in. */
export const API_VERSION_HEADER = "x-api-version";

/** The header a request signature is sent in. */
export const API_SIGNATURE_HEADER = "x-api-signature";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

/**
 * The methods retried by default: those that are safe to send twice. POST and
 * PATCH are left out, because repeating one can repeat its effect.
 */
export const DEFAULT_RETRYABLE_METHODS: readonly HttpMethod[] = [
  "GET",
  "PUT",
  "HEAD",
  "DELETE",
  "OPTIONS",
  "TRACE",
];

/** What a request signer is given. */
export interface RequestToSign {
  method: string;
  /** The full URL, query string included. */
  url: string;
  /** The JSON body as it is sent, or an empty string when there is none. */
  body: string;
}

/**
 * Returns the signature to send in the `x-api-signature` header. Return
 * `undefined` to send the request unsigned.
 */
export type RequestSigner = (
  request: RequestToSign
) => string | undefined | Promise<string | undefined>;

export interface AfriexConfig {
  apiKey: string;
  environment?: Environment;
  customConfig?: Partial<EnvironmentConfig>;
  logLevel?: LogLevel;
  enableLogging?: boolean;
  retryConfig?: RetryConfig;
  /**
   * Sent as the `x-api-version` header. Defaults to `DEFAULT_API_VERSION`,
   * the version this SDK's types describe.
   */
  apiVersion?: string;
  /**
   * Signs each request, for a business that has payload signing enabled.
   * The result is sent in the `x-api-signature` header.
   */
  signRequest?: RequestSigner;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
  /**
   * The HTTP methods that are retried. Defaults to
   * `DEFAULT_RETRYABLE_METHODS`, which leaves out POST and PATCH.
   *
   * Add POST only when every POST you send can be repeated safely. A
   * repeated `paymentBatches.withdraw()` pays every recipient again.
   */
  retryableMethods?: HttpMethod[];
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
  public readonly retryableMethods: HttpMethod[];
  public readonly apiVersion: string;
  public readonly signRequest?: RequestSigner;

  constructor(config: AfriexConfig) {
    this.validateConfig(config);

    this.apiKey = config.apiKey;
    this.environment = config.environment || Environment.PRODUCTION;
    this.logLevel = config.logLevel || LogLevel.ERROR;
    this.enableLogging = config.enableLogging ?? true;
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.signRequest = config.signRequest;

    const envConfig = DEFAULT_CONFIG[this.environment];
    const customConfig = config.customConfig || {};

    this.baseUrl = customConfig.baseUrl || envConfig.baseUrl;
    this.timeout = customConfig.timeout || envConfig.timeout;
    this.maxRetries = config.retryConfig?.maxRetries ?? envConfig.maxRetries;
    this.retryDelay = config.retryConfig?.retryDelay || envConfig.retryDelay;
    this.retryableStatusCodes = config.retryConfig?.retryableStatusCodes || [
      408, 429, 500, 502, 503, 504,
    ];
    this.retryableMethods = config.retryConfig?.retryableMethods
      ? [...config.retryConfig.retryableMethods]
      : [...DEFAULT_RETRYABLE_METHODS];
  }

  private validateConfig(config: AfriexConfig): void {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      throw new Error("API key is required and must be a string");
    }

    if (config.apiKey.trim().length === 0) {
      throw new Error("API key cannot be empty");
    }

    if (
      config.signRequest !== undefined &&
      typeof config.signRequest !== "function"
    ) {
      throw new Error("signRequest must be a function");
    }
  }
}

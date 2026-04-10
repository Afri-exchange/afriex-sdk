import ky, { type KyInstance, isHTTPError, isNetworkError } from "ky";
import { Config } from "../config/Config";
import { Logger } from "../utils/logger";
import {
  AfriexError,
  ApiError,
  NetworkError,
  RateLimitError,
  ApiErrorResponse,
} from "../errors";

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

export class HttpClient {
  private kyInstance: KyInstance;
  private logger: Logger;

  constructor(config: Config) {
    this.logger = new Logger(config.logLevel, config.enableLogging);

    this.kyInstance = ky.create({
      prefix: config.baseUrl,
      timeout: config.timeout,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "User-Agent": "Afriex-TypeScript-SDK/1.0.0",
      },
      retry: {
        limit: config.maxRetries,
        statusCodes: config.retryableStatusCodes,
        delay: (attemptCount) =>
          config.retryDelay * Math.pow(2, attemptCount - 1),
      },
      hooks: {
        beforeRequest: [
          ({ request }) => {
            this.logger.debug("Request:", {
              method: request.method,
              url: request.url,
            });
          },
        ],
        beforeRetry: [
          ({ request, retryCount }) => {
            this.logger.info(
              `Retrying request (${retryCount}/${config.maxRetries}): ${request.url}`
            );
          },
        ],
        afterResponse: [
          ({ response, request }) => {
            this.logger.debug("Response:", {
              status: response.status,
              url: request.url,
            });
          },
        ],
        beforeError: [
          async ({ error }) => {
            // We handle errors in the catch blocks of each method,
            // so just log here and let them propagate
            this.logger.error("Request Error:", error.message);
            return error;
          },
        ],
      },
    });
  }

  private async handleError(error: unknown): Promise<never> {
    if (isHTTPError(error)) {
      const status = error.response.status;
      let data: ApiErrorResponse = {};

      try {
        data = (await error.response.clone().json()) as ApiErrorResponse;
      } catch {
        // Response body is not JSON; use empty object
      }

      this.logger.error("API Error:", {
        status,
        data,
        url: error.request.url,
      });

      if (status === 429) {
        throw new RateLimitError(
          data,
          error.response.headers.get("retry-after") ?? undefined
        );
      }

      throw new ApiError(data, status);
    }

    if (isNetworkError(error)) {
      this.logger.error("Network Error:", error.message);
      throw new NetworkError("No response received from server", error);
    }

    if (error instanceof Error) {
      this.logger.error("Unknown Error:", error.message);
      throw new AfriexError(error.message);
    }

    throw new AfriexError("An unknown error occurred");
  }

  private buildOptions(options?: RequestOptions, json?: unknown) {
    const kyOptions: Record<string, unknown> = {};

    if (options?.headers) {
      kyOptions.headers = options.headers;
    }
    if (options?.params) {
      kyOptions.searchParams = options.params;
    }
    if (options?.timeout) {
      kyOptions.timeout = options.timeout;
    }
    if (json !== undefined) {
      kyOptions.json = json;
    }

    return kyOptions;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    try {
      return await this.kyInstance
        .get(path, this.buildOptions(options))
        .json<T>();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    try {
      return await this.kyInstance
        .post(path, this.buildOptions(options, data))
        .json<T>();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    try {
      return await this.kyInstance
        .put(path, this.buildOptions(options, data))
        .json<T>();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async patch<T>(
    path: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    try {
      return await this.kyInstance
        .patch(path, this.buildOptions(options, data))
        .json<T>();
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    try {
      return await this.kyInstance
        .delete(path, this.buildOptions(options))
        .json<T>();
    } catch (error) {
      return this.handleError(error);
    }
  }
}

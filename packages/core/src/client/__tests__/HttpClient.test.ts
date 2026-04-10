import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import ky, { isHTTPError, isNetworkError } from "ky";
import { HttpClient } from "../HttpClient.js";
import { Config } from "../../config/Config.js";
import { Environment } from "../../config/Environment.js";
import {
  AfriexError,
  ApiError,
  NetworkError,
  RateLimitError,
} from "../../errors/index.js";

vi.mock("ky", () => ({
  default: {
    create: vi.fn(),
  },
  isHTTPError: vi.fn(() => false),
  isNetworkError: vi.fn(() => false),
}));

describe("HttpClient", () => {
  let config: Config;
  let httpClient: HttpClient;
  let mockJson: Mock;
  let mockInstance: Record<string, Mock>;

  beforeEach(() => {
    vi.clearAllMocks();

    config = new Config({
      apiKey: "test-api-key",
      environment: Environment.STAGING,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 10,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      },
    });

    mockJson = vi.fn();
    mockInstance = {
      get: vi.fn(() => ({ json: mockJson })),
      post: vi.fn(() => ({ json: mockJson })),
      put: vi.fn(() => ({ json: mockJson })),
      patch: vi.fn(() => ({ json: mockJson })),
      delete: vi.fn(() => ({ json: mockJson })),
    };

    vi.mocked(ky.create).mockReturnValue(mockInstance as any);
    httpClient = new HttpClient(config);
  });

  describe("get", () => {
    it("should make a GET request", async () => {
      const mockResponse = { id: "123" };
      mockJson.mockResolvedValue(mockResponse);

      const result = await httpClient.get("/test");

      expect(mockInstance.get).toHaveBeenCalledWith("/test", {});
      expect(result).toEqual(mockResponse);
    });

    it("should pass query params as searchParams", async () => {
      mockJson.mockResolvedValue({});

      await httpClient.get("/test", { params: { page: 1 } });

      expect(mockInstance.get).toHaveBeenCalledWith("/test", {
        searchParams: { page: 1 },
      });
    });

    it("should pass custom headers", async () => {
      mockJson.mockResolvedValue({});

      await httpClient.get("/test", {
        headers: { "X-Custom": "value" },
      });

      expect(mockInstance.get).toHaveBeenCalledWith("/test", {
        headers: { "X-Custom": "value" },
      });
    });
  });

  describe("post", () => {
    it("should make a POST request with JSON body", async () => {
      const mockResponse = { created: true };
      mockJson.mockResolvedValue(mockResponse);

      const result = await httpClient.post("/test", { name: "test" });

      expect(mockInstance.post).toHaveBeenCalledWith("/test", {
        json: { name: "test" },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("put", () => {
    it("should make a PUT request", async () => {
      mockJson.mockResolvedValue({ updated: true });

      await httpClient.put("/test", { name: "updated" });

      expect(mockInstance.put).toHaveBeenCalledWith("/test", {
        json: { name: "updated" },
      });
    });
  });

  describe("patch", () => {
    it("should make a PATCH request", async () => {
      mockJson.mockResolvedValue({ patched: true });

      await httpClient.patch("/test", { name: "patched" });

      expect(mockInstance.patch).toHaveBeenCalledWith("/test", {
        json: { name: "patched" },
      });
    });
  });

  describe("delete", () => {
    it("should make a DELETE request", async () => {
      mockJson.mockResolvedValue(undefined);

      await httpClient.delete("/test");

      expect(mockInstance.delete).toHaveBeenCalledWith("/test", {});
    });
  });

  describe("Error Handling", () => {
    it("should throw ApiError on HTTP error", async () => {
      const httpError = {
        response: {
          status: 400,
          clone: () => ({
            json: () => Promise.resolve({ message: "Bad Request" }),
          }),
          headers: new Headers(),
        },
        request: { url: "/test" },
        message: "Bad Request",
      };

      mockJson.mockRejectedValueOnce(httpError);
      vi.mocked(isHTTPError).mockReturnValueOnce(true);

      await expect(httpClient.get("/test")).rejects.toThrow(ApiError);
    });

    it("should throw RateLimitError on 429", async () => {
      const httpError = {
        response: {
          status: 429,
          clone: () => ({
            json: () => Promise.resolve({ message: "Too Many Requests" }),
          }),
          headers: new Headers({ "retry-after": "60" }),
        },
        request: { url: "/test" },
        message: "Rate Limited",
      };

      mockJson.mockRejectedValueOnce(httpError);
      vi.mocked(isHTTPError).mockReturnValueOnce(true);

      await expect(httpClient.get("/test")).rejects.toThrow(RateLimitError);
    });

    it("should throw NetworkError on network failure", async () => {
      const error = new Error("Network failure");

      mockJson.mockRejectedValueOnce(error);
      vi.mocked(isNetworkError).mockReturnValueOnce(true);

      await expect(httpClient.get("/test")).rejects.toThrow(NetworkError);
    });

    it("should throw AfriexError on unknown error", async () => {
      const error = new Error("Something broke");

      mockJson.mockRejectedValueOnce(error);

      await expect(httpClient.get("/test")).rejects.toThrow(AfriexError);
    });
  });

  describe("Configuration", () => {
    it("should create ky instance with correct options", () => {
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: config.baseUrl,
          timeout: config.timeout,
          headers: expect.objectContaining({
            "x-api-key": "test-api-key",
          }),
          retry: expect.objectContaining({
            limit: config.maxRetries,
          }),
        })
      );
    });
  });
});

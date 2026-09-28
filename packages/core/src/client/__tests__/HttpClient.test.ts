import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import ky, { isHTTPError, isNetworkError } from "ky";
import { HttpClient } from "../HttpClient.js";
import { Config } from "../../config/Config.js";
import { Environment } from "../../config/Environment.js";
import { SDK_VERSION } from "../../version.js";
import packageJson from "../../../package.json";
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
      // ky 2.x consumes the response body up front and exposes the parsed
      // payload on `error.data`; the body itself is no longer readable.
      const httpError = {
        response: { status: 400, headers: new Headers() },
        data: { message: "Bad Request" },
        request: { url: "/test" },
        message: "Bad Request",
      };

      mockJson.mockRejectedValueOnce(httpError);
      vi.mocked(isHTTPError).mockReturnValueOnce(true);

      await expect(httpClient.get("/test")).rejects.toThrow(ApiError);
    });

    it("should extract code and friendly message from a real API error body", async () => {
      const httpError = {
        response: { status: 400, headers: new Headers() },
        data: {
          code: "INVALID_BUSINESS_CUSTOMER_REQUEST",
          error: "Invalid business customer request",
          details: {
            errorMessage: "Invalid business customer request",
            friendlyMessage: "No customer phone provided",
          },
        },
        request: { url: "/test" },
        message: "Bad Request",
      };

      mockJson.mockRejectedValueOnce(httpError);
      vi.mocked(isHTTPError).mockReturnValueOnce(true);

      try {
        await httpClient.get("/test");
        expect.fail("expected httpClient.get to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.message).toBe("No customer phone provided");
        expect(apiError.errorCode).toBe("INVALID_BUSINESS_CUSTOMER_REQUEST");
        expect(apiError.statusCode).toBe(400);
      }
    });

    it("should fall back to a generic ApiError when the body is not JSON", async () => {
      // ky sets `data` to a plain string for non-JSON bodies, and leaves it
      // undefined when parsing fails outright. Neither should be treated as an
      // error payload.
      for (const data of ["<html>Gateway Timeout</html>", undefined]) {
        const httpError = {
          response: { status: 504, headers: new Headers() },
          data,
          request: { url: "/test" },
          message: "Gateway Timeout",
        };

        mockJson.mockRejectedValueOnce(httpError);
        vi.mocked(isHTTPError).mockReturnValueOnce(true);

        try {
          await httpClient.get("/test");
          expect.fail("expected httpClient.get to throw");
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError);
          const apiError = error as ApiError;
          expect(apiError.statusCode).toBe(504);
          expect(apiError.errorCode).toBeUndefined();
          expect(apiError.message).toBe("An API error occurred");
        }
      }
    });

    it("should throw RateLimitError on 429", async () => {
      const httpError = {
        response: { status: 429, headers: new Headers({ "retry-after": "60" }) },
        data: { message: "Too Many Requests" },
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

    it("should send the API version and the SDK version", () => {
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-version": "2026-05-18",
            "User-Agent": `Afriex-TypeScript-SDK/${SDK_VERSION}`,
          }),
        })
      );
    });

    it("should send the API version it is configured with", () => {
      new HttpClient(
        new Config({ apiKey: "test-api-key", apiVersion: "2027-01-01" })
      );

      expect(ky.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ "x-api-version": "2027-01-01" }),
        })
      );
    });

    it("should report the version in package.json", () => {
      expect(SDK_VERSION).toBe(packageJson.version);
    });

    it("should not retry POST or PATCH by default", () => {
      const { retry } = vi.mocked(ky.create).mock.calls[0][0] as {
        retry: { methods: string[] };
      };

      expect(retry.methods).toEqual([
        "get",
        "put",
        "head",
        "delete",
        "options",
        "trace",
      ]);
    });

    it("should retry the methods it is configured with", () => {
      new HttpClient(
        new Config({
          apiKey: "test-api-key",
          retryConfig: {
            maxRetries: 2,
            retryDelay: 10,
            retryableStatusCodes: [503],
            retryableMethods: ["GET", "POST"],
          },
        })
      );

      expect(ky.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          retry: expect.objectContaining({ methods: ["get", "post"] }),
        })
      );
    });
  });

  describe("Request signing", () => {
    type BeforeRequestHook = (state: { request: Request }) => unknown;

    function signingHook(signRequest?: Config["signRequest"]) {
      new HttpClient(new Config({ apiKey: "test-api-key", signRequest }));
      const { hooks } = vi.mocked(ky.create).mock.lastCall![0] as {
        hooks: { beforeRequest: BeforeRequestHook[] };
      };
      return hooks.beforeRequest[0];
    }

    it("should sign the method, URL and body, and send the signature", async () => {
      const signRequest = vi.fn().mockResolvedValue("signed-value");
      const request = new Request(
        "https://sandbox.api.afriex.com/api/v1/transaction?page=0",
        { method: "POST", body: JSON.stringify({ amount: "100" }) }
      );

      await signingHook(signRequest)({ request });

      expect(signRequest).toHaveBeenCalledWith({
        method: "POST",
        url: "https://sandbox.api.afriex.com/api/v1/transaction?page=0",
        body: '{"amount":"100"}',
      });
      expect(request.headers.get("x-api-signature")).toBe("signed-value");
    });

    it("should leave the body readable after signing", async () => {
      const request = new Request("https://sandbox.api.afriex.com/api/v1/x", {
        method: "POST",
        body: JSON.stringify({ amount: "100" }),
      });

      await signingHook(() => "signed-value")({ request });

      await expect(request.text()).resolves.toBe('{"amount":"100"}');
    });

    it("should sign an empty string for a request without a body", async () => {
      const signRequest = vi.fn().mockReturnValue("signed-value");
      const request = new Request("https://sandbox.api.afriex.com/api/v1/x");

      await signingHook(signRequest)({ request });

      expect(signRequest).toHaveBeenCalledWith({
        method: "GET",
        url: "https://sandbox.api.afriex.com/api/v1/x",
        body: "",
      });
    });

    it("should send no signature when the signer returns none", async () => {
      const request = new Request("https://sandbox.api.afriex.com/api/v1/x");

      await signingHook(() => undefined)({ request });

      expect(request.headers.has("x-api-signature")).toBe(false);
    });

    it("should send no signature when no signer is configured", async () => {
      const request = new Request("https://sandbox.api.afriex.com/api/v1/x");

      await signingHook()({ request });

      expect(request.headers.has("x-api-signature")).toBe(false);
    });
  });
});

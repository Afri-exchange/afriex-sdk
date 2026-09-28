import { describe, it, expect } from "vitest";
import {
  Config,
  DEFAULT_API_VERSION,
  DEFAULT_RETRYABLE_METHODS,
  DEFAULT_USER_AGENT,
} from "../Config.js";
import { Environment } from "../Environment.js";

describe("Config", () => {
  it("should initialize with valid config", () => {
    const config = new Config({
      apiKey: "test-api-key",
      environment: Environment.STAGING,
    });

    expect(config.apiKey).toBe("test-api-key");
    expect(config.environment).toBe(Environment.STAGING);
  });

  it("should throw error if apiKey is missing", () => {
    expect(() => new Config({} as any)).toThrow("API key is required");
  });

  it("should throw error if apiKey is empty", () => {
    expect(() => new Config({ apiKey: "" } as any)).toThrow(
      "API key is required"
    );
  });

  it("should use default values if not provided", () => {
    const config = new Config({
      apiKey: "test-api-key",
    });

    expect(config.environment).toBe(Environment.PRODUCTION);
    expect(config.maxRetries).toBe(0); // Disabled by default
  });

  it("should allow overriding default values", () => {
    const config = new Config({
      apiKey: "test-api-key",
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

  describe("apiVersion", () => {
    it("should default to the version the SDK was written for", () => {
      const config = new Config({ apiKey: "test-api-key" });

      expect(config.apiVersion).toBe(DEFAULT_API_VERSION);
      expect(DEFAULT_API_VERSION).toBe("2026-05-18");
    });

    it("should allow the version to be overridden", () => {
      const config = new Config({
        apiKey: "test-api-key",
        apiVersion: "2027-01-01",
      });

      expect(config.apiVersion).toBe("2027-01-01");
    });
  });

  describe("userAgent", () => {
    it("should default to the SDK's name, without a version", () => {
      const config = new Config({ apiKey: "test-api-key" });

      expect(config.userAgent).toBe(DEFAULT_USER_AGENT);
      expect(DEFAULT_USER_AGENT).toBe("Afriex-TypeScript-SDK");
    });

    it("should allow the user agent to be overridden", () => {
      const config = new Config({
        apiKey: "test-api-key",
        userAgent: "my-app/1.2.3",
      });

      expect(config.userAgent).toBe("my-app/1.2.3");
    });
  });

  describe("retryableMethods", () => {
    it("should leave POST and PATCH out by default", () => {
      const config = new Config({ apiKey: "test-api-key" });

      expect(config.retryableMethods).toEqual([...DEFAULT_RETRYABLE_METHODS]);
      expect(config.retryableMethods).not.toContain("POST");
      expect(config.retryableMethods).not.toContain("PATCH");
    });

    it("should keep the default methods when only the other retry options are set", () => {
      const config = new Config({
        apiKey: "test-api-key",
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          retryableStatusCodes: [503],
        },
      });

      expect(config.retryableMethods).toEqual([...DEFAULT_RETRYABLE_METHODS]);
    });

    it("should allow the methods to be overridden", () => {
      const config = new Config({
        apiKey: "test-api-key",
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          retryableStatusCodes: [503],
          retryableMethods: ["GET", "POST"],
        },
      });

      expect(config.retryableMethods).toEqual(["GET", "POST"]);
    });

    it("should not share the default list between instances", () => {
      const first = new Config({ apiKey: "test-api-key" });
      first.retryableMethods.push("POST");

      const second = new Config({ apiKey: "test-api-key" });

      expect(second.retryableMethods).not.toContain("POST");
    });
  });

  describe("signRequest", () => {
    it("should be undefined by default", () => {
      const config = new Config({ apiKey: "test-api-key" });

      expect(config.signRequest).toBeUndefined();
    });

    it("should keep the signer it is given", () => {
      const signRequest = () => "signature";
      const config = new Config({ apiKey: "test-api-key", signRequest });

      expect(config.signRequest).toBe(signRequest);
    });

    it("should throw when the signer is not a function", () => {
      expect(
        () =>
          new Config({
            apiKey: "test-api-key",
            signRequest: "signature" as never,
          })
      ).toThrow("signRequest must be a function");
    });
  });
});

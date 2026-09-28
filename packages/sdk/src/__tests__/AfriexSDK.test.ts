import { describe, it, expect } from "vitest";
import { AfriexSDK, SDK_VERSION } from "../index.js";
import packageJson from "../../package.json";

describe("AfriexSDK", () => {
  describe("SDK_VERSION", () => {
    it("should be the version in package.json", () => {
      expect(SDK_VERSION).toBe(packageJson.version);
    });
  });

  describe("user agent", () => {
    it("should carry the SDK's version", () => {
      const sdk = new AfriexSDK({ apiKey: "test-api-key" });

      expect(sdk.getConfig().userAgent).toBe(
        `Afriex-TypeScript-SDK/${packageJson.version}`
      );
    });

    it("should keep a user agent it is given", () => {
      const sdk = new AfriexSDK({
        apiKey: "test-api-key",
        userAgent: "my-app/1.2.3",
      });

      expect(sdk.getConfig().userAgent).toBe("my-app/1.2.3");
    });
  });

  describe("services", () => {
    it("should expose every service on the client", () => {
      const sdk = new AfriexSDK({ apiKey: "test-api-key" });

      expect(sdk.customers).toBeDefined();
      expect(sdk.transactions).toBeDefined();
      expect(sdk.paymentMethods).toBeDefined();
      expect(sdk.paymentBatches).toBeDefined();
      expect(sdk.balance).toBeDefined();
      expect(sdk.rates).toBeDefined();
      expect(sdk.checkout).toBeDefined();
      expect(sdk.media).toBeDefined();
      expect(sdk.smeRegistration).toBeDefined();
      expect(sdk.webhooks).toBeDefined();
    });

    it("should leave webhookVerifier unset without a public key", () => {
      expect(
        new AfriexSDK({ apiKey: "test-api-key" }).webhookVerifier
      ).toBeUndefined();
    });
  });
});

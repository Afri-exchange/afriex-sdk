import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as crypto from "crypto";
import { WebhookService } from "../WebhookService.js";
import { HttpClient } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as unknown as HttpClient;

describe("WebhookService", () => {
  let webhookService: WebhookService;
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    webhookService = new WebhookService(mockHttpClient);
  });

  describe("verification", () => {
    it("should verify a valid signature", () => {
      const service = new WebhookService(undefined, publicKey);
      const payload = JSON.stringify({ event: "CUSTOMER.CREATED", data: {} });
      const signer = crypto.createSign("SHA256");
      signer.update(payload);
      const signature = signer.sign(privateKey, "base64");

      expect(service.verify(payload, signature)).toBe(true);
    });

    it("should return false when public key is not configured", () => {
      expect(webhookService.verify("payload", "signature")).toBe(false);
    });

    it("should verify and parse a valid payload", () => {
      const service = new WebhookService(undefined, publicKey);
      const webhookPayload = {
        event: "CUSTOMER.CREATED",
        data: { customerId: "cust-123", name: "John Doe" },
      };
      const payload = JSON.stringify(webhookPayload);
      const signer = crypto.createSign("SHA256");
      signer.update(payload);
      const signature = signer.sign(privateKey, "base64");

      expect(service.verifyAndParse(payload, signature)).toEqual(
        webhookPayload
      );
    });

    it("should throw when verifyAndParse is used without a public key", () => {
      expect(() => webhookService.verifyAndParse("{}", "signature")).toThrow(
        "Public key is required for webhook verification"
      );
    });
  });

  describe("triggerTestWebhook", () => {
    it("should trigger a test webhook using entityId", async () => {
      const mockResponse = {
        success: true,
        message: "Webhook triggered successfully",
      };

      (mockHttpClient.post as Mock).mockResolvedValue(mockResponse);

      const result = await webhookService.triggerTestWebhook({
        event: "CUSTOMER.CREATED",
        entityId: "cust_123",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
        event: "CUSTOMER.CREATED",
        entityId: "cust_123",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should send the deprecated resourceId on the wire as entityId, with a deprecation warning", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      (mockHttpClient.post as Mock).mockResolvedValue({ success: true });

      await webhookService.triggerTestWebhook({
        event: "CUSTOMER.CREATED",
        resourceId: "cust_123",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
        event: "CUSTOMER.CREATED",
        entityId: "cust_123",
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("`resourceId` is deprecated")
      );

      warnSpy.mockRestore();
    });

    it("should prefer entityId over resourceId when both are provided, without warning", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      (mockHttpClient.post as Mock).mockResolvedValue({ success: true });

      await webhookService.triggerTestWebhook({
        event: "CUSTOMER.CREATED",
        entityId: "cust_new",
        resourceId: "cust_old",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
        event: "CUSTOMER.CREATED",
        entityId: "cust_new",
      });
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should throw validation error when event is missing", async () => {
      const invalidRequest = {
        event: "",
        entityId: "cust_123",
      };

      await expect(
        webhookService.triggerTestWebhook(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when neither entityId nor resourceId is provided", async () => {
      await expect(
        webhookService.triggerTestWebhook({
          event: "CUSTOMER.CREATED",
        })
      ).rejects.toThrow("Validation failed");
    });

    it("should throw when no http client is configured", async () => {
      const service = new WebhookService(undefined, publicKey);

      await expect(
        service.triggerTestWebhook({
          event: "CUSTOMER.CREATED",
          entityId: "cust_123",
        })
      ).rejects.toThrow("HTTP client is required to trigger test webhooks");
    });

    it("should support all customer event types", async () => {
      const events = [
        "CUSTOMER.CREATED",
        "CUSTOMER.UPDATED",
        "CUSTOMER.DELETED",
      ] as const;

      for (const event of events) {
        (mockHttpClient.post as Mock).mockResolvedValue({
          success: true,
        });

        await webhookService.triggerTestWebhook({
          event,
          entityId: "cust_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          entityId: "cust_123",
        });
      }
    });

    it("should support all payment method event types", async () => {
      const events = [
        "PAYMENT_METHOD.CREATED",
        "PAYMENT_METHOD.UPDATED",
        "PAYMENT_METHOD.DELETED",
      ] as const;

      for (const event of events) {
        (mockHttpClient.post as Mock).mockResolvedValue({
          success: true,
        });

        await webhookService.triggerTestWebhook({
          event,
          entityId: "pm_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          entityId: "pm_123",
        });
      }
    });

    it("should support all transaction event types", async () => {
      const events = ["TRANSACTION.CREATED", "TRANSACTION.UPDATED"] as const;

      for (const event of events) {
        (mockHttpClient.post as Mock).mockResolvedValue({
          success: true,
        });

        await webhookService.triggerTestWebhook({
          event,
          entityId: "txn_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          entityId: "txn_123",
        });
      }
    });

    it("should support checkout session webhook events", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        success: true,
      });

      await webhookService.triggerTestWebhook({
        event: "CHECKOUT_SESSION.CREATED",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
        event: "CHECKOUT_SESSION.CREATED",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
      });
    });
  });
});

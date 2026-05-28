import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
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

  beforeEach(() => {
    vi.clearAllMocks();
    webhookService = new WebhookService(mockHttpClient);
  });

  describe("triggerTestWebhook", () => {
    it("should trigger a test webhook successfully", async () => {
      const request = {
        event: "CUSTOMER.CREATED" as const,
        resourceId: "cust_123",
      };

      const mockResponse = {
        success: true,
        message: "Webhook triggered successfully",
      };

      (mockHttpClient.post as Mock).mockResolvedValue(mockResponse);

      const result = await webhookService.triggerTestWebhook(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/webhooks/trigger",
        request
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw validation error when event is missing", async () => {
      const invalidRequest = {
        event: "",
        resourceId: "cust_123",
      };

      await expect(
        webhookService.triggerTestWebhook(invalidRequest as any)
      ).rejects.toThrow("Validation failed");
    });

    it("should throw validation error when resourceId is missing", async () => {
      const invalidRequest = {
        event: "CUSTOMER.CREATED" as const,
        resourceId: "",
      };

      await expect(
        webhookService.triggerTestWebhook(invalidRequest)
      ).rejects.toThrow("Validation failed");
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
          resourceId: "cust_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          resourceId: "cust_123",
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
          resourceId: "pm_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          resourceId: "pm_123",
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
          resourceId: "txn_123",
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith("/webhooks/trigger", {
          event,
          resourceId: "txn_123",
        });
      }
    });
  });
});

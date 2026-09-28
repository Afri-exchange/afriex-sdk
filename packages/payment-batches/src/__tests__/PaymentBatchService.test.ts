import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PaymentBatchService } from "../PaymentBatchService.js";
import { HttpClient, ValidationError } from "@afriex/core";
import type { PaymentBatchRecipientRequest } from "../types.js";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as unknown as HttpClient;

const batchRequest = {
  name: "June payroll",
  sourcePaymentMethod: { channel: "WALLET" as const, currencyCode: "USD" },
};

const mockBatch = { id: "batch-123", ...batchRequest };

const recipient: PaymentBatchRecipientRequest = {
  channel: "BANK_ACCOUNT",
  accountName: "Ada Obi",
  accountNumber: "0123456789",
  countryCode: "NG",
  institution: { institutionCode: "000013", institutionName: "GTBank" },
  amount: { value: "20000", currencyCode: "NGN" },
};

describe("PaymentBatchService", () => {
  let paymentBatchService: PaymentBatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentBatchService = new PaymentBatchService(mockHttpClient);
  });

  describe("list", () => {
    it("should list batches with pagination", async () => {
      const mockResponse = {
        data: [{ id: "batch-123", name: "June payroll", meta: { memberCount: 2 } }],
        page: 0,
        total: 1,
      };
      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentBatchService.list({ page: 0, limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/payment-batch", {
        params: { page: 0, limit: 10 },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should list batches without params", async () => {
      (mockHttpClient.get as Mock).mockResolvedValue({
        data: [],
        page: 0,
        total: 0,
      });

      await paymentBatchService.list();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/payment-batch", {
        params: undefined,
      });
    });
  });

  describe("create", () => {
    it("should create a batch", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: mockBatch });

      const result = await paymentBatchService.create(batchRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-batch",
        batchRequest
      );
      expect(result).toEqual(mockBatch);
    });

    it("should allow the funding channel to be omitted", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: mockBatch });

      await paymentBatchService.create({
        name: "June payroll",
        sourcePaymentMethod: { currencyCode: "USD" },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/payment-batch", {
        name: "June payroll",
        sourcePaymentMethod: { currencyCode: "USD" },
      });
    });

    it("should throw ValidationError when the name is missing", async () => {
      await expect(
        paymentBatchService.create({ ...batchRequest, name: "" })
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when the funding currency is missing", async () => {
      await expect(
        paymentBatchService.create({
          name: "June payroll",
          sourcePaymentMethod: { currencyCode: "" },
        })
      ).rejects.toMatchObject({
        fields: [
          expect.objectContaining({ field: "sourcePaymentMethod.currencyCode" }),
        ],
      });
    });
  });

  describe("get", () => {
    it("should get a batch by id", async () => {
      (mockHttpClient.get as Mock).mockResolvedValue({ data: mockBatch });

      const result = await paymentBatchService.get("batch-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-batch/batch-123"
      );
      expect(result).toEqual(mockBatch);
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(paymentBatchService.get("")).rejects.toThrow(
        "Batch ID is required"
      );
    });
  });

  describe("update", () => {
    it("should replace the batch", async () => {
      const renamed = { ...batchRequest, name: "July payroll" };
      (mockHttpClient.patch as Mock).mockResolvedValue({
        data: { id: "batch-123", ...renamed },
      });

      const result = await paymentBatchService.update("batch-123", renamed);

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        "/payment-batch/batch-123",
        renamed
      );
      expect(result.name).toBe("July payroll");
    });

    it("should throw ValidationError when the funding method is left out", async () => {
      await expect(
        paymentBatchService.update("batch-123", {
          name: "July payroll",
        } as typeof batchRequest)
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.patch).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(
        paymentBatchService.update("", batchRequest)
      ).rejects.toThrow("Batch ID is required");
    });
  });

  describe("delete", () => {
    it("should delete a batch", async () => {
      (mockHttpClient.delete as Mock).mockResolvedValue({
        data: { success: true },
      });

      await expect(
        paymentBatchService.delete("batch-123")
      ).resolves.toBeUndefined();

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/payment-batch/batch-123"
      );
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(paymentBatchService.delete("")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("listRecipients", () => {
    it("should list the recipients of a batch", async () => {
      const mockResponse = {
        data: [
          {
            paymentMethodId: "pm-123",
            recipientId: "rcp-123",
            ...recipient,
          },
        ],
        page: 0,
        total: 1,
      };
      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentBatchService.listRecipients("batch-123", {
        page: 0,
        limit: 50,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-batch/batch-123/recipients",
        { params: { page: 0, limit: 50 } }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(paymentBatchService.listRecipients("")).rejects.toThrow(
        "Batch ID is required"
      );
    });
  });

  describe("addRecipient", () => {
    it("should add a recipient", async () => {
      const saved = { id: "pm-123", channel: "BANK_ACCOUNT", countryCode: "NG" };
      (mockHttpClient.post as Mock).mockResolvedValue({ data: saved });

      const result = await paymentBatchService.addRecipient(
        "batch-123",
        recipient
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-batch/batch-123/recipients",
        recipient
      );
      expect(result).toEqual(saved);
    });

    it("should accept a numeric amount", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: {} });

      await expect(
        paymentBatchService.addRecipient("batch-123", {
          ...recipient,
          amount: { value: 20000, currencyCode: "NGN" },
        })
      ).resolves.toBeDefined();
    });

    it.each(["UPI", "INTERAC"])(
      "should not require an institution for %s",
      async (channel) => {
        (mockHttpClient.post as Mock).mockResolvedValue({ data: {} });
        const { institution: _institution, ...withoutInstitution } = recipient;

        await paymentBatchService.addRecipient("batch-123", {
          ...withoutInstitution,
          channel,
        });

        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      }
    );

    it("should throw ValidationError when a bank recipient has no institution", async () => {
      const { institution: _institution, ...withoutInstitution } = recipient;

      await expect(
        paymentBatchService.addRecipient("batch-123", withoutInstitution)
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it.each(["channel", "accountName", "accountNumber", "countryCode"])(
      "should throw ValidationError when %s is missing",
      async (field) => {
        await expect(
          paymentBatchService.addRecipient("batch-123", {
            ...recipient,
            [field]: "",
          })
        ).rejects.toThrow(ValidationError);
      }
    );

    it("should throw ValidationError when the amount is missing", async () => {
      await expect(
        paymentBatchService.addRecipient("batch-123", {
          ...recipient,
          amount: undefined as unknown as PaymentBatchRecipientRequest["amount"],
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when the amount has no currency", async () => {
      await expect(
        paymentBatchService.addRecipient("batch-123", {
          ...recipient,
          amount: { value: "20000", currencyCode: "" },
        })
      ).rejects.toMatchObject({
        fields: [expect.objectContaining({ field: "amount.currencyCode" })],
      });
    });
  });

  describe("addRecipients", () => {
    it("should add recipients in bulk", async () => {
      const outcomes = {
        successes: { "0123456789": "Recipient added successfully" },
        errors: { "0000000000": "INVALID_BUSINESS_PAYMENT_METHOD_REQUEST" },
      };
      (mockHttpClient.post as Mock).mockResolvedValue({ data: outcomes });
      const recipients = [
        recipient,
        { ...recipient, accountNumber: "0000000000" },
      ];

      const result = await paymentBatchService.addRecipients(
        "batch-123",
        recipients
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-batch/batch-123/recipients/bulk",
        recipients
      );
      expect(result).toEqual(outcomes);
    });

    it("should throw ValidationError for an empty list", async () => {
      await expect(
        paymentBatchService.addRecipients("batch-123", [])
      ).rejects.toThrow("At least one recipient is required");
    });

    it("should name the recipient that is invalid", async () => {
      const recipients = [recipient, { ...recipient, accountNumber: "" }];

      await expect(
        paymentBatchService.addRecipients("batch-123", recipients)
      ).rejects.toMatchObject({
        fields: [expect.objectContaining({ field: "recipients[1].accountNumber" })],
      });
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe("updateRecipient", () => {
    it("should replace a recipient", async () => {
      const saved = { id: "pm-123", channel: "BANK_ACCOUNT", countryCode: "NG" };
      (mockHttpClient.patch as Mock).mockResolvedValue({ data: saved });
      const request = {
        ...recipient,
        amount: { value: "21000", currencyCode: "NGN" },
        paymentMethodId: "pm-123",
      };

      const result = await paymentBatchService.updateRecipient(
        "batch-123",
        "rcp-123",
        request
      );

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        "/payment-batch/batch-123/recipients/rcp-123",
        request
      );
      expect(result).toEqual(saved);
    });

    it("should throw ValidationError for an update that carries only the amount", async () => {
      await expect(
        paymentBatchService.updateRecipient("batch-123", "rcp-123", {
          amount: { value: "21000", currencyCode: "NGN" },
        } as PaymentBatchRecipientRequest)
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.patch).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when the recipient id is missing", async () => {
      await expect(
        paymentBatchService.updateRecipient("batch-123", "", recipient)
      ).rejects.toThrow("Recipient ID is required");
    });
  });

  describe("removeRecipient", () => {
    it("should remove a recipient", async () => {
      (mockHttpClient.delete as Mock).mockResolvedValue({
        data: { success: true },
      });

      await expect(
        paymentBatchService.removeRecipient("batch-123", "rcp-123")
      ).resolves.toBeUndefined();

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/payment-batch/batch-123/recipients/rcp-123"
      );
    });

    it("should throw ValidationError when the recipient id is missing", async () => {
      await expect(
        paymentBatchService.removeRecipient("batch-123", "")
      ).rejects.toThrow("Recipient ID is required");
    });
  });

  describe("withdraw", () => {
    const outcomes = {
      successes: { "rcp-123": "Withdrawal initiated" },
      errors: {},
    };

    it("should start a run without a body or query", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: outcomes });

      const result = await paymentBatchService.withdraw("batch-123");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-batch/batch-123/withdraw",
        undefined,
        undefined
      );
      expect(result).toEqual(outcomes);
    });

    it("should retry a run by its session id", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: outcomes });

      await paymentBatchService.withdraw("batch-123", {
        sessionId: "session-123",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-batch/batch-123/withdraw",
        undefined,
        { params: { sessionId: "session-123" } }
      );
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(paymentBatchService.withdraw("")).rejects.toThrow(
        "Batch ID is required"
      );
    });
  });

  describe("listSessions", () => {
    it("should list the runs of a batch", async () => {
      const mockResponse = {
        data: [
          {
            id: "session-123",
            batchId: "batch-123",
            createdAt: "2026-05-18T10:00:00.000Z",
            meta: {
              results: {
                "rcp-123": {
                  status: "PROCESSING_FAILED",
                  errorMessage: "USER_UNDER_REVIEW",
                },
              },
            },
          },
        ],
        page: 0,
        total: 1,
      };
      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentBatchService.listSessions("batch-123", {
        limit: 5,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-batch/batch-123/sessions",
        { params: { limit: 5 } }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw ValidationError when the batch id is missing", async () => {
      await expect(paymentBatchService.listSessions("")).rejects.toThrow(
        "Batch ID is required"
      );
    });
  });
});

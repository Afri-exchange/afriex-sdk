import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { TransactionService } from "../TransactionService.js";
import { HttpClient } from "@afriex/core";
import { ValidationError } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
} as unknown as HttpClient;

describe("TransactionService", () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    transactionService = new TransactionService(mockHttpClient);
  });

  describe("create", () => {
    it("should create a transaction successfully", async () => {
      const mockTransaction = {
        transactionId: "txn-123",
        customerId: "cust-123",
        status: "PENDING",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.create({
        customerId: "cust-123",
        sourceAmount: "100",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        destinationId: "pm-123",
        meta: {
          idempotencyKey: "test-key-123",
          reference: "test-ref-123",
        },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", {
        customerId: "cust-123",
        sourceAmount: "100",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        destinationId: "pm-123",
        meta: {
          idempotencyKey: "test-key-123",
          reference: "test-ref-123",
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it("should throw ValidationError when customerId is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should create a WITHDRAW with sourceAmount and no destinationAmount", async () => {
      const mockTransaction = {
        transactionId: "txn-source-only",
        customerId: "cust-123",
        status: "PENDING",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const request = {
        type: "WITHDRAW" as const,
        customerId: "cust-123",
        sourceAmount: "100" as const,
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        destinationId: "pm-123",
        meta: {
          idempotencyKey: "test-key-source-only",
          reference: "test-ref-source-only",
        },
      };

      const result = await transactionService.create(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", request);
      expect(result).toEqual(mockTransaction);
    });

    it("should throw ValidationError when both amounts are missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "" as unknown as `${number}`,
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
          meta: {
            idempotencyKey: "test-key-no-amounts",
            reference: "test-ref-no-amounts",
          },
        })
      ).rejects.toMatchObject({
        name: "ValidationError",
        fields: [
          {
            field: "sourceAmount",
            message: "Either sourceAmount or destinationAmount is required",
          },
        ],
      });
    });

    it("should create a SWAP transaction without customerId or destinationAmount", async () => {
      const mockTransaction = {
        transactionId: "txn-swap-123",
        status: "COMPLETED",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
        type: "SWAP",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.create({
        type: "SWAP",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationCurrency: "NGN",
        meta: {
          idempotencyKey: "swap-key-123",
          reference: "swap-ref-123",
        },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", {
        type: "SWAP",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationCurrency: "NGN",
        meta: {
          idempotencyKey: "swap-key-123",
          reference: "swap-ref-123",
        },
      });
      expect(result).toEqual(mockTransaction);
    });

    it("should create a WITHDRAW with destinationAmount and no sourceAmount", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: { transactionId: "txn-destination-only" },
      });

      await expect(
        transactionService.create({
          customerId: "cust-123",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
          meta: {
            idempotencyKey: "test-key-destination-only",
            reference: "test-ref-destination-only",
          },
        })
      ).resolves.toEqual({ transactionId: "txn-destination-only" });
    });

    it("should pass numeric amounts through unchanged", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: { transactionId: "txn-numeric" },
      });

      const request = {
        type: "WITHDRAW" as const,
        customerId: "cust-123",
        destinationAmount: 5000,
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        destinationId: "pm-123",
        meta: {
          idempotencyKey: "test-key-numeric",
          reference: "test-ref-numeric",
        },
      };

      await transactionService.create(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", request);
    });

    it("should throw ValidationError when a SWAP sends both amounts", async () => {
      // The API rejects this with "Only one of source amount or destination
      // amount can be provided".
      await expect(
        transactionService.create({
          type: "SWAP",
          sourceAmount: "10",
          destinationAmount: "16500",
          sourceCurrency: "USD",
          destinationCurrency: "NGN",
          meta: {
            idempotencyKey: "swap-key-both",
            reference: "swap-ref-both",
          },
        } as any)
      ).rejects.toMatchObject({
        name: "ValidationError",
        fields: [
          {
            field: "destinationAmount",
            message:
              "A SWAP takes exactly one of sourceAmount or destinationAmount",
          },
        ],
      });

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should create a SWAP from a destinationAmount", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: { transactionId: "txn-swap-destination", type: "SWAP" },
      });

      const request = {
        type: "SWAP" as const,
        destinationAmount: 16500,
        sourceCurrency: "USD",
        destinationCurrency: "NGN",
        meta: {
          idempotencyKey: "swap-key-destination",
          reference: "swap-ref-destination",
        },
      };

      await transactionService.create(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", request);
    });

    it("should throw ValidationError when destinationId is missing for WITHDRAW", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "",
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when sourceId is missing for DEPOSIT", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          type: "DEPOSIT",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          sourceId: "",
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when meta is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when meta.idempotencyKey is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
          meta: {
            idempotencyKey: "",
            reference: "ref-123",
          },
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when meta.reference is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
          meta: {
            idempotencyKey: "key-123",
            reference: "",
          },
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should send meta.settlement and the correspondent bank pair", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: { transactionId: "txn-settlement" },
      });

      const request = {
        customerId: "cust-123",
        sourceAmount: "100" as const,
        sourceCurrency: "NGN",
        destinationCurrency: "USD",
        destinationId: "pm-swift",
        correspondentBankName: "Citibank N.A. New York",
        correspondentBankAccountNumber: "10991234",
        meta: {
          idempotencyKey: "test-key-settlement",
          reference: "test-ref-settlement",
          settlement: "request" as const,
          invoice: "64f0c2a1e4b0a1b2c3d4e5f6/invoice.pdf",
        },
      };

      await transactionService.create(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", request);
    });

    it("should throw ValidationError when only one correspondent bank field is sent", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          sourceCurrency: "NGN",
          destinationCurrency: "USD",
          destinationId: "pm-swift",
          correspondentBankName: "Citibank N.A. New York",
          meta: {
            idempotencyKey: "test-key-correspondent",
            reference: "test-ref-correspondent",
          },
        })
      ).rejects.toMatchObject({
        name: "ValidationError",
        fields: [
          {
            field: "correspondentBankName",
            message:
              "correspondentBankName and correspondentBankAccountNumber must be provided together",
          },
        ],
      });

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when settlement request is used outside WITHDRAW", async () => {
      await expect(
        transactionService.create({
          type: "DEPOSIT",
          customerId: "cust-123",
          sourceAmount: "100",
          sourceCurrency: "KES",
          destinationCurrency: "USD",
          sourceId: "pm-456",
          meta: {
            idempotencyKey: "test-key-settlement-deposit",
            reference: "test-ref-settlement-deposit",
            settlement: "request",
          },
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should create a DEPOSIT transaction successfully", async () => {
      const mockTransaction = {
        transactionId: "txn-456",
        customerId: "cust-123",
        status: "PENDING",
        sourceAmount: "100",
        sourceCurrency: "USD",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.create({
        customerId: "cust-123",
        type: "DEPOSIT",
        sourceAmount: "100",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        sourceId: "pm-456",
        meta: {
          idempotencyKey: "test-key-456",
          reference: "test-ref-456",
        },
      });

      expect(result).toEqual(mockTransaction);
    });
  });

  describe("get", () => {
    it("should get a transaction by ID", async () => {
      const mockTransaction = {
        transactionId: "txn-123",
        status: "COMPLETED",
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.get("txn-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/transaction/txn-123");
      expect(result).toEqual(mockTransaction);
    });

    it("should throw ValidationError when ID is missing", async () => {
      await expect(transactionService.get("")).rejects.toThrow(ValidationError);
    });
  });

  describe("list", () => {
    it("should list transactions with pagination", async () => {
      const mockResponse = {
        data: [
          { transactionId: "txn-1", status: "COMPLETED" },
          { transactionId: "txn-2", status: "PENDING" },
        ],
        page: 1,
        total: 2,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await transactionService.list({ page: 1, limit: 20 });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/transaction", {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should serialize array filters as comma-separated query params", async () => {
      const mockResponse = {
        data: [],
        page: 0,
        total: 0,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      await transactionService.list({
        transactionId: "txn-123",
        reference: "order-123",
        status: ["PENDING", "PROCESSING"],
        type: ["DEPOSIT", "WITHDRAW"],
        channel: ["BANK_ACCOUNT", "MOBILE_MONEY"],
        currency: ["USD", "NGN"],
        fromDate: "2025-01-01T00:00:00.000Z",
        toDate: "2025-01-31T23:59:59.999Z",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/transaction", {
        params: {
          transactionId: "txn-123",
          reference: "order-123",
          status: "PENDING,PROCESSING",
          type: "DEPOSIT,WITHDRAW",
          channel: "BANK_ACCOUNT,MOBILE_MONEY",
          currency: "USD,NGN",
          fromDate: "2025-01-01T00:00:00.000Z",
          toDate: "2025-01-31T23:59:59.999Z",
        },
      });
    });
  });

  describe("authorize", () => {
    it("should authorize a transaction with an OTP", async () => {
      const mockTransaction = {
        transactionId: "txn-123",
        status: "PROCESSING",
        type: "DEPOSIT",
        sourceAmount: "10",
        sourceCurrency: "USD",
        destinationAmount: "14101.041",
        destinationCurrency: "NGN",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.authorize("txn-123", {
        type: "OTP",
        otp: "123456",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/transaction/txn-123/authorize",
        { type: "OTP", otp: "123456" }
      );
      expect(result).toEqual(mockTransaction);
    });

    it("should throw ValidationError when transactionId is missing", async () => {
      await expect(
        transactionService.authorize("", { type: "OTP", otp: "123456" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when otp is missing", async () => {
      await expect(
        transactionService.authorize("txn-123", {
          type: "OTP",
          otp: "",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("simulate", () => {
    it("should post the outcome and return the transaction", async () => {
      const mockTransaction = { transactionId: "txn-123", status: "PENDING" };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.simulate("txn-123", {
        outcome: "success",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/transaction/txn-123/simulate",
        { outcome: "success" }
      );
      expect(result).toEqual(mockTransaction);
    });

    it("should accept the failed outcome", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: {} });

      await transactionService.simulate("txn-123", { outcome: "failed" });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/transaction/txn-123/simulate",
        { outcome: "failed" }
      );
    });

    it("should throw ValidationError when transactionId is missing", async () => {
      await expect(
        transactionService.simulate("", { outcome: "success" })
      ).rejects.toThrow("Transaction ID is required");
    });

    it("should throw ValidationError for an outcome the API does not know", async () => {
      await expect(
        transactionService.simulate("txn-123", {
          outcome: "SUCCESS" as "success",
        })
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should throw ValidationError when the outcome is missing", async () => {
      await expect(
        transactionService.simulate("txn-123", {} as { outcome: "success" })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getAdvice", () => {
    it("should return the settlement advice", async () => {
      const mockAdvice = {
        url: "https://example.com/advice.pdf",
        reference: "ADV-0001",
        status: "PENDING",
        version: 1,
        generatedAt: "2026-05-18T10:00:00.000Z",
      };

      (mockHttpClient.get as Mock).mockResolvedValue({ data: mockAdvice });

      const result = await transactionService.getAdvice("txn-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/transaction/txn-123/advice"
      );
      expect(result).toEqual(mockAdvice);
    });

    it("should throw ValidationError when transactionId is missing", async () => {
      await expect(transactionService.getAdvice("")).rejects.toThrow(
        "Transaction ID is required"
      );
    });
  });

  describe("submitPoolAccountProof", () => {
    const proof = {
      amount: 5000,
      customerId: "cust-123",
      countryCode: "NG",
      reference: "AFX4821",
      fileKey: "business-id/proof.pdf",
      timestamp: "2026-05-18T10:00:00.000Z",
    };

    it("should submit the proof and return the transaction", async () => {
      const mockTransaction = { transactionId: "txn-123", status: "IN_REVIEW" };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await transactionService.submitPoolAccountProof({
        ...proof,
        senderDetails: { name: "John Doe", bankName: "GTBank" },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/transaction/pool-account",
        { ...proof, senderDetails: { name: "John Doe", bankName: "GTBank" } }
      );
      expect(result).toEqual(mockTransaction);
    });

    it("should send a Date timestamp as an ISO 8601 string", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: {} });

      await transactionService.submitPoolAccountProof({
        ...proof,
        timestamp: new Date("2026-05-18T10:00:00.000Z"),
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/transaction/pool-account",
        { ...proof, timestamp: "2026-05-18T10:00:00.000Z" }
      );
    });

    it.each(["customerId", "countryCode", "reference", "fileKey", "timestamp"])(
      "should throw ValidationError when %s is missing",
      async (field) => {
        await expect(
          transactionService.submitPoolAccountProof({ ...proof, [field]: "" })
        ).rejects.toThrow(ValidationError);
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      }
    );

    it("should throw ValidationError when the amount is not a number", async () => {
      await expect(
        transactionService.submitPoolAccountProof({
          ...proof,
          amount: "5000" as unknown as number,
        })
      ).rejects.toMatchObject({
        fields: [
          {
            field: "amount",
            message: "amount must be a number that is not negative",
          },
        ],
      });
    });

    it("should throw ValidationError when the amount is negative", async () => {
      await expect(
        transactionService.submitPoolAccountProof({ ...proof, amount: -1 })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when senderDetails has no name", async () => {
      await expect(
        transactionService.submitPoolAccountProof({
          ...proof,
          senderDetails: { name: "", bankName: "GTBank" },
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});

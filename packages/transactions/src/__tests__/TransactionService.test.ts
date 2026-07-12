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

    it("should throw ValidationError when destinationAmount is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "100",
          destinationAmount: "" as unknown as `${number}`,
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
        } as any)
      ).rejects.toThrow(ValidationError);
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

    it("should throw ValidationError when sourceAmount is missing", async () => {
      await expect(
        transactionService.create({
          customerId: "cust-123",
          sourceAmount: "" as unknown as `${number}`,
          destinationAmount: "1000",
          destinationCurrency: "NGN",
          sourceCurrency: "USD",
          destinationId: "pm-123",
        } as any)
      ).rejects.toThrow(ValidationError);
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
});

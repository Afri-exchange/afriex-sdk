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
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/transaction", {
        customerId: "cust-123",
        sourceAmount: "100",
        destinationAmount: "155000",
        destinationCurrency: "NGN",
        sourceCurrency: "USD",
        destinationId: "pm-123",
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
        })
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
        })
      ).rejects.toThrow(ValidationError);
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
        })
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
        })
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
  });
});

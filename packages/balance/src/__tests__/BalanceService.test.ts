import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { BalanceService } from "../BalanceService.js";
import { HttpClient } from "@afriex/core";
import { ValidationError } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
} as unknown as HttpClient;

describe("BalanceService", () => {
  let balanceService: BalanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    balanceService = new BalanceService(mockHttpClient);
  });

  describe("getBalance", () => {
    it("should get balances for comma-separated currencies", async () => {
      const mockBalances = { USD: 1000, NGN: 500000 };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockBalances,
      });

      const result = await balanceService.getBalance({ currencies: "USD,NGN" });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/balance", {
        params: { currencies: "USD,NGN" },
      });
      expect(result).toEqual(mockBalances);
    });

    it("should get balances for array of currencies", async () => {
      const mockBalances = { USD: 1000, GBP: 800 };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockBalances,
      });

      const result = await balanceService.getBalance({
        currencies: ["USD", "GBP"],
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/balance", {
        params: { currencies: "USD,GBP" },
      });
      expect(result).toEqual(mockBalances);
    });

    it("should throw ValidationError when currencies is missing", async () => {
      await expect(
        balanceService.getBalance({ currencies: "" })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getBalanceForCurrency", () => {
    it("should get balance for a single currency", async () => {
      const mockBalances = { USD: 1000 };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockBalances,
      });

      const result = await balanceService.getBalanceForCurrency("USD");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/balance", {
        params: { currencies: "USD" },
      });
      expect(result).toBe(1000);
    });

    it("should return 0 if currency not found", async () => {
      (mockHttpClient.get as Mock).mockResolvedValue({ data: {} });

      const result = await balanceService.getBalanceForCurrency("XYZ");

      expect(result).toBe(0);
    });

    it("should throw ValidationError when currency is empty", async () => {
      await expect(balanceService.getBalanceForCurrency("")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("topUpSandbox", () => {
    const mockTransaction = {
      status: "SUCCESS",
      type: "DEPOSIT",
      sourceAmount: "500",
      sourceCurrency: "USD",
      destinationAmount: "500",
      destinationCurrency: "USD",
      destinationId: "",
      customerId: "",
      transactionId: "69d6005dab82306f11b03360",
      meta: {},
      createdAt: "2026-04-08T07:14:37.568Z",
      updatedAt: "2026-04-08T07:14:37.568Z",
    };

    it("should top up sandbox balance and return the transaction", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockTransaction,
      });

      const result = await balanceService.topUpSandbox({
        amount: 500,
        currency: "USD",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/org/balance/topup", {
        amount: 500,
        currency: "USD",
      });
      expect(result).toEqual(mockTransaction);
    });

    it("should throw ValidationError when amount is zero", async () => {
      await expect(
        balanceService.topUpSandbox({ amount: 0, currency: "USD" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when amount is negative", async () => {
      await expect(
        balanceService.topUpSandbox({ amount: -100, currency: "USD" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when currency is missing", async () => {
      await expect(
        balanceService.topUpSandbox({ amount: 500, currency: "" })
      ).rejects.toThrow(ValidationError);
    });
  });
});

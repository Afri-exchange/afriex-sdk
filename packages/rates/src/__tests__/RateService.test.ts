import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { RateService } from "../RateService.js";
import { HttpClient } from "@afriex/core";
import { ValidationError } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
} as unknown as HttpClient;

describe("RateService", () => {
  let rateService: RateService;

  beforeEach(() => {
    vi.clearAllMocks();
    rateService = new RateService(mockHttpClient);
  });

  describe("getRates", () => {
    it("should get rates with string params", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00", GBP: "0.79" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRates({
        fromSymbols: "USD",
        toSymbols: "NGN,GBP",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/rates", {
        params: { fromSymbols: "USD", toSymbols: "NGN,GBP" },
      });
      expect(result).toEqual(mockRatesData);
    });

    it("should get rates with array params", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550" }, NGN: { USD: "0.00065" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRates({
        fromSymbols: ["USD", "NGN"],
        toSymbols: ["NGN", "USD"],
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/rates", {
        params: { fromSymbols: "USD,NGN", toSymbols: "NGN,USD" },
      });
      expect(result).toEqual(mockRatesData);
    });

    it("should allow fromSymbols to be omitted", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRates({
        toSymbols: "NGN",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/rates", {
        params: { fromSymbols: undefined, toSymbols: "NGN" },
      });
      expect(result).toEqual(mockRatesData);
    });

    it("should allow toSymbols to be omitted", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00", GBP: "0.79" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRates({
        fromSymbols: "USD",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/rates", {
        params: { fromSymbols: "USD", toSymbols: undefined },
      });
      expect(result).toEqual(mockRatesData);
    });

    it("should allow both filters to be omitted", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRates();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/org/rates", {
        params: { fromSymbols: undefined, toSymbols: undefined },
      });
      expect(result).toEqual(mockRatesData);
    });
  });

  describe("getRate", () => {
    it("should get rate between two currencies", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.getRate("USD", "NGN");

      expect(result).toBe("1550.00");
    });

    it("should throw when the pair is absent from the response", async () => {
      // Returning "0" here would have made an unavailable rate look like a
      // real rate of zero, silently zeroing out any conversion built on it.
      const mockRatesData = {
        rates: {},
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      await expect(rateService.getRate("XYZ", "ABC")).rejects.toThrow(
        "No exchange rate available for XYZ to ABC"
      );
    });

    it("should not convert at a zero rate when the pair is absent", async () => {
      (mockHttpClient.get as Mock).mockResolvedValue({
        data: { rates: {}, updatedAt: 1707249600 },
      });

      await expect(rateService.convert(100, "XYZ", "ABC")).rejects.toThrow(
        "No exchange rate available for XYZ to ABC"
      );
    });

    it("should throw ValidationError when currencies are missing", async () => {
      await expect(rateService.getRate("", "NGN")).rejects.toThrow(
        ValidationError
      );
      await expect(rateService.getRate("USD", "")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("convert", () => {
    it("should convert amount between currencies", async () => {
      const mockRatesData = {
        rates: { USD: { NGN: "1550.00" } },
        updatedAt: 1707249600,
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockRatesData,
      });

      const result = await rateService.convert(100, "USD", "NGN");

      expect(result).toBe(155000);
    });

    it("should throw ValidationError when amount is 0 or negative", async () => {
      await expect(rateService.convert(0, "USD", "NGN")).rejects.toThrow(
        ValidationError
      );
      await expect(rateService.convert(-100, "USD", "NGN")).rejects.toThrow(
        ValidationError
      );
    });
  });
});

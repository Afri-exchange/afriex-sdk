import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PaymentMethodService } from "../PaymentMethodService.js";
import { HttpClient } from "@afriex/core";
import { ValidationError } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
} as unknown as HttpClient;

describe("PaymentMethodService", () => {
  let paymentMethodService: PaymentMethodService;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentMethodService = new PaymentMethodService(mockHttpClient);
  });

  describe("create", () => {
    it("should create a payment method successfully", async () => {
      const mockPaymentMethod = {
        paymentMethodId: "pm-123",
        channel: "BANK_ACCOUNT",
        customerId: "cust-123",
        accountName: "John Doe",
        accountNumber: "1234567890",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockPaymentMethod,
      });

      const result = await paymentMethodService.create({
        channel: "BANK_ACCOUNT",
        customerId: "cust-123",
        accountName: "John Doe",
        accountNumber: "1234567890",
        countryCode: "NG",
        institution: { institutionCode: "044" },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-method",
        expect.any(Object)
      );
      expect(result).toEqual(mockPaymentMethod);
    });

    it("should throw ValidationError when channel is missing", async () => {
      await expect(
        paymentMethodService.create({
          channel: "" as any,
          customerId: "cust-123",
          accountName: "John",
          accountNumber: "123",
          countryCode: "NG",
          institution: {},
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("get", () => {
    it("should get a payment method by ID", async () => {
      const mockPaymentMethod = { paymentMethodId: "pm-123" };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockPaymentMethod,
      });

      const result = await paymentMethodService.get("pm-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/payment-method/pm-123");
      expect(result).toEqual(mockPaymentMethod);
    });

    it("should throw ValidationError when ID is missing", async () => {
      await expect(paymentMethodService.get("")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("list", () => {
    it("should list payment methods", async () => {
      const mockResponse = {
        data: [{ paymentMethodId: "pm-1" }],
        page: 1,
        total: 1,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentMethodService.list({ page: 1, limit: 10 });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/payment-method", {
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should serialize array filters as comma-separated query params", async () => {
      const mockResponse = { data: [], page: 0, total: 0 };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      await paymentMethodService.list({
        channel: ["BANK_ACCOUNT", "MOBILE_MONEY"],
        currencies: ["USD", "NGN"],
        capabilities: "WITHDRAW",
        status: ["active", "pending"],
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/payment-method", {
        params: {
          channel: "BANK_ACCOUNT,MOBILE_MONEY",
          currencies: "USD,NGN",
          capabilities: "WITHDRAW",
          status: "active,pending",
        },
      });
    });
  });

  describe("delete", () => {
    it("should delete a payment method", async () => {
      (mockHttpClient.delete as Mock).mockResolvedValue(undefined);

      await paymentMethodService.delete("pm-123");

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/payment-method/pm-123"
      );
    });
  });

  describe("getInstitutions", () => {
    it("should get institutions for a country", async () => {
      const mockInstitutions = {
        data: [
          {
            institutionName: "Access Bank",
            institutionCode: "044",
            institutionBranch: "",
            institutionAddress: "",
          },
        ],
        total: 1,
        page: 0,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockInstitutions);

      const result = await paymentMethodService.getInstitutions({
        channel: "BANK_ACCOUNT",
        countryCode: "NG",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/institution",
        {
          params: { channel: "BANK_ACCOUNT", countryCode: "NG" },
        }
      );
      expect(result).toEqual(mockInstitutions);
    });

    it("should throw ValidationError when params are missing", async () => {
      await expect(
        paymentMethodService.getInstitutions({
          channel: "" as any,
          countryCode: "NG",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("resolveInstitutionCode", () => {
    it("should resolve a US routing number", async () => {
      const mockResponse = { bankName: "JPMORGAN CHASE BANK" };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentMethodService.resolveInstitutionCode({
        searchTerm: "021000021",
        country: "US",
        codeType: "routing_number",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/institution/codes",
        {
          params: {
            searchTerm: "021000021",
            country: "US",
            codeType: "routing_number",
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should resolve a non-US SWIFT code", async () => {
      const mockResponse = { bankName: "Deutsche Bank" };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentMethodService.resolveInstitutionCode({
        searchTerm: "DEUTDEDB",
        country: "DE",
        codeType: "swift_code",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/institution/codes",
        {
          params: {
            searchTerm: "DEUTDEDB",
            country: "DE",
            codeType: "swift_code",
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should return null when the code is not found", async () => {
      (mockHttpClient.get as Mock).mockResolvedValue(null);

      const result = await paymentMethodService.resolveInstitutionCode({
        searchTerm: "000000000",
        country: "US",
        codeType: "routing_number",
      });

      expect(result).toBeNull();
    });

    it("should throw ValidationError when required params are missing", async () => {
      await expect(
        paymentMethodService.resolveInstitutionCode({
          searchTerm: "",
          country: "US",
          codeType: "routing_number",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("resolveAccount", () => {
    it("should resolve account details", async () => {
      const mockResponse = { recipientName: "John Doe" };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentMethodService.resolveAccount({
        channel: "BANK_ACCOUNT",
        accountNumber: "1234567890",
        institutionCode: "044",
        countryCode: "NG",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/resolve",
        {
          params: {
            channel: "BANK_ACCOUNT",
            accountNumber: "1234567890",
            institutionCode: "044",
            countryCode: "NG",
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw ValidationError when institutionCode is missing for bank account", async () => {
      await expect(
        paymentMethodService.resolveAccount({
          channel: "BANK_ACCOUNT",
          accountNumber: "1234567890",
          countryCode: "NG",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getCryptoWallet", () => {
    it("should get crypto wallet", async () => {
      const mockResponse = {
        data: [{ address: "0x123", network: "ethereum" }],
        total: 1,
        page: 1,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await paymentMethodService.getCryptoWallet({
        asset: "USDT",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/crypto-wallet",
        {
          params: { asset: "USDT" },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("listVirtualAccounts", () => {
    it("should list virtual accounts", async () => {
      const mockPaymentMethods = [
        {
          paymentMethodId: "pm-va-123",
          accountNumber: "999888777",
        },
        {
          paymentMethodId: "pm-va-456",
          accountNumber: "999888778",
        },
      ];

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockPaymentMethods,
        page: 1,
        total: 2,
      });

      const result = await paymentMethodService.listVirtualAccounts({
        currency: "USD",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/virtual-account",
        {
          params: { currency: "USD" },
        }
      );
      expect(result).toEqual({
        data: mockPaymentMethods,
        page: 1,
        total: 2,
      });
    });
  });

  describe("createVirtualAccount", () => {
    it("should create virtual account", async () => {
      const mockPaymentMethod = {
        paymentMethodId: "pm-va-123",
        accountNumber: "999888777",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockPaymentMethod,
      });

      const result = await paymentMethodService.createVirtualAccount({
        currency: "USD",
        label: "SALES",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/payment-method/virtual-account",
        {
          currency: "USD",
          label: "SALES",
        }
      );
      expect(result).toEqual(mockPaymentMethod);
    });

    it("should throw error when label and amount are both provided", async () => {
      await expect(
        paymentMethodService.createVirtualAccount({
          currency: "USD",
          label: "SALES",
          amount: 100,
        })
      ).rejects.toThrow("Validation failed");
    });
  });

  describe("listPoolAccounts", () => {
    it("should list pool accounts", async () => {
      const mockPaymentMethod = {
        paymentMethodId: "pm-pool-123",
        accountNumber: "111222333",
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockPaymentMethod,
      });

      const result = await paymentMethodService.listPoolAccounts({
        country: "NG",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/payment-method/pool-account",
        {
          params: { country: "NG" },
        }
      );
      expect(result).toEqual(mockPaymentMethod);
    });

    it("should throw when country is missing", async () => {
      await expect(
        paymentMethodService.listPoolAccounts({
          country: "",
        })
      ).rejects.toThrow("Country is required");
    });
  });
});

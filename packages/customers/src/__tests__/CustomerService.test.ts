import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { CustomerService } from "../CustomerService.js";
import { HttpClient } from "@afriex/core";
import { ValidationError } from "@afriex/core";

// Mock the HttpClient
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as unknown as HttpClient;

describe("CustomerService", () => {
  let customerService: CustomerService;

  beforeEach(() => {
    vi.clearAllMocks();
    customerService = new CustomerService(mockHttpClient);
  });

  describe("create", () => {
    it("should create a customer successfully", async () => {
      const mockCustomer = {
        customerId: "cust-123",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        countryCode: "US",
      };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockCustomer,
      });

      const result = await customerService.create({
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        countryCode: "US",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/customer", {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        countryCode: "US",
      });
      expect(result).toEqual(mockCustomer);
    });

    it("should throw ValidationError when fullName is missing", async () => {
      await expect(
        customerService.create({
          fullName: "",
          email: "john@example.com",
          phone: "+1234567890",
          countryCode: "US",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when email is missing", async () => {
      await expect(
        customerService.create({
          fullName: "John Doe",
          email: "",
          phone: "+1234567890",
          countryCode: "US",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("get", () => {
    it("should get a customer by ID", async () => {
      const mockCustomer = {
        customerId: "cust-123",
        name: "John Doe",
      };

      (mockHttpClient.get as Mock).mockResolvedValue({
        data: mockCustomer,
      });

      const result = await customerService.get("cust-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/customer/cust-123");
      expect(result).toEqual(mockCustomer);
    });

    it("should throw ValidationError when ID is missing", async () => {
      await expect(customerService.get("")).rejects.toThrow(ValidationError);
    });
  });

  describe("list", () => {
    it("should list customers with pagination", async () => {
      const mockResponse = {
        data: [{ customerId: "cust-1" }, { customerId: "cust-2" }],
        page: 1,
        total: 2,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await customerService.list({ page: 1, limit: 20 });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/customer", {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should list customers with email and phone filters", async () => {
      const mockResponse = {
        data: [{ customerId: "cust-1", email: "john@example.com" }],
        page: 0,
        total: 1,
      };

      (mockHttpClient.get as Mock).mockResolvedValue(mockResponse);

      const result = await customerService.list({
        email: "john@example.com",
        phone: "+2348192837465",
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/customer", {
        params: {
          email: "john@example.com",
          phone: "+2348192837465",
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("delete", () => {
    it("should delete a customer", async () => {
      (mockHttpClient.delete as Mock).mockResolvedValue(undefined);

      await customerService.delete("cust-123");

      expect(mockHttpClient.delete).toHaveBeenCalledWith("/customer/cust-123");
    });

    it("should throw ValidationError when ID is missing", async () => {
      await expect(customerService.delete("")).rejects.toThrow(ValidationError);
    });
  });

  describe("updateKyc", () => {
    it("should update customer KYC by sending the document map directly (not wrapped in a kyc field)", async () => {
      const mockCustomer = { customerId: "cust-123", kyc: { verified: true } };

      (mockHttpClient.patch as Mock).mockResolvedValue({
        data: mockCustomer,
      });

      const result = await customerService.updateKyc("cust-123", {
        PASSPORT: "A12345678",
        DATE_OF_BIRTH: "1990-05-15",
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        "/customer/cust-123/kyc",
        { PASSPORT: "A12345678", DATE_OF_BIRTH: "1990-05-15" }
      );
      expect(result).toEqual(mockCustomer);
    });

    it("should throw ValidationError when customerId is missing", async () => {
      await expect(
        customerService.updateKyc("", { BVN: "22222222222" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when KYC data is empty", async () => {
      await expect(customerService.updateKyc("cust-123", {})).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("update", () => {
    it("should update a customer's profile", async () => {
      const mockCustomer = {
        customerId: "cust-123",
        name: "Jane Doe",
        email: "jane.doe@example.com",
      };

      (mockHttpClient.patch as Mock).mockResolvedValue({
        data: mockCustomer,
      });

      const result = await customerService.update("cust-123", {
        fullName: "Jane Doe",
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith("/customer/cust-123", {
        fullName: "Jane Doe",
      });
      expect(result).toEqual(mockCustomer);
    });

    it("should throw ValidationError when customerId is missing", async () => {
      await expect(
        customerService.update("", { fullName: "Jane Doe" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when no fields are provided", async () => {
      await expect(customerService.update("cust-123", {})).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("verify", () => {
    it("should verify a customer's BVN", async () => {
      const mockCustomer = { customerId: "cust-123", name: "Jane Smith" };

      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockCustomer,
      });

      const result = await customerService.verify("cust-123", {
        docType: "BVN",
        docValue: "22222222222",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/customer/cust-123/verify",
        { docType: "BVN", docValue: "22222222222" }
      );
      expect(result).toEqual(mockCustomer);
    });

    it("should throw ValidationError when customerId is missing", async () => {
      await expect(
        customerService.verify("", { docType: "BVN", docValue: "22222222222" })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when docValue is missing", async () => {
      await expect(
        customerService.verify("cust-123", {
          docType: "BVN",
          docValue: "",
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});

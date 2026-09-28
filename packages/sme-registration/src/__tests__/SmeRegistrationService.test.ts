import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { SmeRegistrationService } from "../SmeRegistrationService.js";
import { HttpClient, ValidationError } from "@afriex/core";

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
} as unknown as HttpClient;

describe("SmeRegistrationService", () => {
  let smeRegistrationService: SmeRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    smeRegistrationService = new SmeRegistrationService(mockHttpClient);
  });

  describe("initiate", () => {
    const data = {
      mobile: "254712345678",
      email: "admin@company.co.ke",
      businessType: 2 as const,
    };

    it("should send the INITIATE step", async () => {
      const mockRegistration = {
        onboardingRequestId: "onb-123",
        step: "INITIATE",
        status: "OTP_PENDING",
        nextStep: "CONFIRM_OTP",
        expiresAt: "2026-05-18T10:10:00.000Z",
      };
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockRegistration,
      });

      const result = await smeRegistrationService.initiate(data);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/sme-registration", {
        step: "INITIATE",
        data,
      });
      expect(result).toEqual(mockRegistration);
    });

    it.each(["mobile", "email"])(
      "should throw ValidationError when %s is missing",
      async (field) => {
        await expect(
          smeRegistrationService.initiate({ ...data, [field]: "" })
        ).rejects.toThrow(ValidationError);
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      }
    );

    it("should throw ValidationError for a business type other than 2", async () => {
      await expect(
        smeRegistrationService.initiate({ ...data, businessType: 1 as 2 })
      ).rejects.toMatchObject({
        fields: [expect.objectContaining({ field: "businessType" })],
      });
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe("confirmOtp", () => {
    it("should send the CONFIRM_OTP step", async () => {
      const mockRegistration = {
        onboardingRequestId: "onb-123",
        step: "CONFIRM_OTP",
        status: "DETAILS_PENDING",
        nextStep: "SUBMIT",
      };
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: mockRegistration,
      });

      const result = await smeRegistrationService.confirmOtp({
        onboardingRequestId: "onb-123",
        otp: "483921",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/sme-registration", {
        step: "CONFIRM_OTP",
        data: { onboardingRequestId: "onb-123", otp: "483921" },
      });
      expect(result).toEqual(mockRegistration);
    });

    it("should throw ValidationError when the passcode is missing", async () => {
      await expect(
        smeRegistrationService.confirmOtp({
          onboardingRequestId: "onb-123",
          otp: "",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when the onboarding request id is missing", async () => {
      await expect(
        smeRegistrationService.confirmOtp({
          onboardingRequestId: "",
          otp: "483921",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("submit", () => {
    it("should send the SUBMIT step with the data as given", async () => {
      const data = {
        onboardingRequestId: "onb-123",
        companyName: "Acme Limited",
        directors: [{ fullName: "Ada Obi", mobile: "0712345678" }],
        media: [{ type: "CERTIFICATE", key: "business-id/certificate.pdf" }],
      };
      (mockHttpClient.post as Mock).mockResolvedValue({
        data: {
          onboardingRequestId: "onb-123",
          step: "SUBMIT",
          status: "SUBMITTED",
          nextStep: null,
        },
      });

      const result = await smeRegistrationService.submit(data);

      expect(mockHttpClient.post).toHaveBeenCalledWith("/sme-registration", {
        step: "SUBMIT",
        data,
      });
      expect(result.status).toBe("SUBMITTED");
    });

    it("should throw ValidationError when there is no director", async () => {
      await expect(
        smeRegistrationService.submit({ directors: [] })
      ).rejects.toMatchObject({
        fields: [
          { field: "directors", message: "At least one director is required" },
        ],
      });
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("should return the registration status", async () => {
      const mockStatus = {
        onboardingRequestId: "onb-123",
        status: "SUBMITTED",
        reviewStatus: "UNDER_REVIEW",
        rejectReasons: null,
      };
      (mockHttpClient.get as Mock).mockResolvedValue({ data: mockStatus });

      const result = await smeRegistrationService.getStatus();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/sme-registration/status"
      );
      expect(result).toEqual(mockStatus);
    });

    it("should return nulls for a business that never registered", async () => {
      const mockStatus = { onboardingRequestId: null, status: null };
      (mockHttpClient.get as Mock).mockResolvedValue({ data: mockStatus });

      await expect(smeRegistrationService.getStatus()).resolves.toEqual(
        mockStatus
      );
    });
  });
});

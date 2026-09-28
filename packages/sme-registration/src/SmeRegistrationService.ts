import { HttpClient, ValidationBuilder } from "@afriex/core";
import {
  InitiateSmeRegistrationData,
  ConfirmSmeRegistrationOtpData,
  SubmitSmeRegistrationData,
  SmeRegistration,
  SmeRegistrationRequest,
  SmeRegistrationStatusResult,
} from "./types.js";

/**
 * Registers the business as its own SME in Kenya, so that dedicated KES
 * virtual accounts are issued under its own legal entity. No other corridor
 * needs it.
 *
 * The three steps are one endpoint, called in order: `initiate()`,
 * `confirmOtp()`, then `submit()`.
 */
export class SmeRegistrationService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Start a registration and send the one-time passcode
   * POST /sme-registration (step INITIATE)
   */
  async initiate(data: InitiateSmeRegistrationData): Promise<SmeRegistration> {
    new ValidationBuilder()
      .required("mobile", data?.mobile)
      .required("email", data?.email)
      .condition(
        "businessType",
        data?.businessType !== 2,
        "businessType must be 2: only Limited Liability Companies are supported"
      )
      .throwIfInvalid();

    return this.send({ step: "INITIATE", data });
  }

  /**
   * Confirm the one-time passcode
   * POST /sme-registration (step CONFIRM_OTP)
   */
  async confirmOtp(
    data: ConfirmSmeRegistrationOtpData
  ): Promise<SmeRegistration> {
    new ValidationBuilder()
      .required("onboardingRequestId", data?.onboardingRequestId)
      .required("otp", data?.otp)
      .throwIfInvalid();

    return this.send({ step: "CONFIRM_OTP", data });
  }

  /**
   * Submit the company details, directors and documents
   * POST /sme-registration (step SUBMIT)
   *
   * Upload each document first and pass the returned keys. Afterwards, poll
   * `getStatus()` for the review outcome.
   */
  async submit(data: SubmitSmeRegistrationData): Promise<SmeRegistration> {
    new ValidationBuilder()
      .condition(
        "directors",
        !Array.isArray(data?.directors) || data.directors.length === 0,
        "At least one director is required"
      )
      .throwIfInvalid();

    return this.send({ step: "SUBMIT", data });
  }

  /**
   * Get the most recent registration status
   * GET /sme-registration/status
   *
   * Dedicated KES virtual accounts are issued only once `reviewStatus` is
   * `APPROVED`.
   */
  async getStatus(): Promise<SmeRegistrationStatusResult> {
    const response = await this.httpClient.get<{
      data: SmeRegistrationStatusResult;
    }>("/sme-registration/status");
    return response.data;
  }

  private async send(request: SmeRegistrationRequest): Promise<SmeRegistration> {
    const response = await this.httpClient.post<{ data: SmeRegistration }>(
      "/sme-registration",
      request
    );
    return response.data;
  }
}

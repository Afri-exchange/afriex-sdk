/** The steps of the registration, in the order they are called. */
export type SmeRegistrationStep = "INITIATE" | "CONFIRM_OTP" | "SUBMIT";

/** Where a registration stands. */
export type SmeRegistrationStatus =
  | "OTP_PENDING"
  | "DETAILS_PENDING"
  | "SUBMITTED"
  | "REJECTED"
  | "EXPIRED";

/**
 * The review outcome of a submitted registration. `UNKNOWN` stands for an
 * outcome Afriex has not mapped yet: treat it as still in review.
 */
export type SmeReviewStatus =
  | "SUBMITTED"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED"
  | "UNDER_REVIEW"
  | "UNKNOWN";

/**
 * The kind of business. Only Limited Liability Companies are supported, so
 * the only value is `2`.
 */
export type SmeBusinessType = 2;

/** The `INITIATE` step: starts the registration and sends the passcode. */
export interface InitiateSmeRegistrationData {
  /**
   * A Kenyan mobile number, in any of the forms `+254712345678`,
   * `254712345678`, `0712345678` or `712345678`. The one-time passcode is
   * sent to it.
   */
  mobile: string;
  email: string;
  businessType: SmeBusinessType;
}

/** The `CONFIRM_OTP` step. */
export interface ConfirmSmeRegistrationOtpData {
  /** The id the `INITIATE` step returned. */
  onboardingRequestId: string;
  /** The passcode sent to the mobile number. */
  otp: string;
}

/**
 * The `SUBMIT` step: company details, directors and documents.
 *
 * The API reference names `directors`, `organizationShareholders` and `media`
 * and leaves the company detail fields unlisted, so they are accepted here
 * as they are. Every file field takes the `key` of an uploaded file, and
 * every director's mobile number must be Kenyan.
 */
export interface SubmitSmeRegistrationData {
  directors: Array<Record<string, unknown>>;
  organizationShareholders?: Array<Record<string, unknown>>;
  media?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Request body for POST /sme-registration. `step` selects the shape of `data`. */
export type SmeRegistrationRequest =
  | { step: "INITIATE"; data: InitiateSmeRegistrationData }
  | { step: "CONFIRM_OTP"; data: ConfirmSmeRegistrationOtpData }
  | { step: "SUBMIT"; data: SubmitSmeRegistrationData };

/** The registration after a step, as returned by POST /sme-registration. */
export interface SmeRegistration {
  onboardingRequestId: string;
  /** The step that was just processed. */
  step: SmeRegistrationStep;
  status: SmeRegistrationStatus;
  /** The step to call next, or `null` when there is none. */
  nextStep?: "CONFIRM_OTP" | "SUBMIT" | null;
  /**
   * The deadline for the next step: the passcode window after `INITIATE`,
   * the submit window after `CONFIRM_OTP`.
   */
  expiresAt?: string;
}

/** The registration status, as returned by GET /sme-registration/status. */
export interface SmeRegistrationStatusResult {
  /** `null` when the business has never registered. */
  onboardingRequestId: string | null;
  status: SmeRegistrationStatus | null;
  /** Present only once the registration has been submitted. */
  reviewStatus?: SmeReviewStatus;
  rejectReasons?: string[] | null;
  /**
   * `true` when a fresh review outcome could not be read, so `reviewStatus`
   * is the last known one. Absent when the read succeeded.
   */
  isReviewStatusStale?: boolean;
}

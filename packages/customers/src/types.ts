/**
 * Customer types matching Afriex Business API
 */

/**
 * KYC documents recorded for a customer, as returned under `meta.kyc`.
 */
export interface CustomerKyc {
  /** Map of KYC document types to their submitted values. */
  data?: Partial<Record<KycDocumentType, string>>;
}

/**
 * Customer metadata. Carries whatever was sent as `meta` on create, plus
 * server-managed entries such as `kyc`.
 */
export interface CustomerMeta {
  /**
   * KYC documents. Written with `CustomerService.updateKyc()` and read back
   * from here — there is no top-level `kyc` field on `Customer`.
   */
  kyc?: CustomerKyc;
  [key: string]: unknown;
}

export interface Customer {
  customerId: string;
  /**
   * A shortened reference for the customer. Supply it as the pool-account
   * `reference` when submitting a payment proof. Falls back to the customer id
   * when no shortened reference has been assigned.
   */
  reference?: string;
  /** The full name of the customer. */
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  meta?: CustomerMeta;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  meta?: Record<string, unknown>;
}

/**
 * Partial profile update. At least one of `fullName`, `email`, or `phone` is required.
 * PATCH /customer/{customerId}
 */
export interface UpdateCustomerRequest {
  fullName?: string;
  email?: string;
  phone?: string;
}

/**
 * Document types that can appear on a customer at `meta.kyc.data`.
 *
 * Not all of them can be written through `updateKyc()`: see
 * `UpdatableKycDocumentType`.
 */
export type KycDocumentType =
  | "REPRESENTATIVE_TYPE"
  | "DATE_OF_BIRTH"
  | "ADDRESS"
  | "BANK_STATEMENT"
  | "BUSINESS_CERTIFICATE"
  | "COUNTRY"
  | "ID_FRONT"
  | "ID_BACK"
  | "PHONE"
  | "SELFIE"
  | "PROOF_OF_ADDRESS"
  | "PROOF_OF_INCOME"
  | "BVN"
  | "DRIVER_LICENSE"
  | "PASSPORT"
  | "NATIONAL_ID"
  | "PAYMENT_METHOD"
  | "RESIDENCE_PERMIT"
  | "VEHICLE_REGISTRATION"
  | "VOTER_ID"
  | "OTHERS";

/** Document types PATCH /customer/{customerId}/kyc rejects. */
export type ReadOnlyKycDocumentType = "COUNTRY" | "PHONE" | "BVN";

/**
 * Document types accepted by PATCH /customer/{customerId}/kyc.
 *
 * `COUNTRY` and `PHONE` are profile fields, changed with `update()`. `BVN` is
 * written only by `verify()`, after a successful bank verification. The API
 * answers `400 INVALID_KYC_DOCUMENT_TYPE` for all three, and rejects the whole
 * request when one of them is mixed in with valid types.
 */
export type UpdatableKycDocumentType = Exclude<
  KycDocumentType,
  ReadOnlyKycDocumentType
>;

/**
 * Flat map of KYC document types to their values, sent directly as the
 * PATCH /customer/{customerId}/kyc request body (not wrapped in a `kyc` field).
 *
 * The endpoint is documented as a partial update, but the sandbox replaces the
 * stored map outright: a second call that sends only `DATE_OF_BIRTH` drops a
 * `PASSPORT` sent by the first. Send every document you want retained on each
 * call, which is correct under either behaviour.
 */
export type UpdateCustomerKycRequest = Partial<
  Record<UpdatableKycDocumentType, string>
>;

/**
 * Request body for POST /customer/{customerId}/verify.
 * Today the only supported `docType` is `BVN` (Nigeria).
 */
export interface VerifyCustomerRequest {
  docType: "BVN";
  docValue: string;
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  email?: string;
  phone?: string;
}

export interface CustomerListResponse {
  data: Customer[];
  page: number;
  total: number;
}

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
 * Document types accepted by PATCH /customer/{customerId}/kyc.
 *
 * The sandbox currently rejects `COUNTRY`, `PHONE` and `BVN` with
 * `INVALID_KYC_DOCUMENT_TYPE`, but all three are documented as valid and appear
 * in the documented response example, so they are kept in the union.
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

/**
 * Flat map of KYC document types to their values, sent directly as the
 * PATCH /customer/{customerId}/kyc request body (not wrapped in a `kyc` field).
 *
 * The endpoint is documented as a partial update, but the sandbox was observed
 * to replace the stored map outright. Until that is reconciled, send every
 * document you want retained on each call — correct under either behaviour.
 */
export type UpdateCustomerKycRequest = Partial<
  Record<KycDocumentType, string>
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

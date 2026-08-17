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
 * `COUNTRY`, `PHONE` and `BVN` are rejected with `INVALID_KYC_DOCUMENT_TYPE`
 * despite having appeared in earlier documentation. A customer's country is set
 * with `countryCode` on create, their phone with `update()`, and BVN is verified
 * through `verify()` rather than stored as a KYC document.
 */
export type KycDocumentType =
  | "REPRESENTATIVE_TYPE"
  | "DATE_OF_BIRTH"
  | "ADDRESS"
  | "BANK_STATEMENT"
  | "BUSINESS_CERTIFICATE"
  | "ID_FRONT"
  | "ID_BACK"
  | "SELFIE"
  | "PROOF_OF_ADDRESS"
  | "PROOF_OF_INCOME"
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
 * The call **replaces** the stored document map rather than merging into it —
 * send every document you want retained on each call.
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

/**
 * Customer types matching Afriex Business API
 */

export interface Customer {
  customerId: string;
  /** The full name of the customer. */
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  kyc?: Record<string, unknown>;
  meta?: Record<string, unknown>;
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
 * Flat map of KYC document types to their values, sent directly as the
 * PATCH /customer/{customerId}/kyc request body (not wrapped in a `kyc` field).
 */
export type UpdateCustomerKycRequest = Record<string, string>;

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

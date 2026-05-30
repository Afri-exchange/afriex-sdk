/**
 * Customer types matching Afriex Business API
 */

export interface Customer {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  kyc?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface CreateCustomerRequest {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  kyc?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface UpdateCustomerKycRequest {
  kyc: Record<string, string>;
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

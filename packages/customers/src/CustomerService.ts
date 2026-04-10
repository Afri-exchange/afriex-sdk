import { HttpClient, ValidationError } from "@afriex/core";
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerKycRequest,
  ListCustomersParams,
  CustomerListResponse,
} from "./types.js";

export class CustomerService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Create a new customer
   * POST /customer
   */
  async create(request: CreateCustomerRequest): Promise<Customer> {
    this.validateCreateRequest(request);

    const response = await this.httpClient.post<{ data: Customer }>(
      "/customer",
      request
    );
    return response.data;
  }

  /**
   * Get a customer by ID
   * GET /customer/{customerId}
   */
  async get(customerId: string): Promise<Customer> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    const response = await this.httpClient.get<{ data: Customer }>(
      `/customer/${customerId}`
    );
    return response.data;
  }

  /**
   * List all customers with pagination
   * GET /customer
   */
  async list(params?: ListCustomersParams): Promise<CustomerListResponse> {
    return this.httpClient.get<CustomerListResponse>("/customer", {
      params,
    });
  }

  /**
   * Delete a customer by ID
   * DELETE /customer/{customerId}
   */
  async delete(customerId: string): Promise<void> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    await this.httpClient.delete(`/customer/${customerId}`);
  }

  /**
   * Update customer KYC information
   * PATCH /customer/{customerId}/kyc
   */
  async updateKyc(
    customerId: string,
    request: UpdateCustomerKycRequest
  ): Promise<Customer> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    if (!request.kyc || Object.keys(request.kyc).length === 0) {
      throw new ValidationError("KYC data is required");
    }

    const response = await this.httpClient.patch<{ data: Customer }>(
      `/customer/${customerId}/kyc`,
      request
    );
    return response.data;
  }

  private validateCreateRequest(request: CreateCustomerRequest): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!request.fullName) {
      errors.push({ field: "fullName", message: "Full name is required" });
    }

    if (!request.email) {
      errors.push({ field: "email", message: "Email is required" });
    }

    if (!request.phone) {
      errors.push({ field: "phone", message: "Phone is required" });
    }

    if (!request.countryCode) {
      errors.push({
        field: "countryCode",
        message: "Country code is required",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Validation failed", errors);
    }
  }
}

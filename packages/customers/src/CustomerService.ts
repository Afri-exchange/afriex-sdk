import { HttpClient, ValidationBuilder, ValidationError } from "@afriex/core";
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerKycRequest,
  VerifyCustomerRequest,
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
   * Partially update a customer's profile
   * PATCH /customer/{customerId}
   * Send at least one of fullName, email, or phone; omitted fields are left unchanged.
   */
  async update(
    customerId: string,
    request: UpdateCustomerRequest
  ): Promise<Customer> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    new ValidationBuilder()
      .requireOneOf(
        [
          ["fullName", request.fullName],
          ["email", request.email],
          ["phone", request.phone],
        ],
        "At least one of fullName, email, or phone is required"
      )
      .throwIfInvalid();

    const response = await this.httpClient.patch<{ data: Customer }>(
      `/customer/${customerId}`,
      request
    );
    return response.data;
  }

  /**
   * Update customer KYC information
   * PATCH /customer/{customerId}/kyc
   *
   * The document map is sent directly as the request body (not wrapped in a `kyc` field).
   * It is documented as a partial update, but the sandbox was observed to replace the
   * stored documents, so send every document you want retained on each call.
   *
   * The saved documents come back on the customer at `meta.kyc.data`.
   */
  async updateKyc(
    customerId: string,
    request: UpdateCustomerKycRequest
  ): Promise<Customer> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    if (!request || Object.keys(request).length === 0) {
      throw new ValidationError("KYC data is required");
    }

    const response = await this.httpClient.patch<{ data: Customer }>(
      `/customer/${customerId}/kyc`,
      request
    );
    return response.data;
  }

  /**
   * Verify a customer document (e.g. Nigerian BVN)
   * POST /customer/{customerId}/verify
   */
  async verify(
    customerId: string,
    request: VerifyCustomerRequest
  ): Promise<Customer> {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    new ValidationBuilder()
      .required("docType", request.docType)
      .required("docValue", request.docValue)
      .throwIfInvalid();

    const response = await this.httpClient.post<{ data: Customer }>(
      `/customer/${customerId}/verify`,
      request
    );
    return response.data;
  }

  private validateCreateRequest(request: CreateCustomerRequest): void {
    new ValidationBuilder()
      .required("fullName", request.fullName)
      .required("email", request.email)
      .required("phone", request.phone)
      .required("countryCode", request.countryCode)
      .throwIfInvalid();
  }
}

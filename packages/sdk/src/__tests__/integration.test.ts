import { describe, it, expect, beforeAll } from "vitest";
import { AfriexSDK } from "../index.js";
import { Environment } from "@afriex/core";

/**
 * Integration tests for Afriex SDK
 *
 * These tests make real API calls to the Afriex sandbox environment.
 *
 * PREREQUISITES:
 * 1. Set AFRIEX_SANDBOX_API_KEY environment variable
 * 2. Run with: pnpm test:integration
 *
 * Note: These tests will create real resources in the sandbox.
 * They attempt to clean up after themselves.
 */

const API_KEY = process.env.AFRIEX_SANDBOX_API_KEY;
const SKIP_INTEGRATION_TESTS = !API_KEY;

describe.skipIf(SKIP_INTEGRATION_TESTS)("Afriex SDK Integration Tests", () => {
  let sdk: AfriexSDK;
  let createdCustomerId: string;
  let createdPaymentMethodId: string;

  beforeAll(() => {
    if (!API_KEY) {
      throw new Error(
        "AFRIEX_SANDBOX_API_KEY environment variable is required for integration tests"
      );
    }

    sdk = new AfriexSDK({
      apiKey: API_KEY,
      environment: Environment.STAGING,
      enableLogging: true,
    });
  });

  describe("Staging Environment Configuration", () => {
    it("should point the SDK at the sandbox base URL when using a staging key", () => {
      expect(sdk.getConfig().environment).toBe(Environment.STAGING);
      expect(sdk.getConfig().baseUrl).toContain("sandbox.api.afriex.com");
      expect(sdk.getConfig().apiKey).toBe(API_KEY);
    });

    it("should authenticate against the sandbox API with the staging key", async () => {
      // Any authenticated call succeeding proves the staging key + sandbox
      // base URL combination is wired correctly end-to-end.
      const balances = await sdk.balance.getBalance();

      expect(balances).toBeDefined();
      expect(typeof balances).toBe("object");
    }, 10000);

    it("should reject an invalid API key against the sandbox host", async () => {
      const badSdk = new AfriexSDK({
        apiKey: "invalid-staging-key",
        environment: Environment.STAGING,
      });

      await expect(badSdk.balance.getBalance()).rejects.toThrow();
    }, 10000);
  });

  describe("Balance Service", () => {
    it("should get wallet balances for specific currencies", async () => {
      const balances = await sdk.balance.getBalance({
        currencies: ["USD", "NGN"],
      });

      expect(balances).toBeDefined();
      expect(typeof balances.USD).toBe("number");
      expect(typeof balances.NGN).toBe("number");
    }, 10000);

    it("should get wallet balances for all currencies when none are specified", async () => {
      const balances = await sdk.balance.getBalance();

      expect(balances).toBeDefined();
      expect(Object.keys(balances).length).toBeGreaterThan(0);
    }, 10000);

    it("should top up sandbox balance", async () => {
      const transaction = await sdk.balance.topUpSandbox({
        amount: 100,
        currency: "USD",
      });

      expect(transaction).toBeDefined();
      expect(transaction.transactionId).toBeDefined();
      expect(transaction.sourceCurrency).toBe("USD");
      expect(parseFloat(transaction.sourceAmount)).toBe(100);
    }, 10000);
  });

  describe("Exchange Rates Service", () => {
    it("should get exchange rates", async () => {
      const rates = await sdk.rates.getRates({
        fromSymbols: ["USD", "GBP"],
        toSymbols: ["NGN", "KES"],
      });

      expect(rates).toBeDefined();
      expect(rates.rates).toBeDefined();
      expect(rates.rates.USD).toBeDefined();
      expect(rates.rates.USD.NGN).toBeDefined();
      expect(rates.updatedAt).toBeDefined();
    }, 10000);

    it("should get single rate", async () => {
      const rate = await sdk.rates.getRate("USD", "NGN");

      expect(rate).toBeDefined();
      expect(parseFloat(rate)).toBeGreaterThan(0);
    }, 10000);

    it("should convert amount", async () => {
      const converted = await sdk.rates.convert(100, "USD", "NGN");

      expect(converted).toBeGreaterThan(0);
    }, 10000);
  });

  describe("Customer Service", () => {
    it("should create a customer", async () => {
      const timestamp = Date.now();
      const customer = await sdk.customers.create({
        fullName: `Test User ${timestamp}`,
        email: `test${timestamp}@example.com`,
        phone: `+1${timestamp.toString().slice(-10)}`,
        countryCode: "US",
        meta: {
          testRun: "integration-test",
        },
      });

      expect(customer).toBeDefined();
      expect(customer.customerId).toBeDefined();
      expect(customer.name).toBe(`Test User ${timestamp}`);
      expect(customer.email).toBe(`test${timestamp}@example.com`);

      // Save for later tests
      createdCustomerId = customer.customerId;
    }, 10000);

    it("should get customer by ID", async () => {
      expect(createdCustomerId).toBeDefined();

      const customer = await sdk.customers.get(createdCustomerId);

      expect(customer).toBeDefined();
      expect(customer.customerId).toBe(createdCustomerId);
    }, 10000);

    it("should list customers", async () => {
      const response = await sdk.customers.list({ page: 1, limit: 10 });

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.page).toBe(1);
      expect(response.total).toBeGreaterThan(0);
    }, 10000);

    it("should update customer KYC", async () => {
      expect(createdCustomerId).toBeDefined();

      const customer = await sdk.customers.updateKyc(createdCustomerId, {
        PASSPORT: "TEST123456",
        DATE_OF_BIRTH: "1990-05-15",
      });

      expect(customer).toBeDefined();
      // The saved documents come back at meta.kyc.data.
      expect(customer.meta?.kyc?.data).toBeDefined();
    }, 10000);

    it("should update a customer's profile", async () => {
      expect(createdCustomerId).toBeDefined();

      const customer = await sdk.customers.update(createdCustomerId, {
        fullName: "Updated Test User",
      });

      expect(customer).toBeDefined();
      expect(customer.name).toBe("Updated Test User");
    }, 10000);

    it("should verify a customer's BVN", async () => {
      expect(createdCustomerId).toBeDefined();

      const customer = await sdk.customers.verify(createdCustomerId, {
        docType: "BVN",
        docValue: "22222222222",
      });

      expect(customer).toBeDefined();
      expect(customer.customerId).toBe(createdCustomerId);
    }, 10000);
  });

  describe("Payment Method Service", () => {
    it("should get institutions for a country", async () => {
      const response = await sdk.paymentMethods.getInstitutions({
        channel: "BANK_ACCOUNT",
        countryCode: "NG",
      });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0].institutionName).toBeDefined();
      expect(response.data[0].institutionCode).toBeDefined();
    }, 10000);

    it("should create a payment method", async () => {
      expect(createdCustomerId).toBeDefined();

      const paymentMethod = await sdk.paymentMethods.create({
        channel: "BANK_ACCOUNT",
        customerId: createdCustomerId,
        accountName: "Test Account",
        accountNumber: "0123456789",
        countryCode: "NG",
        institution: {
          institutionCode: "044",
          institutionName: "Access Bank",
        },
      });

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.paymentMethodId).toBeDefined();
      expect(paymentMethod.customerId).toBe(createdCustomerId);
      expect(paymentMethod.accountNumber).toBe("0123456789");

      // Save for later tests
      createdPaymentMethodId = paymentMethod.paymentMethodId;
    }, 10000);

    it("should get payment method by ID", async () => {
      expect(createdPaymentMethodId).toBeDefined();

      const paymentMethod = await sdk.paymentMethods.get(
        createdPaymentMethodId
      );

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.paymentMethodId).toBe(createdPaymentMethodId);
    }, 10000);

    it("should list payment methods", async () => {
      const response = await sdk.paymentMethods.list({ page: 1, limit: 10 });

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    }, 10000);

    it("should list payment methods filtered by channel and status", async () => {
      const response = await sdk.paymentMethods.list({
        page: 0,
        limit: 10,
        channel: ["BANK_ACCOUNT"],
        status: ["active", "pending"],
      });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    }, 10000);

    it("should resolve a US routing number to a bank name", async () => {
      const result = await sdk.paymentMethods.resolveInstitutionCode({
        searchTerm: "021000021",
        country: "US",
        codeType: "routing_number",
      });

      // May resolve to null if the sandbox lookup table doesn't have this
      // routing number; either way the call must succeed without throwing.
      expect(result === null || typeof result?.data.bankName === "string").toBe(
        true
      );
    }, 10000);
  });

  describe("Transaction Service", () => {
    it("should create a transaction", async () => {
      expect(createdCustomerId).toBeDefined();
      expect(createdPaymentMethodId).toBeDefined();

      const timestamp = Date.now();
      const transaction = await sdk.transactions.create({
        customerId: createdCustomerId,
        sourceAmount: "10.00",
        sourceCurrency: "USD",
        destinationAmount: "10000.00",
        destinationCurrency: "NGN",
        type: "WITHDRAW",
        destinationId: createdPaymentMethodId,
        meta: {
          idempotencyKey: `test-${timestamp}`,
          reference: `ref-${timestamp}`,
          narration: "Integration test transaction",
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.transactionId).toBeDefined();
      expect(transaction.customerId).toBe(createdCustomerId);
      expect(transaction.status).toBeDefined();
    }, 10000);

    it("should list transactions", async () => {
      const response = await sdk.transactions.list({ page: 1, limit: 10 });

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    }, 10000);

    it("should reject authorization of a non-existent transaction", async () => {
      // There's no reliable way to drive a sandbox transaction into
      // CUSTOMER_ACTION_REQUIRED on demand, so this exercises the
      // authorize() wiring against a transaction id that can't exist.
      await expect(
        sdk.transactions.authorize("000000000000000000000000", {
          type: "OTP",
          otp: "123456",
        })
      ).rejects.toThrow();
    }, 10000);
  });

  describe("Cleanup", () => {
    it("should delete payment method", async () => {
      if (createdPaymentMethodId) {
        await sdk.paymentMethods.delete(createdPaymentMethodId);
        // Verify deletion
        await expect(
          sdk.paymentMethods.get(createdPaymentMethodId)
        ).rejects.toThrow();
      }
    }, 10000);

    it("should delete customer", async () => {
      if (createdCustomerId) {
        await sdk.customers.delete(createdCustomerId);
        // Verify deletion
        await expect(sdk.customers.get(createdCustomerId)).rejects.toThrow();
      }
    }, 10000);
  });
});

// Instructions for running
if (SKIP_INTEGRATION_TESTS) {
  console.log(`
⚠️  Integration tests skipped - AFRIEX_SANDBOX_API_KEY not set

To run integration tests:
1. Get your sandbox API key from https://sandbox.afriex.com
2. Set environment variable: export AFRIEX_SANDBOX_API_KEY=your-key-here
3. Run tests: pnpm test:integration

Or run a specific test file:
AFRIEX_SANDBOX_API_KEY=your-key pnpm vitest run packages/sdk/src/__tests__/integration.test.ts
  `);
}

import { AfriexClient, AfriexConfig } from "@afriex/core";
import { CustomerService } from "@afriex/customers";
import { TransactionService } from "@afriex/transactions";
import { PaymentMethodService } from "@afriex/payment-methods";
import { BalanceService } from "@afriex/balance";
import { RateService } from "@afriex/rates";
import { CheckoutService } from "@afriex/checkout";
import { WebhookVerifier, WebhookService } from "@afriex/webhooks";

export interface AfriexSDKConfig extends AfriexConfig {
  webhookPublicKey?: string;
}

export class AfriexSDK extends AfriexClient {
  public readonly customers: CustomerService;
  public readonly transactions: TransactionService;
  public readonly paymentMethods: PaymentMethodService;
  public readonly balance: BalanceService;
  public readonly rates: RateService;
  public readonly checkout: CheckoutService;
  public readonly webhookVerifier?: WebhookVerifier;
  public readonly webhooks: WebhookService;

  constructor(config: AfriexSDKConfig) {
    super(config);

    const httpClient = this.getHttpClient();

    this.customers = new CustomerService(httpClient);
    this.transactions = new TransactionService(httpClient);
    this.paymentMethods = new PaymentMethodService(httpClient);
    this.balance = new BalanceService(httpClient);
    this.rates = new RateService(httpClient);
    this.checkout = new CheckoutService(httpClient);
    this.webhooks = new WebhookService(httpClient);

    if (config.webhookPublicKey) {
      this.webhookVerifier = new WebhookVerifier(config.webhookPublicKey);
    }
  }
}

// Short alias
export { AfriexSDK as Afriex };

// Re-export core types
export * from "@afriex/core";

// Re-export service classes explicitly to avoid conflicts
export { CustomerService } from "@afriex/customers";
export { TransactionService } from "@afriex/transactions";
export { PaymentMethodService } from "@afriex/payment-methods";
export { BalanceService } from "@afriex/balance";
export { RateService } from "@afriex/rates";
export { CheckoutService } from "@afriex/checkout";
export { WebhookVerifier, WebhookService } from "@afriex/webhooks";

// Re-export types from each package - using explicit exports to avoid conflicts
export type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerKycRequest,
  ListCustomersParams,
  CustomerListResponse,
} from "@afriex/customers";

export type {
  Transaction,
  CreateTransactionRequest,
  ListTransactionsParams,
  TransactionListResponse,
  TransactionType,
  TransactionStatus,
  TransactionMeta,
} from "@afriex/transactions";

export type {
  PaymentMethod,
  CreatePaymentMethodRequest,
  ListPaymentMethodsParams,
  PaymentMethodListResponse,
  PaymentChannel,
  Institution,
  ResolveAccountParams,
  ResolveAccountResponse,
  GetInstitutionsParams,
  CryptoWalletResponse,
  GetCryptoWalletParams,
  ListVirtualAccountsParams,
  CreateVirtualAccountParams,
  ListPoolAccountsParams,
  VirtualAccountListResponse,
} from "@afriex/payment-methods";

export type { BalanceResponse, GetBalanceParams } from "@afriex/balance";

export type { RatesResponse, GetRatesParams } from "@afriex/rates";

export type {
  CheckoutSession,
  CreateCheckoutSessionRequest,
  CheckoutCustomer,
  CheckoutChannel,
} from "@afriex/checkout";

export type {
  WebhookPayload,
  CustomerWebhookPayload,
  CustomerEventType,
  CustomerWebhookData,
  PaymentMethodWebhookPayload,
  PaymentMethodEventType,
  PaymentMethodWebhookData,
  TransactionWebhookPayload,
  TransactionEventType,
  TransactionWebhookData,
  TransactionWebhookStatus,
  TriggerWebhookRequest,
  WebhookEventType,
} from "@afriex/webhooks";

export { WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";

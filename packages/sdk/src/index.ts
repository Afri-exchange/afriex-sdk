import {
  AfriexClient,
  AfriexConfig,
  DEFAULT_USER_AGENT,
} from "@afriex/core";
import { SDK_VERSION } from "./version.js";
import { CustomerService } from "@afriex/customers";
import { TransactionService } from "@afriex/transactions";
import { PaymentMethodService } from "@afriex/payment-methods";
import { BalanceService } from "@afriex/balance";
import { RateService } from "@afriex/rates";
import { CheckoutService } from "@afriex/checkout";
import { WebhookService } from "@afriex/webhooks";
import { MediaService } from "@afriex/media";
import { PaymentBatchService } from "@afriex/payment-batches";
import { SmeRegistrationService } from "@afriex/sme-registration";

export interface AfriexSDKConfig extends AfriexConfig {
  webhookPublicKey?: string;
}

export class AfriexSDK extends AfriexClient {
  public readonly customers: CustomerService;
  public readonly transactions: TransactionService;
  public readonly paymentMethods: PaymentMethodService;
  public readonly paymentBatches: PaymentBatchService;
  public readonly balance: BalanceService;
  public readonly rates: RateService;
  public readonly checkout: CheckoutService;
  public readonly media: MediaService;
  public readonly smeRegistration: SmeRegistrationService;
  public readonly webhooks: WebhookService;
  public readonly webhookVerifier?: WebhookService;

  constructor(config: AfriexSDKConfig) {
    super({
      ...config,
      userAgent: config.userAgent || `${DEFAULT_USER_AGENT}/${SDK_VERSION}`,
    });

    const httpClient = this.getHttpClient();

    this.customers = new CustomerService(httpClient);
    this.transactions = new TransactionService(httpClient);
    this.paymentMethods = new PaymentMethodService(httpClient);
    this.paymentBatches = new PaymentBatchService(httpClient);
    this.balance = new BalanceService(httpClient);
    this.rates = new RateService(httpClient);
    this.checkout = new CheckoutService(httpClient);
    this.media = new MediaService(httpClient);
    this.smeRegistration = new SmeRegistrationService(httpClient);
    this.webhooks = new WebhookService(httpClient, config.webhookPublicKey);

    if (config.webhookPublicKey) {
      this.webhookVerifier = this.webhooks;
    }
  }
}

// Short alias
export { AfriexSDK as Afriex };

export { SDK_VERSION } from "./version.js";

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
export { MediaService } from "@afriex/media";
export { PaymentBatchService } from "@afriex/payment-batches";
export { SmeRegistrationService } from "@afriex/sme-registration";

// Re-export types from each package - using explicit exports to avoid conflicts
export type {
  Customer,
  CustomerKyc,
  CustomerMeta,
  KycDocumentType,
  UpdatableKycDocumentType,
  ReadOnlyKycDocumentType,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerKycRequest,
  VerifyCustomerRequest,
  ListCustomersParams,
  CustomerListResponse,
} from "@afriex/customers";

export type {
  Transaction,
  CreateTransactionRequest,
  CreateWithdrawTransaction,
  CreateDepositTransaction,
  CreateSwapTransaction,
  TransactionAmount,
  TransactionAmounts,
  SwapAmount,
  AuthorizeTransactionRequest,
  SimulateTransactionRequest,
  SimulateTransactionOutcome,
  SettlementAdvice,
  SubmitPoolAccountProofRequest,
  PoolAccountProofSender,
  ListTransactionsParams,
  TransactionListResponse,
  TransactionListType,
  TransactionListStatus,
  TransactionSettlement,
  TransactionChannel,
  TransactionType,
  TransactionMeta,
  TransactionMetaResponse,
  TransactionFailureCode,
  TransactionFailureReason,
} from "@afriex/transactions";

export type {
  PaymentMethod,
  PaymentMethodBankAddress,
  PaymentMethodInstitution,
  PaymentMethodRecipient,
  PaymentMethodTransaction,
  CreatePaymentMethodRequest,
  CreateInstitutionPaymentMethodRequest,
  CreateAliasPaymentMethodRequest,
  CreateVirtualBankAccountPaymentMethodRequest,
  AliasPaymentChannel,
  InstitutionPaymentChannel,
  ListPaymentMethodsParams,
  PaymentMethodListResponse,
  PaymentMethodListChannel,
  PaymentMethodListStatus,
  PaymentMethodListCapability,
  VirtualAccountLabel,
  PaymentChannel,
  CreatablePaymentChannel,
  PaymentMethodStatus,
  CardBrand,
  CardExpiration,
  Institution,
  InstitutionListResponse,
  InstitutionListChannel,
  InstitutionCode,
  InstitutionCodesParams,
  InstitutionCodesResponse,
  ResolveAccountParams,
  ResolvedAccount,
  ResolveAccountResponse,
  GetInstitutionsParams,
  CryptoWallet,
  CryptoWalletData,
  CryptoWalletResponse,
  GetCryptoWalletParams,
  ListVirtualAccountsParams,
  CreateVirtualAccountParams,
  ListPoolAccountsParams,
  VirtualAccountListResponse,
  PoolAccountResponse,
  SimulateTransferRequest,
  SimulateTransferResult,
} from "@afriex/payment-methods";

export type {
  BalanceResponse,
  GetBalanceParams,
  TopUpParams,
  TopUpResponse,
  TopUpTransaction,
  TopUpTransactionType,
  TopUpTransactionStatus,
} from "@afriex/balance";

export type { RatesResponse, GetRatesParams } from "@afriex/rates";

export type {
  CheckoutSession,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CheckoutCustomer,
  CheckoutChannel,
} from "@afriex/checkout";

export type {
  MediaUploadType,
  CreateUploadUrlRequest,
  UploadUrl,
  UploadableFile,
  UploadFileRequest,
  UploadedFile,
} from "@afriex/media";

export type {
  PaymentBatch,
  PaymentBatchRequest,
  PaymentBatchSource,
  PaymentBatchFundingMethod,
  PaymentBatchListItem,
  PaymentBatchListParams,
  PaymentBatchListResponse,
  PaymentBatchInstitution,
  PaymentBatchAmount,
  PaymentBatchRecipientRequest,
  UpdatePaymentBatchRecipientRequest,
  SavedPaymentBatchRecipient,
  PaymentBatchRecipient,
  PaymentBatchRecipientListResponse,
  PaymentBatchOutcomes,
  WithdrawPaymentBatchParams,
  PaymentBatchSession,
  PaymentBatchSessionResult,
  PaymentBatchSessionListResponse,
} from "@afriex/payment-batches";

export type {
  SmeRegistration,
  SmeRegistrationRequest,
  SmeRegistrationStep,
  SmeRegistrationStatus,
  SmeRegistrationStatusResult,
  SmeReviewStatus,
  SmeBusinessType,
  InitiateSmeRegistrationData,
  ConfirmSmeRegistrationOtpData,
  SubmitSmeRegistrationData,
} from "@afriex/sme-registration";

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
  TransactionWebhookMeta,
  TransactionWebhookFailureReason,
  TransactionWebhookStatus,
  CheckoutSessionWebhookPayload,
  CheckoutSessionEventType,
  CheckoutSessionWebhookData,
  CheckoutSessionWebhookCustomer,
  PoolDepositRequestWebhookPayload,
  PoolDepositRequestEventType,
  PoolDepositRejectedWebhookData,
  TriggerWebhookRequest,
  TriggerWebhookResult,
  TriggerWebhookResponse,
  WebhookEventType,
  TriggerableWebhookEventType,
} from "@afriex/webhooks";

export { WEBHOOK_SIGNATURE_HEADER } from "@afriex/webhooks";
// `TransactionStatus` is a value as well as a type, so it is exported as both.
export {
  TransactionStatus,
  DEFAULT_TRANSACTION_TYPE,
} from "@afriex/transactions";

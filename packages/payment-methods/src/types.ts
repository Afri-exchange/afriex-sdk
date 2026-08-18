/**
 * Payment Method types matching Afriex Business API
 */

/**
 * All channels a `PaymentMethod` may report. Broader than
 * `CreatablePaymentChannel` — some values (CARD, CRYPTO, POOL_ACCOUNT, RFP,
 * VIRTUAL_CARD) are only ever returned, never accepted on create.
 */
export type PaymentChannel =
  | "BANK_ACCOUNT"
  | "MOBILE_MONEY"
  | "SWIFT"
  | "INTERAC"
  | "UPI"
  | "WE_CHAT"
  | "ALIPAY"
  | "CARD"
  | "CRYPTO"
  | "VIRTUAL_BANK_ACCOUNT"
  | "POOL_ACCOUNT"
  | "ACH_BANK_ACCOUNT"
  | "PAYBILL_TILL"
  | "RFP"
  | "VIRTUAL_CARD";

/** Channels accepted by POST /payment-method. */
export type CreatablePaymentChannel =
  | "BANK_ACCOUNT"
  | "MOBILE_MONEY"
  | "VIRTUAL_BANK_ACCOUNT"
  | "ACH_BANK_ACCOUNT"
  | "INTERAC"
  | "UPI"
  | "SWIFT"
  | "WE_CHAT"
  | "ALIPAY"
  | "PAYBILL_TILL";

/** Lifecycle status of a payment method. */
export type PaymentMethodStatus =
  | "active"
  | "pending"
  | "deleted"
  | "expired"
  | "blocked";

/** Card brand. CARD channel only. */
export type CardBrand =
  | "Visa"
  | "MasterCard"
  | "Discover"
  | "American Express"
  | "JCB"
  | "Diners Club"
  | "Eftpos Australia"
  | "UnionPay"
  | "Unknown";

export interface CardExpiration {
  month: number;
  year: number;
}

export interface PaymentMethodInstitution {
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
  institutionAddress?: string;
  /** Mandatory for USD (SWIFT) payout payment methods. */
  correspondentBankName?: string;
  /** Mandatory for USD (SWIFT) payout payment methods. */
  correspondentBankAccountNumber?: string;
}

export interface PaymentMethodRecipient {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientName?: string;
}

export interface PaymentMethodTransaction {
  transactionInvoice?: string;
  transactionNarration?: string;
}

export interface PaymentMethod {
  paymentMethodId: string;
  customerId: string;
  /** Identifier to reconcile incoming deposits against. */
  reference?: string;
  institution?: PaymentMethodInstitution;
  transaction?: PaymentMethodTransaction;
  recipient?: PaymentMethodRecipient;
  channel: PaymentChannel;
  countryCode: string;
  /** ISO 4217 currency. Prefer this over inferring currency from countryCode. */
  currency?: string;
  /** Operations this payment method is enabled for, e.g. DEPOSIT, WITHDRAW. */
  capabilities?: string[];
  status?: PaymentMethodStatus;
  /** Present for account-shaped channels (BANK_ACCOUNT, MOBILE_MONEY, SWIFT, etc.). */
  accountName?: string;
  accountNumber?: string;
  /** Bank routing number, present for channels that carry one (e.g. ACH). */
  routingNumber?: string;
  /** Last 4 digits of the card. CARD channel only. */
  last4?: string;
  /** Card brand. CARD channel only. */
  brand?: CardBrand;
  /** Card expiration. CARD channel only. */
  expiration?: CardExpiration;
  /** Name on the card. CARD channel only. */
  cardName?: string;
  /** Minutes until a dynamic virtual account expires, when applicable. */
  expiresInMinutes?: number;
  /** Requested amount for a dynamic virtual account, when applicable. */
  amount?: number;
  /** Additional channel-specific properties. */
  extra?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface CreatePaymentMethodRequest {
  channel: CreatablePaymentChannel;
  /**
   *The capability of this payment method. `DEPOSIT` means funds can be pulled from this method (e.g. charge/collect from the customer). `WITHDRAW` means funds can be sent to this method (e.g. pay out to the customer). If omitted, defaults to `WITHDRAW`.
   */
  type?: "WITHDRAW" | "DEPOSIT";
  customerId: string;
  accountName: string;
  accountNumber: string;
  countryCode: string;
  institution: PaymentMethodInstitution;
  recipient?: PaymentMethodRecipient;
  transaction?: PaymentMethodTransaction;
}

export interface ListPaymentMethodsParams {
  page?: number;
  limit?: number;
  /** Filter by one or more payment channels. */
  channel?: PaymentChannel | PaymentChannel[];
  /** Filter by one or more 3-letter ISO 4217 currency codes. */
  currencies?: string | string[];
  /** Filter by capability. Only WITHDRAW is currently supported. Defaults to WITHDRAW. */
  capabilities?: string | string[];
  /** Filter by one or more statuses. Defaults to active,pending. */
  status?: PaymentMethodStatus | PaymentMethodStatus[];
}

export interface PaymentMethodListResponse {
  data: PaymentMethod[];
  page: number;
  total: number;
}

export interface Institution {
  /**
   * Unique identifier of the bank or mobile money provider, "if required".
   * Documented as optional and rarely populated — sandbox returns it for no
   * channel or country. Match institutions on `institutionCode`.
   */
  institutionId?: string;
  institutionName: string;
  institutionCode: string;
  institutionAddress?: string;
  /** Branch name. Returned for bank listings; an empty string when unknown. */
  institutionBranch?: string;
  /** Mandatory for USD (SWIFT) payout payment methods. */
  correspondentBankName?: string;
  /** Mandatory for USD (SWIFT) payout payment methods. */
  correspondentBankAccountNumber?: string;
}

/** Response envelope for GET /payment-method/institution. */
export interface InstitutionListResponse {
  data: Institution[];
  total: number;
  page: number;
}

/** Account details resolved from an account number. */
export interface ResolvedAccount {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientName?: string;
  /** The institution the account resolved to. */
  institutionName?: string;
  institutionCode?: string;
}

/** Response envelope for GET /payment-method/resolve. */
export interface ResolveAccountResponse {
  data: ResolvedAccount;
}

/** The institution a bank code resolves to. */
export interface InstitutionCode {
  bankName: string;
}

/**
 * Response envelope for GET /payment-method/institution/codes.
 * `data` is `null` when the code does not resolve — the envelope is always present.
 */
export interface InstitutionCodesResponse {
  data: InstitutionCode | null;
}

/** Channels accepted by GET /payment-method/institution. */
export type InstitutionListChannel =
  | "BANK_ACCOUNT"
  | "SWIFT"
  | "MOBILE_MONEY"
  | "UPI"
  | "INTERAC"
  | "WE_CHAT";

export interface GetInstitutionsParams {
  channel: InstitutionListChannel;
  countryCode: string;
}

export interface ResolveAccountParams {
  channel: "MOBILE_MONEY" | "BANK_ACCOUNT";
  accountNumber: string;
  institutionCode?: string;
  countryCode: string;
}
export interface InstitutionCodesParams {
  searchTerm: string;
  /**
   * ISO country code of the institution. Defaults to US. `routing_number`
   * lookups are only supported for US; all other countries use `swift_code`.
   */
  country: string;
  codeType: "swift_code" | "routing_number";
}
/** A deposit address on one network. */
export interface CryptoWallet {
  address: string;
  network: string;
}

/**
 * A crypto wallet: a single wallet record carrying one address per supported
 * network (e.g. ETHEREUM_MAINNET, POLYGON_MAINNET, SOLANA_MAINNET, TRON_MAINNET).
 */
export interface CryptoWalletData {
  id: string;
  addresses: CryptoWallet[];
}

/** Response envelope for GET /payment-method/crypto-wallet. */
export interface CryptoWalletResponse {
  data: CryptoWalletData;
}

export interface GetCryptoWalletParams {
  asset: "USDT" | "USDC";
  customerId?: string;
}

/**
 * Parameters for listing existing virtual accounts
 * GET /payment-method/virtual-account
 */
export interface ListVirtualAccountsParams {
  /** The 3-letter ISO 4217 currency code */
  currency: string;
  /** Optional customer ID. If not provided, lists business virtual accounts. */
  customerId?: string;
  /** Optional transaction reference */
  reference?: string;
}

/**
 * Parameters for creating a new virtual account
 * POST /payment-method/virtual-account
 */
export interface CreateVirtualAccountParams {
  /** The 3-letter ISO 4217 currency code */
  currency: string;
  /** Optional customer ID. If not provided, creates for the business. */
  customerId?: string;
  /** Optional ISO 3166-1 alpha-2 country code e.g US */
  country?: string;
  /** Label for static virtual accounts (e.g., 'SALES', 'OPERATIONS'). Can not be used with amount. */
  label?: string;
  /** Amount for dynamic virtual accounts. Can not be used with label. */
  amount?: number;
  /** Optional transaction reference */
  reference?: string;
}

/**
 * Response for virtual account list endpoints
 */
export interface VirtualAccountListResponse {
  data: PaymentMethod[];
  page: number;
  total: number;
}

export interface PoolAccountResponse {
  data: PaymentMethod;
}

/**
 * Parameters for listing pool accounts
 * GET /payment-method/pool-account
 */
export interface ListPoolAccountsParams {
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Optional customer ID. If not provided, returns the business pool account. */
  customerId?: string;
}

import type { ToolRegistry } from "../create-server.js";
import { registerBalanceTools } from "./balance.js";
import { registerCustomerTools } from "./customers.js";
import { registerTransactionTools } from "./transactions.js";
import { registerPaymentMethodTools } from "./payment-methods.js";
import { registerRateTools } from "./rates.js";
import { registerCheckoutTools } from "./checkout.js";
import { registerWebhookTools } from "./webhooks.js";

export type { ToolRegistry } from "../create-server.js";

export function registerAllTools(registry: ToolRegistry): void {
  registerBalanceTools(registry);
  registerCustomerTools(registry);
  registerTransactionTools(registry);
  registerPaymentMethodTools(registry);
  registerRateTools(registry);
  registerCheckoutTools(registry);
  registerWebhookTools(registry);
}

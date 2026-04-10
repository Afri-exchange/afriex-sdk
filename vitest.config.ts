import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@afriex/core": path.resolve("./packages/core/src/index.ts"),
      "@afriex/customers": path.resolve("./packages/customers/src/index.ts"),
      "@afriex/transactions": path.resolve(
        "./packages/transactions/src/index.ts"
      ),
      "@afriex/payment-methods": path.resolve(
        "./packages/payment-methods/src/index.ts"
      ),
      "@afriex/balance": path.resolve("./packages/balance/src/index.ts"),
      "@afriex/rates": path.resolve("./packages/rates/src/index.ts"),
      "@afriex/webhooks": path.resolve("./packages/webhooks/src/index.ts"),
      "@afriex/sdk": path.resolve("./packages/sdk/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/src/**/__tests__/**/*.test.ts"],
  },
});

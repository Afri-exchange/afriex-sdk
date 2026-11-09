# This repository has moved

**The Afriex TypeScript SDK now lives in the [Afriex docs repository](https://github.com/Afri-exchange/docs/tree/main/sdks/typescript),** next to the API reference it is generated from. This repository is archived and no longer receives changes.

- **Use `@afriex/sdk` 6 or later.** It is one package with no runtime dependencies, generated from the [OpenAPI spec](https://docs.afriex.com/api-reference/introduction), and released when the API changes.

  ```bash
  npm install @afriex/sdk@latest
  ```

- **Upgrading from 5.x:** see [Upgrading from version 5](https://docs.afriex.com/sdk/introduction#upgrading-from-version-5) and the [SDK changelog](https://github.com/Afri-exchange/docs/blob/main/sdks/typescript/CHANGELOG.md).
- **The per-resource packages** (`@afriex/core`, `@afriex/customers`, `@afriex/transactions`, `@afriex/payment-methods`, `@afriex/payment-batches`, `@afriex/balance`, `@afriex/rates`, `@afriex/checkout`, `@afriex/media`, `@afriex/sme-registration` and `@afriex/webhooks`) are deprecated. Everything they did is in `@afriex/sdk`.
- **Documentation:** [docs.afriex.com/sdk](https://docs.afriex.com/sdk/introduction).
- **Issues:** open them in [Afri-exchange/docs](https://github.com/Afri-exchange/docs/issues).

The code for `@afriex/sdk` 5.x and earlier stays here for reference. The hosted MCP server (`packages/mcp-server`, deployed as mcp.afriex.com) is still built from this repository until it gets a new home.

The SDK started as a hackathon project by the Afriex DevRel team. Thank you to everyone who built it.

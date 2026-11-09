# This repository is no longer maintained

**The Afriex TypeScript SDK is now generated from the API reference and documented at [docs.afriex.com/sdk](https://docs.afriex.com/sdk/introduction).** This repository is archived and no longer receives changes.

- **Use `@afriex/sdk` 6 or later.** It is one package with no runtime dependencies, generated from the [API reference](https://docs.afriex.com/api-reference/introduction), and a new version is released when the API changes.

  ```bash
  npm install @afriex/sdk@latest
  ```

- **Upgrading from 5.x:** see [Upgrading from version 5](https://docs.afriex.com/sdk/introduction#upgrading-from-version-5). New releases are listed in the [changelog](https://docs.afriex.com/changelog).
- **The per-resource packages** (`@afriex/core`, `@afriex/customers`, `@afriex/transactions`, `@afriex/payment-methods`, `@afriex/payment-batches`, `@afriex/balance`, `@afriex/rates`, `@afriex/checkout`, `@afriex/media`, `@afriex/sme-registration` and `@afriex/webhooks`) are deprecated. Everything they did is in `@afriex/sdk`.
- **Support:** email [support@afriex.com](mailto:support@afriex.com).

The code for `@afriex/sdk` 5.x and earlier stays here for reference. The hosted MCP server (`packages/mcp-server`, deployed as mcp.afriex.com) is still built from this repository until it gets a new home.

The SDK started as a hackathon project by the Afriex DevRel team. Thank you to everyone who built it.

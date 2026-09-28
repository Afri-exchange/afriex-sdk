---
"@afriex/mcp-server": minor
---

Bring the MCP server in line with the SDK and the API.

**Fixed**

- Tool results are no longer rejected when the API returns a field the output schema does not list. Every tool passed its schema's `.shape`, which dropped the setting that allows extra fields. A client that validates structured output, as the official MCP client does, then refused the result: `afriex_create_customer` failed this way once the API began returning `reference`, after the customer had been created.
- `page` accepts `0`. Pages are zero-based, so the first page could not be requested. `limit` is capped at `100`, the most the API returns.
- `afriex_create_transaction` takes `sourceAmount` or `destinationAmount`, as a string or a number. It required `sourceAmount` and refused numbers.
- `afriex_get_crypto_wallet` no longer requires `customerId`. Without it, the wallet is the business's own.
- `meta.invoice` is described as the key of an uploaded file, not a Base64 document.
- The status and channel lists in `afriex_list_transactions` match the API: `RFI_REQUESTED` and eight channels were missing.

**Added**

- 21 tools for the endpoints the SDK gained: pool-account payment proofs, settlement advices, the two sandbox simulations, upload URLs, payment batches and SME registration. The server now has 51.
- `afriex_create_transaction` accepts `meta.settlement`, `correspondentBankName` and `correspondentBankAccountNumber`.
- `afriex_list_virtual_accounts` accepts `country` and `amount`.
- A failed tool call says why: an API error carries its status and error code, and a validation error names each field.

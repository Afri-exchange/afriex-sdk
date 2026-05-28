# Integration Tests

This directory contains integration tests that make real API calls to the Afriex sandbox environment.

## Prerequisites

1. **Get Sandbox API Key**

   - Sign up at [Afriex Sandbox](https://sandbox.afriex.com)
   - Generate an API key from your dashboard

2. **Set Environment Variable**

   ```bash
   export AFRIEX_SANDBOX_API_KEY=your-sandbox-api-key-here
   ```

   Or create a `.env` file in the project root:

   ```env
   AFRIEX_SANDBOX_API_KEY=your-sandbox-api-key-here
   ```

## Running Integration Tests

### Run all integration tests:

```bash
pnpm test:integration
```

### Run with explicit API key:

```bash
AFRIEX_SANDBOX_API_KEY=your-key pnpm test:integration
```

### Run only unit tests (skip integration):

```bash
pnpm test:unit
```

### Run all tests (unit + integration):

```bash
pnpm test
```

## What the Tests Do

The integration tests:

1. **Create real resources** in the sandbox environment:

   - Customers
   - Payment methods
   - Transactions
   - Balance top-ups

2. **Verify API responses** match expected schemas

3. **Clean up** created resources after tests complete

## Important Notes

- ⚠️ Integration tests make **real API calls** to Afriex sandbox
- 💰 They may affect your **sandbox balance**
- ⏱️ Tests are slower than unit tests (network latency)
- 🔑 Never commit API keys to version control
- 🧹 Tests attempt to clean up resources, but may leave orphaned data if interrupted

## Test Coverage

Integration tests cover:

- ✅ Balance Service (get balance, top up sandbox)
- ✅ Rates Service (get rates, convert)
- ✅ Customer Service (CRUD operations, KYC updates)
- ✅ Payment Method Service (CRUD operations, institutions)
- ✅ Transaction Service (create, list)

## Debugging

Enable detailed logging:

```typescript
const sdk = new AfriexSDK({
  apiKey: API_KEY,
  environment: Environment.STAGING,
  enableLogging: true,
  logLevel: LogLevel.DEBUG,
});
```

## Troubleshooting

**Tests skipped?**

- Ensure `AFRIEX_SANDBOX_API_KEY` is set
- Check the key is valid in sandbox environment

**Tests failing?**

- Verify sandbox API is accessible
- Check your sandbox balance is sufficient
- Review error logs for specific issues

**Cleanup failed?**

- Manually delete test resources in sandbox dashboard
- Look for resources with `testRun: "integration-test"` in metadata

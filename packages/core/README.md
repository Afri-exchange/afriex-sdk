# @afriex/core

Core functionality for the Afriex SDK including HTTP client, configuration, and error handling.

## Installation

```bash
npm install @afriex/core
# or
pnpm add @afriex/core
```

## Usage

This package provides the base client and utilities used by other Afriex SDK packages.

```typescript
import { AfriexClient, Environment } from '@afriex/core';

const client = new AfriexClient({
    apiKey: 'your-api-key',
    environment: Environment.STAGING // or Environment.PRODUCTION (default)
});

// Access the HTTP client for requests
const httpClient = client.getHttpClient();

// Access configuration
const config = client.getConfig();
```

## Configuration Options

| Option          | Type                         | Required | Description                              |
| --------------- | ---------------------------- | -------- | ---------------------------------------- |
| `apiKey`        | `string`                     | Yes      | Your Afriex API key                      |
| `environment`   | `Environment`                | No       | API environment (default: `PRODUCTION`)  |
| `customConfig`  | `Partial<EnvironmentConfig>` | No       | Override default base URL, timeout, etc. |
| `logLevel`      | `LogLevel`                   | No       | Logging level (default: `ERROR`)         |
| `enableLogging` | `boolean`                    | No       | Enable/disable logging (default: `true`) |
| `retryConfig`   | `RetryConfig`                | No       | Custom retry configuration               |
| `webhookSecret` | `string`                     | No       | Secret for webhook verification          |

### Environment Values

```typescript
enum Environment {
    STAGING = 'staging',
    PRODUCTION = 'production'
}
```

### RetryConfig Options

```typescript
interface RetryConfig {
    maxRetries: number;        // Number of retry attempts
    retryDelay: number;        // Delay between retries (ms)
    retryableStatusCodes: number[]; // HTTP codes to retry
}
```

## Exports

- `AfriexClient` - Base client class
- `HttpClient` - HTTP client for API requests
- `Config` - Configuration class
- `AfriexConfig` - Configuration interface
- `Environment` - Environment enum
- `ValidationError` - Validation error class
- `AfriexError` - Base error class
- `ApiError` - API error class
- `NetworkError` - Network error class
- `RateLimitError` - Rate limit error class

## License

MIT

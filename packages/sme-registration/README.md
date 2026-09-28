# @afriex/sme-registration

SME registration service for the Afriex SDK. Register your business as its own SME in Kenya, so that dedicated KES virtual accounts are issued under your legal entity.

You need this only to collect KES through dedicated virtual accounts. No other corridor requires it.

## Installation

```bash
npm install @afriex/sme-registration @afriex/core
# or
pnpm add @afriex/sme-registration @afriex/core
```

## Usage

The registration has three steps, called in order.

```typescript
import { AfriexClient } from "@afriex/core";
import { SmeRegistrationService } from "@afriex/sme-registration";

const client = new AfriexClient({
  apiKey: "your-api-key",
});

const smeRegistration = new SmeRegistrationService(client.getHttpClient());

// 1. Start the registration. A one-time passcode is sent to the mobile number.
const started = await smeRegistration.initiate({
  mobile: "+254712345678",
  email: "admin@company.co.ke",
  businessType: 2,
});

// 2. Confirm the passcode
const confirmed = await smeRegistration.confirmOtp({
  onboardingRequestId: started.onboardingRequestId,
  otp: "483921",
});

console.log(confirmed.status, confirmed.nextStep, confirmed.expiresAt);

// 3. Submit the company details, directors and documents, then poll the status
const status = await smeRegistration.getStatus();

console.log(status.status, status.reviewStatus);
```

## API Reference

### `initiate(data: InitiateSmeRegistrationData): Promise<SmeRegistration>`

Start a registration and send the one-time passcode.

**Endpoint:** `POST /sme-registration` with step `INITIATE`

**Required:** `mobile`, `email`, `businessType`

`businessType` must be `2`. Only Limited Liability Companies are supported.

### `confirmOtp(data: ConfirmSmeRegistrationOtpData): Promise<SmeRegistration>`

Confirm the passcode sent to the mobile number.

**Endpoint:** `POST /sme-registration` with step `CONFIRM_OTP`

**Required:** `onboardingRequestId`, `otp`

### `submit(data: SubmitSmeRegistrationData): Promise<SmeRegistration>`

Submit the company details, directors and documents.

**Endpoint:** `POST /sme-registration` with step `SUBMIT`

**Required:** `directors`, with at least one director

**Optional:** `organizationShareholders`, `media`

The API reference names these three lists and does not list the company detail fields, so `submit()` sends the object you pass as it is. Upload every document with `@afriex/media` first and pass the returned `key` in the field that asks for the file.

### `getStatus(): Promise<SmeRegistrationStatusResult>`

Get the most recent registration of the business.

**Endpoint:** `GET /sme-registration/status`

**Returns:** `{ onboardingRequestId, status, reviewStatus?, rejectReasons?, isReviewStatusStale? }`. `onboardingRequestId` and `status` are `null` when the business has never registered.

## Status values

`status` follows the steps:

| Status            | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `OTP_PENDING`     | `initiate()` was called. Confirm the passcode |
| `DETAILS_PENDING` | The passcode was confirmed. Submit the details |
| `SUBMITTED`       | The details were submitted                    |
| `REJECTED`        | The registration was rejected                 |
| `EXPIRED`         | A step was not completed before `expiresAt`   |

`reviewStatus` appears once the registration is submitted: `SUBMITTED`, `PROCESSING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `CLOSED` or `UNKNOWN`. Dedicated KES virtual accounts are issued only once it is `APPROVED`. Treat `UNKNOWN` as still in review.

## Mobile numbers

Every mobile number, the applicant's and each director's, must be Kenyan. The API accepts `+254712345678`, `254712345678`, `0712345678` and `712345678`, and rejects a number from another country with `422`.

## Key permissions

`initiate()`, `confirmOtp()` and `submit()` need the `COMPLIANCE.KYB.SUBMIT` permission, and `getStatus()` needs `COMPLIANCE.KYB.READ`. A key without the permission is answered with `401`.

## License

MIT

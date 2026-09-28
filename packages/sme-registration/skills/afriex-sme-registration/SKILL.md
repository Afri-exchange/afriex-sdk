---
name: afriex-sme-registration
description: >
  Register a business as its own SME in Kenya with @afriex/sme-registration
  SmeRegistrationService — initiate, confirmOtp and submit for the three steps,
  getStatus for the review outcome. Covers the step order, businessType 2,
  Kenyan mobile numbers, status versus reviewStatus, expiresAt, and uploading
  documents before submit. Load when issuing dedicated KES virtual accounts
  under the business's own legal entity.
metadata:
  type: core
  library: '@afriex/sme-registration'
  library_version: '1.0.0'
sources:
  - 'Afri-exchange/afriex-sdk:packages/sme-registration/src/SmeRegistrationService.ts'
  - 'Afri-exchange/afriex-sdk:packages/sme-registration/src/types.ts'
---

# Afriex SME Registration

`SmeRegistrationService` registers the business as its own SME in Kenya, so
that dedicated KES virtual accounts are issued under its legal entity. No other
corridor needs it.

The registration is one endpoint with three steps, called in order:
`initiate`, `confirmOtp`, then `submit`.

## Setup

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const started = await afriex.smeRegistration.initiate({
  mobile: "+254712345678",
  email: "admin@company.co.ke",
  businessType: 2,
});

console.log(started.onboardingRequestId, started.nextStep, started.expiresAt);
```

`initiate` sends a one-time passcode to `mobile`. The API key needs the
`COMPLIANCE.KYB.SUBMIT` permission for the three steps and
`COMPLIANCE.KYB.READ` for `getStatus`.

## Core Patterns

### Confirm the passcode

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

export async function confirm(onboardingRequestId: string, otp: string) {
  const registration = await afriex.smeRegistration.confirmOtp({
    onboardingRequestId,
    otp,
  });
  return registration.status === "DETAILS_PENDING";
}
```

### Wait for the review outcome

```ts
import { AfriexSDK, Environment } from "@afriex/sdk";

const afriex = new AfriexSDK({
  apiKey: process.env.AFRIEX_API_KEY!,
  environment: Environment.STAGING,
});

const registration = await afriex.smeRegistration.getStatus();

if (registration.status === null) {
  console.log("the business has never registered");
} else if (registration.reviewStatus === "APPROVED") {
  console.log("KES virtual accounts can be issued");
} else if (registration.reviewStatus === "REJECTED") {
  console.log("rejected:", registration.rejectReasons);
} else {
  console.log("still in review:", registration.reviewStatus);
}
```

`reviewStatus` is present only once the registration is submitted. When
`isReviewStatusStale` is `true`, it is the last known outcome, not a fresh one.

## Common Mistakes

### HIGH Calling the steps out of order

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function register(directors: Array<Record<string, unknown>>) {
  await afriex.smeRegistration.initiate({
    mobile: "+254712345678",
    email: "admin@company.co.ke",
    businessType: 2,
  });
  return afriex.smeRegistration.submit({ directors });
}
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

export async function start() {
  return afriex.smeRegistration.initiate({
    mobile: "+254712345678",
    email: "admin@company.co.ke",
    businessType: 2,
  });
}

export async function finish(
  onboardingRequestId: string,
  otp: string,
  directors: Array<Record<string, unknown>>
) {
  const confirmed = await afriex.smeRegistration.confirmOtp({
    onboardingRequestId,
    otp,
  });
  if (confirmed.nextStep !== "SUBMIT") {
    throw new Error(`cannot submit while ${confirmed.status}`);
  }
  return afriex.smeRegistration.submit({ directors });
}
```

The passcode reaches a person's phone, so the flow cannot run in one function:
it pauses after `initiate` until the passcode is typed in. A step called out of
order, or after `expiresAt`, is answered with `400`.

Source: packages/sme-registration/src/SmeRegistrationService.ts

### HIGH Reading status as the review outcome

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const registration = await afriex.smeRegistration.getStatus();
const approved = registration.status === "SUBMITTED";
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

const registration = await afriex.smeRegistration.getStatus();
const approved = registration.reviewStatus === "APPROVED";
```

`status` says how far the steps have got: `SUBMITTED` means the details were
received, not that they were accepted. The decision is `reviewStatus`, and KES
virtual accounts are issued only once it is `APPROVED`.

Source: packages/sme-registration/src/types.ts (`SmeRegistrationStatusResult`)

### MEDIUM Sending a mobile number from another country

Wrong:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.smeRegistration.initiate({
  mobile: "+2348012345678",
  email: "admin@company.co.ke",
  businessType: 2,
});
```

Correct:

```ts
import { AfriexSDK } from "@afriex/sdk";

const afriex = new AfriexSDK({ apiKey: process.env.AFRIEX_API_KEY! });

await afriex.smeRegistration.initiate({
  mobile: "+254712345678",
  email: "admin@company.co.ke",
  businessType: 2,
});
```

Every mobile number, the applicant's and each director's, must be Kenyan. The
forms `+254712345678`, `254712345678`, `0712345678` and `712345678` are all
accepted; any other country is answered with `422`.

Source: packages/sme-registration/src/types.ts (`InitiateSmeRegistrationData`)

See also: afriex-media/SKILL.md — uploading the documents that `submit` takes.

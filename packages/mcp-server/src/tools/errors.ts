import { ApiError, ValidationError } from "@afriex/sdk";

/**
 * Describes a failed tool call for the assistant that made it: the status and
 * error code of an API error, or the fields a validation error names. The
 * plain message of either leaves out what the caller needs to act on it.
 */
export function describeError(error: unknown): string {
  if (error instanceof ValidationError && error.fields.length > 0) {
    const fields = error.fields
      .map((field) => `${field.field}: ${field.message}`)
      .join("; ");
    return `ValidationError: ${fields}`;
  }

  if (error instanceof ApiError) {
    const code = error.errorCode ? ` ${error.errorCode}` : "";
    return `ApiError ${error.statusCode}${code}: ${error.message}`;
  }

  return String(error);
}

import { ValidationError } from "../errors/ValidationError.js";

/**
 * Builder for constructing validation errors
 * Provides a fluent API for field validation
 */
export class ValidationBuilder {
  private errors: Array<{ field: string; message: string }> = [];

  /**
   * Validates that a field is required (not null, undefined, or empty string)
   * @param field - The field name
   * @param value - The value to check
   * @param message - Optional custom error message
   * @returns This builder for chaining
   */
  required(field: string, value: unknown, message?: string): this {
    if (value === null || value === undefined || value === "") {
      this.errors.push({
        field,
        message: message ?? `${field} is required`,
      });
    }
    return this;
  }

  /**
   * Validates a custom condition
   * @param field - The field name
   * @param condition - If true, adds an error
   * @param message - The error message
   * @returns This builder for chaining
   */
  condition(field: string, condition: boolean, message: string): this {
    if (condition) {
      this.errors.push({ field, message });
    }
    return this;
  }

  /**
   * Validates that two fields are mutually exclusive
   * @param field1 - First field name
   * @param value1 - First field value
   * @param field2 - Second field name
   * @param value2 - Second field value
   * @param message - Optional custom error message
   * @returns This builder for chaining
   */
  mutuallyExclusive(
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    message?: string
  ): this {
    const hasValue1 = value1 !== null && value1 !== undefined && value1 !== "";
    const hasValue2 = value2 !== null && value2 !== undefined && value2 !== "";

    if (hasValue1 && hasValue2) {
      this.errors.push({
        field: field1,
        message: message ?? `${field1} and ${field2} can not be used together`,
      });
    }
    return this;
  }

  /**
   * Validates that at least one of the fields is provided
   * @param fields - Array of [fieldName, value] tuples
   * @param message - Optional custom error message
   * @returns This builder for chaining
   */
  requireOneOf(fields: Array<[string, unknown]>, message?: string): this {
    const hasAny = fields.some(
      ([, value]) => value !== null && value !== undefined && value !== ""
    );

    if (!hasAny) {
      const fieldNames = fields.map(([name]) => name).join(", ");
      this.errors.push({
        field: fields[0][0],
        message:
          message ?? `At least one of the following is required: ${fieldNames}`,
      });
    }
    return this;
  }

  /**
   * Validates a number is positive
   * @param field - The field name
   * @param value - The number to check
   * @param message - Optional custom error message
   * @returns This builder for chaining
   */
  positive(field: string, value: number | undefined, message?: string): this {
    if (value !== undefined && value <= 0) {
      this.errors.push({
        field,
        message: message ?? `${field} must be a positive number`,
      });
    }
    return this;
  }

  /**
   * Throws a ValidationError if any errors were collected
   * @throws ValidationError with all collected errors
   */
  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      throw new ValidationError("Validation failed", this.errors);
    }
  }

  /**
   * Returns true if there are validation errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Gets all collected errors
   */
  getErrors(): Array<{ field: string; message: string }> {
    return [...this.errors];
  }
}

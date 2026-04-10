import { AfriexError } from "./AfriexError.js";

export interface ValidationErrorField {
  field: string;
  message: string;
  code?: string;
}

export class ValidationError extends AfriexError {
  public readonly fields: ValidationErrorField[];

  constructor(message: string, fields: ValidationErrorField[] = []) {
    super(message);
    this.fields = fields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

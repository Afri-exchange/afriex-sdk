import { describe, it, expect } from "vitest";
import { ValidationBuilder } from "../ValidationBuilder.js";
import { ValidationError } from "../../errors/ValidationError.js";

describe("ValidationBuilder", () => {
  describe("required", () => {
    it("should add error when value is undefined", () => {
      const builder = new ValidationBuilder();
      builder.required("name", undefined);

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()).toHaveLength(1);
      expect(builder.getErrors()[0]).toEqual({
        field: "name",
        message: "name is required",
      });
    });

    it("should add error when value is null", () => {
      const builder = new ValidationBuilder();
      builder.required("name", null);

      expect(builder.hasErrors()).toBe(true);
    });

    it("should add error when value is empty string", () => {
      const builder = new ValidationBuilder();
      builder.required("name", "");

      expect(builder.hasErrors()).toBe(true);
    });

    it("should not add error when value is provided", () => {
      const builder = new ValidationBuilder();
      builder.required("name", "John Doe");

      expect(builder.hasErrors()).toBe(false);
    });

    it("should support custom error message", () => {
      const builder = new ValidationBuilder();
      builder.required("email", undefined, "Email address is required");

      expect(builder.getErrors()[0].message).toBe("Email address is required");
    });
  });

  describe("condition", () => {
    it("should add error when condition is true", () => {
      const builder = new ValidationBuilder();
      builder.condition("age", true, "Age must be 18 or older");

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()[0]).toEqual({
        field: "age",
        message: "Age must be 18 or older",
      });
    });

    it("should not add error when condition is false", () => {
      const builder = new ValidationBuilder();
      builder.condition("age", false, "Age must be 18 or older");

      expect(builder.hasErrors()).toBe(false);
    });
  });

  describe("mutuallyExclusive", () => {
    it("should add error when both values are provided", () => {
      const builder = new ValidationBuilder();
      builder.mutuallyExclusive("label", "SALES", "amount", 100);

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()[0]).toEqual({
        field: "label",
        message: "label and amount are mutually exclusive",
      });
    });

    it("should not add error when only first value is provided", () => {
      const builder = new ValidationBuilder();
      builder.mutuallyExclusive("label", "SALES", "amount", undefined);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should not add error when only second value is provided", () => {
      const builder = new ValidationBuilder();
      builder.mutuallyExclusive("label", undefined, "amount", 100);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should not add error when neither value is provided", () => {
      const builder = new ValidationBuilder();
      builder.mutuallyExclusive("label", undefined, "amount", undefined);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should support custom error message", () => {
      const builder = new ValidationBuilder();
      builder.mutuallyExclusive(
        "label",
        "SALES",
        "amount",
        100,
        "Cannot specify both label and amount"
      );

      expect(builder.getErrors()[0].message).toBe(
        "Cannot specify both label and amount"
      );
    });
  });

  describe("requireOneOf", () => {
    it("should add error when none of the fields are provided", () => {
      const builder = new ValidationBuilder();
      builder.requireOneOf([
        ["email", undefined],
        ["phone", undefined],
      ]);

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()[0]).toEqual({
        field: "email",
        message: "At least one of the following is required: email, phone",
      });
    });

    it("should not add error when at least one field is provided", () => {
      const builder = new ValidationBuilder();
      builder.requireOneOf([
        ["email", "test@example.com"],
        ["phone", undefined],
      ]);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should support custom error message", () => {
      const builder = new ValidationBuilder();
      builder.requireOneOf(
        [
          ["email", undefined],
          ["phone", undefined],
        ],
        "Provide either email or phone"
      );

      expect(builder.getErrors()[0].message).toBe(
        "Provide either email or phone"
      );
    });
  });

  describe("positive", () => {
    it("should add error when value is zero", () => {
      const builder = new ValidationBuilder();
      builder.positive("amount", 0);

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()[0]).toEqual({
        field: "amount",
        message: "amount must be a positive number",
      });
    });

    it("should add error when value is negative", () => {
      const builder = new ValidationBuilder();
      builder.positive("amount", -10);

      expect(builder.hasErrors()).toBe(true);
    });

    it("should not add error when value is positive", () => {
      const builder = new ValidationBuilder();
      builder.positive("amount", 100);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should not add error when value is undefined", () => {
      const builder = new ValidationBuilder();
      builder.positive("amount", undefined);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should support custom error message", () => {
      const builder = new ValidationBuilder();
      builder.positive("amount", 0, "Amount must be greater than zero");

      expect(builder.getErrors()[0].message).toBe(
        "Amount must be greater than zero"
      );
    });
  });

  describe("throwIfInvalid", () => {
    it("should throw ValidationError when there are errors", () => {
      const builder = new ValidationBuilder();
      builder.required("name", undefined);

      expect(() => builder.throwIfInvalid()).toThrow(ValidationError);
    });

    it("should not throw when there are no errors", () => {
      const builder = new ValidationBuilder();
      builder.required("name", "John Doe");

      expect(() => builder.throwIfInvalid()).not.toThrow();
    });

    it("should include all errors in thrown exception", () => {
      const builder = new ValidationBuilder();
      builder.required("name", undefined);
      builder.required("email", undefined);

      try {
        builder.throwIfInvalid();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).fields).toHaveLength(2);
      }
    });
  });

  describe("chaining", () => {
    it("should support method chaining", () => {
      const builder = new ValidationBuilder();

      builder
        .required("name", "John")
        .required("email", "john@example.com")
        .condition("age", false, "Age must be 18 or older")
        .positive("amount", 100);

      expect(builder.hasErrors()).toBe(false);
    });

    it("should collect multiple errors through chaining", () => {
      const builder = new ValidationBuilder();

      builder
        .required("name", undefined)
        .required("email", undefined)
        .positive("amount", -10);

      expect(builder.hasErrors()).toBe(true);
      expect(builder.getErrors()).toHaveLength(3);
    });
  });
});

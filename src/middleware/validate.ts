import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Reusable validation middleware.
 * Takes a schema object where each key is a field name
 * and the value is a validation function that returns an error string or null.
 */
type ValidationRule = (value: any) => string | null;
type Schema = Record<string, ValidationRule>;

export const validate = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const error = rule(req.body[field]);
      if (error) {
        errors[field] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(
        new AppError(`Validation failed: ${JSON.stringify(errors)}`, 400),
      );
    }

    next();
  };
};

// --- Common reusable validators ---

export const isRequired = (fieldName: string): ValidationRule => {
  return (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return `${fieldName} is required`;
    }
    return null;
  };
};

export const isString = (fieldName: string): ValidationRule => {
  return (value) => {
    if (value !== undefined && typeof value !== "string") {
      return `${fieldName} must be a string`;
    }
    return null;
  };
};

export const isPositiveNumber = (fieldName: string): ValidationRule => {
  return (value) => {
    if (value === undefined) return null; // use isRequired for mandatory
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  };
};

export const isOneOf = (
  fieldName: string,
  options: string[],
): ValidationRule => {
  return (value) => {
    if (value !== undefined && !options.includes(value)) {
      return `${fieldName} must be one of: ${options.join(", ")}`;
    }
    return null;
  };
};

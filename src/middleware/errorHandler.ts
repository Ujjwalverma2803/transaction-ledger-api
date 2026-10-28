import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error | AppError | any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // 1. Our custom application errors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
    };
    return res.status(err.statusCode).json(response);
  }

  // 2. PostgreSQL unique constraint violation (e.g., duplicate reference_id)
  //    This is the DB-level safety net for idempotency.
  if (err.code === "23505") {
    const response: ApiResponse = {
      success: false,
      error:
        "Duplicate transaction. A transaction with this reference_id already exists for this account.",
    };
    return res.status(409).json(response);
  }

  // 3. PostgreSQL foreign key violation (e.g., account doesn't exist)
  if (err.code === "23503") {
    const response: ApiResponse = {
      success: false,
      error: "Referenced account does not exist.",
    };
    return res.status(400).json(response);
  }

  // 4. PostgreSQL check constraint violation (e.g., negative balance)
  if (err.code === "23514") {
    const response: ApiResponse = {
      success: false,
      error: "Transaction would result in an invalid account state.",
    };
    return res.status(400).json(response);
  }

  // 5. JSON parse errors (malformed request body)
  if (err.type === "entity.parse.failed") {
    const response: ApiResponse = {
      success: false,
      error: "Invalid JSON in request body.",
    };
    return res.status(400).json(response);
  }

  // 6. Unexpected errors — log details but don't expose internals to client
  console.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
  });

  const response: ApiResponse = {
    success: false,
    error: "Internal server error",
  };
  return res.status(500).json(response);
};

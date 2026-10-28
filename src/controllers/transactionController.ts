import { Request, Response, NextFunction } from "express";
import { transactionService } from "../services/transactionService";
import { AppError } from "../middleware/errorHandler";

export const transactionController = {
  async addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { account_id, type, amount, description, reference_id } = req.body;

      const result = await transactionService.addTransaction(
        account_id,
        type,
        amount,
        description,
        reference_id,
      );

      if (result.isDuplicate) {
        return res.status(200).json({
          success: true,
          data: result.transaction,
          message: "Transaction already exists (duplicate reference_id)",
        });
      }

      res.status(201).json({
        success: true,
        data: result.transaction,
        message: "Transaction created successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId;
      const { type } = req.query;

      if (typeof accountId !== "string") {
        throw new AppError("Invalid account ID", 400);
      }

      // Validate type filter if provided
      if (type && type !== "credit" && type !== "debit") {
        throw new AppError(
          'Invalid type filter. Must be "credit" or "debit"',
          400,
        );
      }

      const result = await transactionService.getTransactionHistory(
        accountId,
        type as "credit" | "debit" | null,
        req.query as Record<string, any>,
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
};

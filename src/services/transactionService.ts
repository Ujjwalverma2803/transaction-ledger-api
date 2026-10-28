import { pool } from "../config/database";
import { accountRepository } from "../repositories/accountRepository";
import { transactionRepository } from "../repositories/transactionRepository";
import { Transaction, PaginatedResponse } from "../types";
import { AppError } from "../middleware/errorHandler";
import {
  parsePagination,
  buildPaginationMeta,
  PaginationParams,
} from "../utils/pagination";

export const transactionService = {
  async addTransaction(
    accountId: string,
    type: "credit" | "debit",
    amount: number,
    description: string,
    referenceId: string,
  ): Promise<{ transaction: Transaction; isDuplicate: boolean }> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const account = await accountRepository.findByIdForUpdate(
        client,
        accountId,
      );

      if (!account) {
        throw new AppError("Account not found", 404);
      }

      const existingTransaction =
        await transactionRepository.findByAccountAndReference(
          client,
          accountId,
          referenceId,
        );

      if (existingTransaction) {
        await client.query("COMMIT");
        return { transaction: existingTransaction, isDuplicate: true };
      }

      if (type === "debit") {
        const currentBalance = parseFloat(account.balance.toString());
        if (currentBalance < amount) {
          throw new AppError(
            `Insufficient balance. Current balance: ${currentBalance}, attempted debit: ${amount}`,
            400,
          );
        }
      }

      const transaction = await transactionRepository.create(
        client,
        accountId,
        type,
        amount,
        description,
        referenceId,
      );

      await accountRepository.updateBalance(client, accountId, amount, type);
      await client.query("COMMIT");

      return { transaction, isDuplicate: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async getTransactionHistory(
    accountId: string,
    type: "credit" | "debit" | null,
    query: Record<string, any>,
  ): Promise<PaginatedResponse<Transaction>> {
    // Verify account exists
    const account = await accountRepository.findById(accountId);
    if (!account) {
      throw new AppError("Account not found", 404);
    }

    // Parse pagination
    const paginationParams: PaginationParams = parsePagination(query);
    const totalRecords = await transactionRepository.countByAccountId(
      accountId,
      type,
    );
    const { offset, meta } = buildPaginationMeta(
      paginationParams,
      totalRecords,
    );

    // Fetch transactions (already sorted by created_at DESC in repository)
    const transactions = await transactionRepository.findByAccountId(
      accountId,
      type,
      paginationParams.limit,
      offset,
    );

    return {
      data: transactions,
      pagination: meta,
    };
  },
};

import { accountRepository } from "../repositories/accountRepository";
import { Account } from "../types";
import { AppError } from "../middleware/errorHandler";

export const accountService = {
  async createAccount(name: string): Promise<Account> {
    // Business rule: name must not be empty (belt-and-suspenders with validation)
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AppError("Account name cannot be empty", 400);
    }

    const account = await accountRepository.create(trimmedName);
    return account;
  },

  async getAccountBalance(
    accountId: string,
  ): Promise<{ account_id: string; balance: number }> {
    const account = await accountRepository.findById(accountId);

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    return {
      account_id: account.id,
      balance: parseFloat(account.balance.toString()),
    };
  },
};

import { pool, PoolClient } from "../config/database";
import { Account } from "../types";

export const accountRepository = {
  async create(name: string): Promise<Account> {
    const query = `
      INSERT INTO accounts (name, balance)
      VALUES ($1, 0.00)
      RETURNING id, name, balance, created_at
    `;
    const result = await pool.query(query, [name]);
    return result.rows[0];
  },

  async findById(id: string): Promise<Account | null> {
    const query = `
      SELECT id, name, balance, created_at
      FROM accounts
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Locks the account row for the duration of a transaction.
   * Other queries trying to read this row with FOR UPDATE will WAIT.
   * This prevents race conditions on balance updates.
   */
  async findByIdForUpdate(
    client: PoolClient,
    id: string,
  ): Promise<Account | null> {
    const query = `
      SELECT id, name, balance, created_at
      FROM accounts
      WHERE id = $1
      FOR UPDATE
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Updates balance atomically within a DB transaction.
   * Uses SQL arithmetic so the update is based on the CURRENT DB value,
   * not a stale value read earlier in the application.
   */
  async updateBalance(
    client: PoolClient,
    accountId: string,
    amount: number,
    type: "credit" | "debit",
  ): Promise<Account> {
    const operation = type === "credit" ? "+" : "-";
    const query = `
      UPDATE accounts
      SET balance = balance ${operation} $1
      WHERE id = $2
      RETURNING id, name, balance, created_at
    `;
    const result = await client.query(query, [amount, accountId]);
    return result.rows[0];
  },
};

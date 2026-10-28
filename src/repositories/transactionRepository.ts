import { PoolClient } from "../config/database";
import { pool } from "../config/database";
import { Transaction } from "../types";

export const transactionRepository = {
  /**
   * Creates a transaction within an existing DB transaction (client).
   * The UNIQUE constraint on (account_id, reference_id) acts as a
   * final safety net against duplicates at the database level.
   */
  async create(
    client: PoolClient,
    accountId: string,
    type: "credit" | "debit",
    amount: number,
    description: string,
    referenceId: string,
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (account_id, type, amount, description, reference_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, account_id, type, amount, description, reference_id, created_at
    `;
    const result = await client.query(query, [
      accountId,
      type,
      amount,
      description,
      referenceId,
    ]);
    return result.rows[0];
  },

  /**
   * Checks if a transaction with this reference_id already exists
   * for the given account. Used for idempotency.
   */
  async findByAccountAndReference(
    client: PoolClient,
    accountId: string,
    referenceId: string,
  ): Promise<Transaction | null> {
    const query = `
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = $1 AND reference_id = $2
    `;
    const result = await client.query(query, [accountId, referenceId]);
    return result.rows[0] || null;
  },

  /**
   * Fetches transactions for an account with filtering, sorting, and pagination.
   * Sorting is always latest-first (created_at DESC) as per requirements.
   */
  async findByAccountId(
    accountId: string,
    type: "credit" | "debit" | null,
    limit: number,
    offset: number,
  ): Promise<Transaction[]> {
    let query = `
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = $1
    `;
    const params: any[] = [accountId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Counts total transactions for pagination metadata.
   */
  async countByAccountId(
    accountId: string,
    type: "credit" | "debit" | null,
  ): Promise<number> {
    let query = `SELECT COUNT(*) FROM transactions WHERE account_id = $1`;
    const params: any[] = [accountId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  },
};

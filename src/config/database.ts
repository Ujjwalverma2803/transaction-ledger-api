import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "ledger_db",
  user: process.env.DB_USER || "ledger_user",
  password: process.env.DB_PASSWORD || "ledger_password",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
});

// Re-export PoolClient so repositories can use it for transactions
export type { PoolClient };

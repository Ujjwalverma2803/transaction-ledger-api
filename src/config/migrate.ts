import { pool } from "./database";
import * as fs from "fs";
import * as path from "path";

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migrations...");

    const migrationsDir = path.join(__dirname, "../../migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Ensures 001 runs before 002, etc.

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`  📄 Executing: ${file}`);
      await client.query(sql);
    }

    console.log("✅ All migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

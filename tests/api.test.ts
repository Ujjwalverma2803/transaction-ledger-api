import request from "supertest";
import app from "../src/app";
import { pool } from "../src/config/database";

let accountId: string;

// =============================================
// SETUP & TEARDOWN
// =============================================
beforeAll(async () => {
  // Clean slate before tests
  await pool.query("DELETE FROM transactions");
  await pool.query("DELETE FROM accounts");
});

afterAll(async () => {
  // Clean up after all tests
  await pool.query("DELETE FROM transactions");
  await pool.query("DELETE FROM accounts");
  await pool.end();
});

// =============================================
// 1. ACCOUNT CREATION
// =============================================
describe("POST /api/accounts", () => {
  it("should create an account with zero balance", async () => {
    const res = await request(app)
      .post("/api/accounts")
      .send({ name: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Test User");
    expect(parseFloat(res.body.data.balance)).toBe(0);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();

    accountId = res.body.data.id;
  });

  it("should reject account creation without a name", async () => {
    const res = await request(app).post("/api/accounts").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should ignore client-provided balance", async () => {
    const res = await request(app)
      .post("/api/accounts")
      .send({ name: "Sneaky User", balance: 999999 });

    expect(res.status).toBe(201);
    expect(parseFloat(res.body.data.balance)).toBe(0);
  });
});

// =============================================
// 2. TRANSACTIONS
// =============================================
describe("POST /api/transactions", () => {
  it("should credit an account and increase balance", async () => {
    const res = await request(app).post("/api/transactions").send({
      account_id: accountId,
      type: "credit",
      amount: 100,
      description: "Initial deposit",
      reference_id: "test-ref-001",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe("credit");

    // Verify balance updated
    const balanceRes = await request(app).get(
      `/api/accounts/${accountId}/balance`,
    );

    expect(parseFloat(balanceRes.body.data.balance)).toBe(100);
  });

  it("should debit an account and decrease balance", async () => {
    const res = await request(app).post("/api/transactions").send({
      account_id: accountId,
      type: "debit",
      amount: 30,
      description: "Coffee",
      reference_id: "test-ref-002",
    });

    expect(res.status).toBe(201);

    const balanceRes = await request(app).get(
      `/api/accounts/${accountId}/balance`,
    );

    expect(parseFloat(balanceRes.body.data.balance)).toBe(70);
  });

  it("should reject debit with insufficient balance", async () => {
    const res = await request(app).post("/api/transactions").send({
      account_id: accountId,
      type: "debit",
      amount: 999,
      description: "Yacht",
      reference_id: "test-ref-003",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Insufficient balance");

    // Balance should be unchanged
    const balanceRes = await request(app).get(
      `/api/accounts/${accountId}/balance`,
    );

    expect(parseFloat(balanceRes.body.data.balance)).toBe(70);
  });

  it("should handle duplicate reference_id (idempotency)", async () => {
    const res = await request(app).post("/api/transactions").send({
      account_id: accountId,
      type: "credit",
      amount: 100,
      description: "Duplicate attempt",
      reference_id: "test-ref-001", // Same as first credit
    });

    expect(res.status).toBe(200); // Not 201
    expect(res.body.message).toContain("already exists");

    // Balance should NOT have changed
    const balanceRes = await request(app).get(
      `/api/accounts/${accountId}/balance`,
    );

    expect(parseFloat(balanceRes.body.data.balance)).toBe(70);
  });

  it("should allow same reference_id for different accounts", async () => {
    // Create a second account
    const accountRes = await request(app)
      .post("/api/accounts")
      .send({ name: "Second User" });

    const secondAccountId = accountRes.body.data.id;

    const res = await request(app).post("/api/transactions").send({
      account_id: secondAccountId,
      type: "credit",
      amount: 50,
      description: "Different account same ref",
      reference_id: "test-ref-001", // Same ref, different account
    });

    expect(res.status).toBe(201);
  });

  it("should reject transaction for non-existent account", async () => {
    const res = await request(app).post("/api/transactions").send({
      account_id: "00000000-0000-0000-0000-000000000000",
      type: "credit",
      amount: 50,
      description: "Ghost account",
      reference_id: "test-ref-ghost",
    });

    expect(res.status).toBe(404);
  });
});

// =============================================
// 3. BALANCE
// =============================================
describe("GET /api/accounts/:id/balance", () => {
  it("should return correct balance", async () => {
    const res = await request(app).get(`/api/accounts/${accountId}/balance`);

    expect(res.status).toBe(200);
    expect(res.body.data.account_id).toBe(accountId);
    expect(res.body.data.balance).toBeDefined();
  });

  it("should return 404 for non-existent account", async () => {
    const res = await request(app).get(
      "/api/accounts/00000000-0000-0000-0000-000000000000/balance",
    );

    expect(res.status).toBe(404);
  });
});

// =============================================
// 4. TRANSACTION HISTORY
// =============================================
describe("GET /api/transactions/account/:accountId", () => {
  it("should return all transactions sorted latest-first", async () => {
    const res = await request(app).get(
      `/api/transactions/account/${accountId}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // 1 credit + 1 debit (duplicate was rejected)
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total_records).toBe(2);

    // Verify latest-first ordering
    const dates = res.body.data.map((t: any) =>
      new Date(t.created_at).getTime(),
    );
    expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
  });

  it("should filter by type=credit", async () => {
    const res = await request(app).get(
      `/api/transactions/account/${accountId}?type=credit`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.type === "credit")).toBe(true);
  });

  it("should filter by type=debit", async () => {
    const res = await request(app).get(
      `/api/transactions/account/${accountId}?type=debit`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.type === "debit")).toBe(true);
  });

  it("should support pagination", async () => {
    const res = await request(app).get(
      `/api/transactions/account/${accountId}?page=1&limit=1`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.current_page).toBe(1);
    expect(res.body.pagination.page_size).toBe(1);
    expect(res.body.pagination.total_pages).toBe(2);
  });

  it("should reject invalid type filter", async () => {
    const res = await request(app).get(
      `/api/transactions/account/${accountId}?type=invalid`,
    );

    expect(res.status).toBe(400);
  });
});

// =============================================
// 5. IMMUTABILITY
// =============================================
describe("Transaction Immutability", () => {
  it("should reject PUT on transactions", async () => {
    const res = await request(app)
      .put("/api/transactions/some-id")
      .send({ amount: 999 });

    expect(res.status).toBe(405);
  });

  it("should reject DELETE on transactions", async () => {
    const res = await request(app).delete("/api/transactions/some-id");

    expect(res.status).toBe(405);
  });
});
 
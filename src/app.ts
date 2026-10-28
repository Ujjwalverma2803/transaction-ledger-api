import express from "express";
import cors from "cors";
import accountRoutes from "./routes/accountRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// --- Global Middleware ---
app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

// --- Global Error Handler (must be last) ---
app.use(errorHandler);

export default app;

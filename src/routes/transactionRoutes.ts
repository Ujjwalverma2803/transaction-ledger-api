import { Router, Request, Response } from "express";
import { transactionController } from "../controllers/transactionController";
import {
  validate,
  isRequired,
  isString,
  isPositiveNumber,
  isOneOf,
} from "../middleware/validate";

const router = Router();

// POST /api/transactions — Add a transaction
router.post(
  "/",
  validate({
    account_id: (v) => isRequired("account_id")(v) || isString("account_id")(v),
    type: (v) =>
      isRequired("type")(v) ||
      isString("type")(v) ||
      isOneOf("type", ["credit", "debit"])(v),
    amount: (v) => isRequired("amount")(v) || isPositiveNumber("amount")(v),
    description: (v) =>
      isRequired("description")(v) || isString("description")(v),
    reference_id: (v) =>
      isRequired("reference_id")(v) || isString("reference_id")(v),
  }),
  transactionController.addTransaction,
);

// GET /api/transactions/account/:accountId — Get transaction history
router.get("/account/:accountId", transactionController.getTransactionHistory);

// =============================================
// IMMUTABILITY ENFORCEMENT
// Transactions cannot be modified or deleted.
// These explicit handlers return 405 to make
// the design decision clear to API consumers.
// =============================================
const immutableHandler = (_req: Request, res: Response) => {
  res.status(405).json({
    success: false,
    error: "Transactions are immutable. They cannot be modified or deleted.",
  });
};

router.put("/:id", immutableHandler);
router.patch("/:id", immutableHandler);
router.delete("/:id", immutableHandler);

export default router;

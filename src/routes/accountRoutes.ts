import { Router } from "express";
import { accountController } from "../controllers/accountController";
import { validate, isRequired, isString } from "../middleware/validate";

const router = Router();

// POST /api/accounts — Create a new account
router.post(
  "/",
  validate({
    name: (value) => isRequired("name")(value) || isString("name")(value),
  }),
  accountController.createAccount,
);

// GET /api/accounts/:id/balance — Get account balance
router.get("/:id/balance", accountController.getBalance);

export default router;

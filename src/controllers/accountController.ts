import { Request, Response, NextFunction } from "express";
import { accountService } from "../services/accountService";

export const accountController = {
  async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      const account = await accountService.createAccount(name);

      res.status(201).json({
        success: true,
        data: account,
        message: "Account created successfully",
      });
    } catch (error) {
      next(error); // Passes to global error handler
    }
  },

  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
const id = req.params.id as string;
const balance = await accountService.getAccountBalance(id);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  },
};
 
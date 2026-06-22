import { Router } from "express";
import { createPayment } from "../controllers/paymentsController";

export const paymentRoutes = Router();

paymentRoutes.post("/", createPayment);

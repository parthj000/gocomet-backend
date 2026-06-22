import { z } from "zod";
import { paymentsService } from "../services/paymentsService";
import { asyncHandler } from "../utils/asyncHandler";

const paymentSchema = z.object({
  rideId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("USD")
});

export const createPayment = asyncHandler(async (req, res) => {
  const input = paymentSchema.parse(req.body);
  const payment = await paymentsService.createPayment(input);
  res.status(202).json({ paymentId: payment.id, status: payment.status });
});

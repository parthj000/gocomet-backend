import { prisma } from "../db/prisma";
import { paymentProcessingQueue } from "../queues";
import { HttpError } from "../utils/httpError";

type CreatePaymentInput = {
  rideId: string;
  amount: number;
  currency: string;
};

export const paymentsService = {
  async createPayment(input: CreatePaymentInput) {
    const ride = await prisma.ride.findUnique({ where: { id: input.rideId } });
    if (!ride) {
      throw new HttpError(404, "ride_not_found");
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { rideId: input.rideId },
    });

    if (existingPayment) {
      return existingPayment;
    }

    const payment = await prisma.payment.create({
      data: input,
    });

    await paymentProcessingQueue.add(
      "process-payment",
      { paymentId: payment.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return payment;
  },
};

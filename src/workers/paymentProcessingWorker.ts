import { PaymentStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { notificationQueue } from "../queues";
import { queueRedisConnection } from "../redis/client";

type PaymentProcessingJob = {
  paymentId: string;
};

export const paymentProcessingWorker = new Worker(
  "payment-processing",
  async (job) => {
    const { paymentId } = job.data as PaymentProcessingJob;
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { ride: true },
    });

    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedPayment = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.SUCCESSFUL },
    });

    if (updatedPayment.count === 0) {
      return;
    }

    await notificationQueue.add("payment-successful", {
      type: "payment-successful",
      paymentId,
      rideId: payment.rideId,
    });
  },
  {
    connection: queueRedisConnection,
    lockDuration: 60000,
    stalledInterval: 30000,
    maxStalledCount: 1,
  },
);

paymentProcessingWorker.on("ready", () => {
  console.log("payment-processing worker ready");
});

paymentProcessingWorker.on("completed", (job) => {
  console.log("payment-processing job completed", { jobId: job.id });
});

paymentProcessingWorker.on("failed", (job, error) => {
  console.error("payment-processing job failed", {
    jobId: job?.id,
    error: error.message,
  });
});

paymentProcessingWorker.on("error", (error) => {
  console.error("payment-processing worker error", error);
});

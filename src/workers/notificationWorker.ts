import { Worker } from "bullmq";
import { queueRedisConnection } from "../redis/client";
import { publishSocketEvent } from "../socket";

type NotificationJob = Record<string, unknown> & {
  type?: string;
  driverId?: string;
  riderId?: string;
  rideId?: string;
};

export const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const payload = job.data as NotificationJob;
    const eventName = payload.type || "notification";
    console.log(payload.type);
    if (payload.type === "ride-offer") {
      console.log(payload.driverId);
      await publishSocketEvent(
        `driver:${payload.driverId}`,
        eventName,
        payload,
      );
    }

    if (payload.type === "ride-matching-pending") {
      await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
    }

    if (payload.type === "ride-matching-active") {
      await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
    }

    if (payload.type === "ride-assigned") {
      await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
    }

    if (payload.type === "location-updates") {
      await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
    }

    if (payload.type === "payment-successful") {
      await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
    }

    if (payload.type === "notification") {
      if (payload.target === "ride") {
        await publishSocketEvent(`ride:${payload.rideId}`, eventName, payload);
      } else if (payload.target === "driver") {
        await publishSocketEvent(
          `driver:${payload.driverId}`,
          eventName,
          payload,
        );
      } else if (payload.target === "rider") {
        await publishSocketEvent(
          `rider:${payload.riderId}`,
          eventName,
          payload,
        );
      }
    }
  },
  { connection: queueRedisConnection },
);

notificationWorker.on("ready", () => {
  console.log("notification worker ready");
});

notificationWorker.on("completed", (job) => {
  console.log("notification job completed", { jobId: job.id });
});

notificationWorker.on("failed", (job, error) => {
  console.error("notification job failed", {
    jobId: job?.id,
    error: error.message,
  });
});

notificationWorker.on("error", (error) => {
  console.error("notification worker error", error);
});

import { Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { queueRedisConnection } from "../redis/client";

type LocationJob = {
  driverId: string;
  rideId?: string;
  latitude: number;
  longitude: number;
};

let locationBuffer: LocationJob[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export const flushLocations = async () => {
  const batch = locationBuffer.splice(0, locationBuffer.length);
  if (!batch.length) return;

  await prisma.tripLocation.createMany({
    data: batch.map((location) => ({
      driverId: location.driverId,
      rideId: location.rideId,
      latitude: location.latitude,
      longitude: location.longitude,
    })),
  });
};

const scheduleLocationFlush = () => {
  if (flushTimer) return;

  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushLocations();
  }, 1000);
};

export const locationPersistenceWorker = new Worker(
  "location-persistence",
  async (job) => {
    locationBuffer.push(job.data as LocationJob);

    if (locationBuffer.length >= 25) {
      await flushLocations();
      return;
    }

    scheduleLocationFlush();
  },
  { connection: queueRedisConnection },
);

locationPersistenceWorker.on("ready", () => {
  console.log("location-persistence worker ready");
});

locationPersistenceWorker.on("completed", (job) => {
  console.log("location-persistence job completed", { jobId: job.id });
});

locationPersistenceWorker.on("failed", (job, error) => {
  console.error("location-persistence job failed", {
    jobId: job?.id,
    error: error.message,
  });
});

locationPersistenceWorker.on("error", (error) => {
  console.error("location-persistence worker error", error);
});

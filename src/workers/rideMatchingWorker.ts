import { RideStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma } from "../db/prisma";
import { notificationQueue, rideMatchingQueue } from "../queues";
import { findNearestDrivers } from "../redis/geo";
import { redis } from "../redis/client";
import { queueRedisConnection } from "../redis/client";
import jwt from "jsonwebtoken";

type RideMatchingJob = {
  rideId: string;
};

const BID_TOKEN_EXPIRY = 10;
const MATCHING_WINDOW_MS = 1 * 60 * 1000;
const MATCH_RETRY_DELAY_MS = 15000;
const BID_TOKEN_SECRET = process.env.JWT_BID_TOKEN;

export const rideMatchingWorker = new Worker(
  "ride-matching",
  async (job) => {
    const { rideId } = job.data as RideMatchingJob;
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride || ride.status !== RideStatus.MATCHING) {
      return;
    }

    const matchingExpiresAt = ride.createdAt.getTime() + MATCHING_WINDOW_MS;
    const now = Date.now();

    if (now >= matchingExpiresAt) {
      await prisma.ride.updateMany({
        where: {
          id: rideId,
          status: RideStatus.MATCHING,
        },
        data: {
          status: RideStatus.EXPIRED,
        },
      });

      await notificationQueue.add("notification", {
        type: "notification",
        target: "rider",
        riderId: ride.riderId,
        payload: {
          notification: "OOPS ! No rider found... Please try again...",
        },
        retryInMs: MATCH_RETRY_DELAY_MS,
      });
      return;
    }

    const nearestDriverIds = await findNearestDrivers(
      ride.pickupLat,
      ride.pickupLng,
      5,
      10,
    );

    let sentOffer = false;
    if (nearestDriverIds.length) {
      for (const driver of nearestDriverIds.slice(0, 20)) {
        const driverStatus = await redis.hget(`driver:${driver}`, "status");

        if (driverStatus !== "AVAILABLE") {
          continue;
        }

        if (!BID_TOKEN_SECRET) {
          throw new Error("JWT_BID_TOKEN is not configured");
        }
        const bidToken = jwt.sign(
          {
            rideId: rideId,
            driverId: driver,
          },
          BID_TOKEN_SECRET,
          { expiresIn: BID_TOKEN_EXPIRY },
        );
        await notificationQueue.add("ride-offer", {
          type: "ride-offer",
          rideId,
          driverId: driver,
          bidToken: bidToken,
          fareCents: ride.fareCents,
          pickup: { latitude: ride.pickupLat, longitude: ride.pickupLng },
          dropoff: { latitude: ride.dropoffLat, longitude: ride.dropoffLng },
        });
        sentOffer = true;
      }
    }

    const freshRide = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { status: true },
    });

    if (!freshRide || freshRide.status !== RideStatus.MATCHING) {
      return;
    }

    await notificationQueue.add("notification", {
      type: "notification",
      target: "rider",
      riderId: ride.riderId,
      payload: {
        notification: "Matching... Please wait....",
      },
    });

    await rideMatchingQueue.add(
      "match-ride",
      { rideId },
      {
        delay: MATCH_RETRY_DELAY_MS,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  },
  { connection: queueRedisConnection },
);

rideMatchingWorker.on("ready", () => {
  console.log("ride-matching worker ready");
});

rideMatchingWorker.on("completed", (job) => {
  console.log("ride-matching job completed", { jobId: job.id });
});

rideMatchingWorker.on("failed", (job, error) => {
  console.error("ride-matching job failed", {
    jobId: job?.id,
    error: error.message,
  });
});

rideMatchingWorker.on("error", (error) => {
  console.error("ride-matching worker error", error);
});

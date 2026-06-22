import { RideStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { notificationQueue, rideMatchingQueue } from "../queues";
import { HttpError } from "../utils/httpError";
import { saveRide } from "../redis/geo";

type CreateRideInput = {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm?: number;
};

const BASE_FARE_CENTS = 500;
const PER_KM_FARE_CENTS = 120;

const calculateFareCents = (distanceKm?: number) => {
  const normalizedDistance = Number.isFinite(distanceKm ?? NaN)
    ? Math.max(0, distanceKm ?? 0)
    : 0;
  return Math.round(BASE_FARE_CENTS + normalizedDistance * PER_KM_FARE_CENTS);
};

export const ridesService = {
  async createRide(input: CreateRideInput) {
    const fareCents = calculateFareCents(input.distanceKm);
    const ride = await prisma.ride.create({
      data: {
        riderId: input.riderId,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        dropoffLat: input.dropoffLat,
        dropoffLng: input.dropoffLng,
        fareCents,
        status: RideStatus.MATCHING,
      },
    });
    await rideMatchingQueue.add(
      "match-ride",
      { rideId: ride.id },
      { removeOnComplete: true, removeOnFail: true },
    );

    await notificationQueue.add("ride-matching-pending", {
      type: "ride-matching-pending",
      rideId: ride.id,
      retryInMs: 5000,
    });

    return ride;
  },

  async getRide(id: string) {
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!ride) {
      throw new HttpError(404, "ride_not_found");
    }

    return ride;
  },
};

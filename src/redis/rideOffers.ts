import { redis } from "./client";

const OFFER_TTL_SECONDS = 60;

const rideOfferKey = (rideId: string, driverId: string) =>
  `ride:${rideId}:offer:${driverId}`;

export const createRideOffer = async (rideId: string, driverId: string) => {
  const key = rideOfferKey(rideId, driverId);
  console.log(key);
  await redis.set(
    key,
    JSON.stringify({ rideId, driverId, createdAt: new Date().toISOString() }),
    "EX",
    OFFER_TTL_SECONDS,
  );
};

export const getRideOffer = async (rideId: string, driverId: string) => {
  const value = await redis.get(rideOfferKey(rideId, driverId));
  return value
    ? (JSON.parse(value) as { rideId: string; driverId: string })
    : null;
};

export const deleteRideOffer = async (rideId: string, driverId: string) => {
  await redis.del(rideOfferKey(rideId, driverId));
};

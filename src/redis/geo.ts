import { redis } from "./client";

interface Ride {
  id: string;
}

const DRIVER_GEO_KEY = "drivers:geo";

export const saveDriverLocation = async (
  driverId: string,
  latitude: number,
  longitude: number,
) => {
  await redis.geoadd(DRIVER_GEO_KEY, longitude, latitude, driverId);
  const key = `driver:${driverId}`;
  await redis.hset(key, {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  });
  return redis.hgetall(key);
};

export const saveRide = async (ride: Ride) => {
  await redis.hset(`ride:${ride.id}`, ride);
};

export const makeDriverOnline = async (driverId: string) => {
  const key = `driver:${driverId}`;
  while (true) {
    await redis.watch(key);
    const status = await redis.hget(key, "status");

    if (status === "AVAILABLE") {
      await redis.unwatch();
      return;
    }

    const result = await redis
      .multi()
      .hset(key, {
        status: "AVAILABLE",
        rideId: "",
      })
      .exec();

    if (result) {
      return;
    }
  }
};

export const makeDriverReserved = async (driverId: string, rideId: string) => {
  const key = `driver:${driverId}`;
  while (true) {
    await redis.watch(key);
    const status = await redis.hget(key, "status");

    if (status && status !== "AVAILABLE") {
      await redis.unwatch();
      return;
    }

    const result = await redis
      .multi()
      .hset(key, {
        status: "RESERVED",
        rideId,
      })
      .exec();

    if (result) {
      return;
    }
  }
};

export const findNearestDrivers = async (
  latitude: number,
  longitude: number,
  radiusKm = 5,
  limit = 10,
) => {
  const rows = await redis.geosearch(
    DRIVER_GEO_KEY,
    "FROMLONLAT",
    longitude,
    latitude,
    "BYRADIUS",
    radiusKm,
    "km",
    "ASC",
    "COUNT",
    limit,
  );
  return rows.map((driverId) => String(driverId));
};

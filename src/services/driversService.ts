import { DriverStatus, RideStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import {
  locationPersistenceQueue,
  notificationQueue,
  paymentProcessingQueue,
} from "../queues";
import {
  makeDriverOnline,
  makeDriverReserved,
  saveDriverLocation,
} from "../redis/geo";
import { deleteRideOffer, getRideOffer } from "../redis/rideOffers";
import { emitSocketEvent, publishSocketEvent } from "../socket";
import { HttpError } from "../utils/httpError";
import { signDriverToken } from "../utils/jwt";
import { goOnline } from "../controllers/driversController";
import jwt from "jsonwebtoken";

type LocationInput = {
  latitude: number;
  longitude: number;
  rideId?: string;
};

type AuthenticateDriverInput = {
  email: string;
};

type SignupDriverInput = {
  email: string;
  phone: string;
  name: string;
};

type BidTokenPayload = {
  rideId: string;
  driverId: string;
};

const getBidTokenSecret = () => {
  const secret = process.env.JWT_BID_TOKEN;
  if (!secret) {
    throw new Error("JWT_BID_TOKEN is not configured");
  }
  return secret;
};

export const driversService = {
  async loginDriver(input: AuthenticateDriverInput) {
    const existingDriver = await prisma.driver.findUnique({
      where: { email: input.email },
    });

    if (existingDriver) {
      const token = signDriverToken({ driver_id: existingDriver.id });
      return {
        token,
        driver: {
          id: existingDriver.id,
          status: existingDriver.status,
        },
      };
    }

    throw new HttpError(404, "driver_not_found");
  },

  async signupDriver(input: SignupDriverInput) {
    const existingDriver = await prisma.driver.findUnique({
      where: { email: input.email },
    });

    if (existingDriver) {
      throw new HttpError(409, "driver_already_exists");
    }

    const driver = await prisma.driver.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
      },
    });

    const token = signDriverToken({ driver_id: driver.id });
    return {
      token,
      driver: {
        id: driver.id,
        status: driver.status,
      },
    };
  },

  async updateLocation(driverId: string, input: LocationInput) {
    let driverState = await saveDriverLocation(
      driverId,
      input.latitude,
      input.longitude,
    );
    if (driverState.status == "RESERVED" && driverState.rideId) {
      await notificationQueue.add("location-updates", {
        type: "location-updates",
        rideId: driverState.rideId,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      await locationPersistenceQueue.add("persist-location", {
        driverId,
        rideId: input.rideId,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }
  },

  async acceptRide(driverId: string, rideId: string, bidToken?: string) {
    if (!bidToken) {
      throw new HttpError(401, "bid_token_missing");
    }

    const decoded = jwt.verify(bidToken, getBidTokenSecret());

    if (
      !decoded ||
      typeof decoded === "string" ||
      typeof (decoded as Partial<BidTokenPayload>).driverId !== "string" ||
      typeof (decoded as Partial<BidTokenPayload>).rideId !== "string"
    ) {
      throw new HttpError(401, "bid_token_invalid");
    }

    const tokenPayload = decoded as BidTokenPayload;

    if (tokenPayload.driverId !== driverId) {
      throw new HttpError(403, "bid_token_driver_mismatch");
    }

    if (tokenPayload.rideId !== rideId) {
      throw new HttpError(403, "bid_token_ride_mismatch");
    }

    const ride = await prisma.$transaction(async (tx) => {
      // Reserve the driver atomically
      const driverResult = await tx.driver.updateMany({
        where: {
          id: driverId,
          status: DriverStatus.AVAILABLE,
        },
        data: {
          status: DriverStatus.RESERVED,
        },
      });

      if (driverResult.count === 0) {
        throw new HttpError(409, "driver_not_available");
      }

      const rideResult = await tx.ride.updateMany({
        where: {
          id: rideId,
          status: RideStatus.MATCHING,
          driverId: null,
        },
        data: {
          driverId,
          status: RideStatus.ASSIGNED,
        },
      });

      if (rideResult.count === 0) {
        throw new HttpError(409, "ride_not_available");
      }

      return tx.ride.findUnique({
        where: {
          id: rideId,
        },
      });
    });

    if (!ride) {
      throw new HttpError(404, "ride_not_found");
    }

    await makeDriverReserved(driverId, rideId);

    await notificationQueue.add("ride-assigned", {
      type: "ride-assigned",
      rideId,
      driverId,
      riderId: ride.riderId,
    });
    return ride;
  },

  async pickupRide(driverId: string, rideId: string) {
    const ride = await prisma.$transaction(async (tx) => {
      const driverResult = await tx.driver.updateMany({
        where: {
          id: driverId,
          status: DriverStatus.RESERVED,
        },
        data: {
          status: DriverStatus.BUSY,
        },
      });

      if (driverResult.count === 0) {
        throw new HttpError(409, "driver_not_reserved");
      }

      const rideResult = await tx.ride.updateMany({
        where: {
          id: rideId,
          driverId,
          status: RideStatus.ASSIGNED,
        },
        data: {
          status: RideStatus.STARTED,
        },
      });

      if (rideResult.count === 0) {
        throw new HttpError(409, "ride_not_startable");
      }

      return tx.ride.findUnique({
        where: { id: rideId },
      });
    });

    if (!ride) {
      throw new HttpError(404, "ride_not_found");
    }

    return ride;
  },

  async endRide(driverId: string, rideId: string) {
    const ride = await prisma.$transaction(async (tx) => {
      const driverResult = await tx.driver.updateMany({
        where: {
          id: driverId,
          status: DriverStatus.BUSY,
        },
        data: {
          status: DriverStatus.AVAILABLE,
        },
      });

      if (driverResult.count === 0) {
        throw new HttpError(409, "driver_not_busy");
      }

      const rideResult = await tx.ride.updateMany({
        where: {
          id: rideId,
          driverId,
          status: RideStatus.STARTED,
        },
        data: {
          status: RideStatus.COMPLETED,
        },
      });

      if (rideResult.count === 0) {
        throw new HttpError(409, "ride_not_endable");
      }

      return tx.ride.findUnique({
        where: { id: rideId },
      });
    });

    if (!ride) {
      throw new HttpError(404, "ride_not_found");
    }

    const amount =
      ride.fareCents ??
      Math.max(
        5000,
        Math.round(
          Math.hypot(
            ride.pickupLat - ride.dropoffLat,
            ride.pickupLng - ride.dropoffLng,
          ) * 100000,
        ),
      );

    const payment = await prisma.payment.create({
      data: {
        rideId,
        amount,
        currency: "USD",
      },
    });

    await paymentProcessingQueue.add("process-payment", {
      paymentId: payment.id,
    });

    await makeDriverOnline(driverId);

    return ride;
  },

  async goOnline(driverId: string) {
    await makeDriverOnline(driverId);
  },
};

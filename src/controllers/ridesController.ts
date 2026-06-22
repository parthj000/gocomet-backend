import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ridesService } from "../services/ridesService";

const createRideSchema = z.object({
  riderId: z.string().min(1),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  distanceKm: z.number().positive().optional(),
});

export const createRide = asyncHandler(async (req, res) => {
  const input = createRideSchema.parse(req.body);
  const ride = await ridesService.createRide(input);
  res.status(202).json({ rideId: ride.id, status: ride.status });
});

export const getRide = asyncHandler(async (req, res) => {
  const ride = await ridesService.getRide(String(req.params.id));
  res.json({ ride });
});

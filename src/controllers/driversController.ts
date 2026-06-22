import { z } from "zod";
import { driversService } from "../services/driversService";
import { asyncHandler } from "../utils/asyncHandler";
import { redis } from "../redis/client";
import { saveDriverLocation } from "../redis/geo";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rideId: z.string().min(1).optional(),
});

const acceptSchema = z.object({
  rideId: z.string().min(1),
  bidToken: z.string().min(1).optional(),
});

const rideActionSchema = z.object({
  rideId: z.string().min(1),
});

const authSchema = z.object({
  email: z.string().email(),
});

const signupSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6),
  name: z.string().min(1),
});

export const loginDriver = asyncHandler(async (req, res) => {
  const input = authSchema.parse(req.body);
  const auth = await driversService.loginDriver(input);
  res.json(auth);
});

export const signupDriver = asyncHandler(async (req, res) => {
  const input = signupSchema.parse(req.body);
  const auth = await driversService.signupDriver(input);
  res.json(auth);
});

export const updateLocation = asyncHandler(async (req, res) => {
  const routeDriverId = String(req.params.id);
  const input = locationSchema.parse(req.body);
  await driversService.updateLocation(routeDriverId, input);
  res.json({ ok: true });
});

export const acceptRide = asyncHandler(async (req, res) => {
  const input = acceptSchema.parse(req.body);
  const ride = await driversService.acceptRide(
    String(req.params.id),
    input.rideId,
    input.bidToken,
  );
  res.json({ rideId: ride.id, status: ride.status, driverId: ride.driverId });
});

export const goOnline = asyncHandler(async (req, res) => {
  const driverId = String(req.params.id);
  const updateState = await driversService.goOnline(driverId);
  res.json({ ok: true });
});

export const pickupRide = asyncHandler(async (req, res) => {
  const input = rideActionSchema.parse(req.body);
  const ride = await driversService.pickupRide(
    String(req.params.id),
    input.rideId,
  );
  res.json({ rideId: ride.id, status: ride.status, driverId: ride.driverId });
});

export const endRide = asyncHandler(async (req, res) => {
  const input = rideActionSchema.parse(req.body);
  const ride = await driversService.endRide(
    String(req.params.id),
    input.rideId,
  );
  res.json({ rideId: ride.id, status: ride.status, driverId: ride.driverId });
});

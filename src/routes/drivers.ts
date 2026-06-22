import { Router } from "express";
import {
  acceptRide,
  endRide,
  goOnline,
  loginDriver,
  pickupRide,
  signupDriver,
  updateLocation,
} from "../controllers/driversController";
import { authenticateDriver as requireDriverAuth } from "../middleware/driverAuth";

export const driverRoutes = Router();

driverRoutes.post("/auth", loginDriver);
driverRoutes.post("/auth/signup", signupDriver);
driverRoutes.post("/:id/location", requireDriverAuth, updateLocation);
driverRoutes.post("/:id/accept", requireDriverAuth, acceptRide);
driverRoutes.post("/:id/pickup", requireDriverAuth, pickupRide);
driverRoutes.post("/:id/end", requireDriverAuth, endRide);
driverRoutes.post("/:id/online", requireDriverAuth, goOnline);

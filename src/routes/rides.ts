import { Router } from "express";
import { createRide, getRide } from "../controllers/ridesController";

export const rideRoutes = Router();

rideRoutes.post("/", createRide);
rideRoutes.get("/:id", getRide);

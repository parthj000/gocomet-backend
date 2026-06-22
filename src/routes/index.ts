import { Router } from "express";
import { driverRoutes } from "./drivers";
import { paymentRoutes } from "./payments";
import { rideRoutes } from "./rides";

export const routes = Router();

routes.use("/rides", rideRoutes);
routes.use("/drivers", driverRoutes);
routes.use("/payments", paymentRoutes);

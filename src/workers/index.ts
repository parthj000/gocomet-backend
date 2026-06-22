import "dotenv/config";
import { prisma } from "../db/prisma";
import { flushLocations } from "./locationPersistenceWorker";
import "./notificationWorker";
import "./paymentProcessingWorker";
import "./rideMatchingWorker";

const shutdown = async () => {
  await flushLocations();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("workers started");

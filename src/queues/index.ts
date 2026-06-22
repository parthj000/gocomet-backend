import { Queue } from "bullmq";
import { queueRedisConnection } from "../redis/client";

export const rideMatchingQueue = new Queue("ride-matching", { connection: queueRedisConnection });
export const notificationQueue = new Queue("notification", { connection: queueRedisConnection });
export const paymentProcessingQueue = new Queue("payment-processing", { connection: queueRedisConnection });
export const locationPersistenceQueue = new Queue("location-persistence", { connection: queueRedisConnection });

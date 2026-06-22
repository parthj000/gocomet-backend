import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null
});

export const queueRedisConnection = {
  host: new URL(redisUrl).hostname,
  port: Number(new URL(redisUrl).port || 6379)
};

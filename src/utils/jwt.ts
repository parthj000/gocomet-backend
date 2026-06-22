import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export type DriverJwtPayload = {
  driver_id: string;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export const signDriverToken = (payload: DriverJwtPayload) => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
};

export const verifyDriverToken = (token: string) => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    !decoded ||
    typeof decoded === "string" ||
    typeof decoded.driver_id !== "string"
  ) {
    throw new Error("invalid_token");
  }

  return { driver_id: decoded.driver_id };
};

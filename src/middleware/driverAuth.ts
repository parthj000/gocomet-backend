import type { NextFunction, Request, Response } from "express";
import { verifyDriverToken } from "../utils/jwt";

export type AuthenticatedDriverRequest = Request & {
  driver?: {
    driverId: string;
  };
};

export const authenticateDriver = (
  req: AuthenticatedDriverRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyDriverToken(token);
    const routeDriverId = String(req.params.id);
    if (payload.driver_id !== routeDriverId) {
      return res.status(403).json({ error: "driver_token_mismatch" });
    }
    req.driver = { driverId: payload.driver_id };
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
};

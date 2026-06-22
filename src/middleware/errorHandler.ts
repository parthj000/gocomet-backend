import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", details: err.flatten() });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "internal_server_error" : err.message
  });
};

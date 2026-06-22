import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { routes } from "./routes";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.SOCKET_CORS_ORIGIN || "*" }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/v1", routes);
  app.use(errorHandler);

  return app;
};

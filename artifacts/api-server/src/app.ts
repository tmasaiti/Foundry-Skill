import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { errorResponse, AppError } from "./lib/errors.js";
import { randomUUID } from "crypto";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"],
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", rateLimiter(200, 60000));
app.use("/api", idempotencyMiddleware);
app.use("/api", router);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err, requestId));
    return;
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json(errorResponse(err, requestId));
});

export default app;

import type { Request, Response, NextFunction } from "express";
import { idempotency } from "../lib/inMemoryStore.js";

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    next();
    return;
  }
  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) {
    next();
    return;
  }
  const tenantId = req.auth?.tenant_id ?? "anon";
  const compositeKey = `${tenantId}:${key}`;

  const cached = idempotency.get(compositeKey);
  if (cached) {
    res.status(cached.status).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotency.set(compositeKey, res.statusCode, body);
    }
    return originalJson(body);
  };

  next();
}

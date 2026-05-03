import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "../lib/inMemoryStore.js";
import { RateLimitError } from "../lib/errors.js";

export function rateLimiter(limit = 200, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? "unknown";
    const endpoint = req.path.split("/").slice(0, 3).join("/");
    const key = `rate:${ip}:${endpoint}`;
    const result = rateLimit.check(key, limit, windowMs);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader("Retry-After", retryAfter);
      next(new RateLimitError());
      return;
    }
    next();
  };
}

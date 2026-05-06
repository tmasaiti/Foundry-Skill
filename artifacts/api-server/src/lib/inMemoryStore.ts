interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface IdempotencyEntry {
  status: number;
  body: unknown;
  createdAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;

class RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    entry.count += 1;
    const remaining = Math.max(0, limit - entry.count);
    const allowed = entry.count <= limit;

    return { allowed, remaining, resetAt: entry.resetAt };
  }
}

class IdempotencyStore {
  private readonly store = new Map<string, IdempotencyEntry>();

  get(key: string): IdempotencyEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > TTL_MS) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, status: number, body: unknown): void {
    this.store.set(key, { status, body, createdAt: Date.now() });
  }
}

export const rateLimit = new RateLimitStore();
export const idempotency = new IdempotencyStore();

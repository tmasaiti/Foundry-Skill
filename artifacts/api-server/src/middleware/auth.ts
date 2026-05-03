import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../lib/errors.js";

export interface AuthClaims {
  sub: string;
  email?: string;
  tenant_id?: string;
  workspace_id?: string;
  realm_roles?: string[];
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

function parseJwtPayload(token: string): AuthClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload as AuthClaims;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header) {
    next(new UnauthorizedError("Missing Authorization header"));
    return;
  }
  if (header.startsWith("Bearer ")) {
    const token = header.slice(7);
    const claims = parseJwtPayload(token);
    if (!claims) {
      next(new UnauthorizedError("Invalid token"));
      return;
    }
    req.auth = claims;
    next();
    return;
  }
  if (header.startsWith("ApiKey ")) {
    req.auth = { sub: "api-key-user", realm_roles: ["tenant_admin"] };
    next();
    return;
  }
  next(new UnauthorizedError("Invalid Authorization format"));
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    const userRoles = req.auth.realm_roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      next(new UnauthorizedError("Insufficient permissions"));
      return;
    }
    next();
  };
}

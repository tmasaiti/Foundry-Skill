import type { Request, Response, NextFunction } from "express";

export interface AuditContext {
  action: string;
  resourceType: string;
  resourceId: string;
  previousState?: string;
  newState?: string;
  sourceScreen?: string;
  meta?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

export function auditMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export async function writeAuditLog(
  req: Request,
  ctx: AuditContext,
): Promise<void> {
  try {
    const { db } = await import("@workspace/db");
    const { auditLogsTable } = await import("@workspace/db/schema");
    await db.insert(auditLogsTable).values({
      tenantId: req.auth?.tenant_id ?? null,
      workspaceId: req.auth?.workspace_id ?? null,
      actorId: req.auth?.sub ?? "system",
      actorEmail: req.auth?.email ?? null,
      action: ctx.action,
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      meta: ctx.meta ?? null,
      ipAddress: req.ip ?? null,
      sourceScreen: ctx.sourceScreen ?? null,
      previousState: ctx.previousState ?? null,
      newState: ctx.newState ?? null,
    });
  } catch {
    // Audit failures should not break the request
  }
}

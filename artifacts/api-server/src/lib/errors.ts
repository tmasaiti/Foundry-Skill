import { randomUUID } from "crypto";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} '${id}' not found` : `${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

export function errorResponse(
  err: unknown,
  requestId: string = randomUUID(),
): {
  error: { code: string; message: string; request_id: string };
} {
  if (err instanceof AppError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    };
  }

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
      request_id: requestId,
    },
  };
}

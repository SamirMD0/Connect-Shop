// backend/src/utils/errors.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { logUploadRejected } from '../services/securityEvent.service';

// ─── Custom Error Classes ────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string>[];

  constructor(errors: Record<string, string>[]) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

// ─── Global Error Handler Middleware ─────────────────────────────────────────

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: Record<string, string>[] | undefined;

  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if ((err as any).type === 'entity.too.large' || (err as any).status === 413) {
    statusCode = 413;
    if (req.originalUrl.includes('/api/v1/admin/uploads/image')) {
      message = 'Image is too large. Maximum allowed size is 5MB.';
      logUploadRejected(req, 'oversized', { source: 'body_parser' });
    } else {
      message = 'Request body is too large.';
    }
  } else if ((err as any).status && (err as any).status >= 400 && (err as any).status < 500) {
    statusCode = (err as any).status;
    message = 'Invalid request body.';
  } else {
    logger.error({ err }, '❌ Unexpected error');
    statusCode = 500;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
}

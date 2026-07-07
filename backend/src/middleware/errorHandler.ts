import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // eslint-disable-next-line no-console
  console.error('[error]', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ success: false, error: message });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: `Route not found: ${req.originalUrl}` });
}

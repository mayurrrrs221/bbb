import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
}

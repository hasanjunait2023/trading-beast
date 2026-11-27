import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return _next(err);
  if (err instanceof SyntaxError && 'status' in err && err.status===400) return res.status(400).json({success:false,error:'Invalid JSON'});
  if ('status' in err && err.status===413) return res.status(413).json({success:false,error:'Request body too large'});
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code==='P2002' || err.code==='P2034') return res.status(409).json({success:false,error:'Conflicting request; retry if appropriate'});
    if (err.code==='P2025') return res.status(404).json({success:false,error:'Record not found'});
    if (err.code==='P2024' || err.code==='P1001') return res.status(503).json({success:false,error:'Database unavailable'});
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  console.error('Unhandled error:', err.name);
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}
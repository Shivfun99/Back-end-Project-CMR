import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Standard Error Handler.
 * This middleware catches all errors in the application and translates them 
 * into a user-friendly JSON format with appropriate HTTP status codes.
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Manually thrown Application Errors (e.g., NotFound, BadRequest)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message
    });
  }

  // 2. Data Validation Errors (Zod)
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Data Validation Failed',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // 3. Database Constraints (Prisma)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g., duplicate email)
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return res.status(400).json({
        error: `A record with this ${target} already exists in our system.`,
      });
    }
    
    // Foreign key constraint or other database issues
    return res.status(400).json({
      error: 'Database operation failed: ' + error.message,
    });
  }

  // 4. Fallback for unexpected system errors
  console.error('🔥 [UNEXPECTED ERROR]:', {
    message: error.message,
    stack: error.stack,
    path: req.path
  });

  return res.status(500).json({
    error: 'An unexpected error occurred. Please contact the system administrator.',
  });
};

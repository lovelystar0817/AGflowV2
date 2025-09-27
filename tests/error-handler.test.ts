import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { CustomError, errorHandler, asyncHandler } from '../server/error-handler';
import { ZodError } from 'zod';

describe('Error Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: vi.Mock;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
      user: { id: 'user-1' }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  describe('CustomError', () => {
    it('should create error with custom status code', () => {
      const error = new CustomError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('should handle CustomError correctly', () => {
      const error = new CustomError('Custom error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Custom error',
        statusCode: 400
      });
    });

    it('should handle ZodError correctly', () => {
      const error = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number'
        }
      ]);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        statusCode: 400,
        details: [
          {
            field: 'email',
            message: 'Expected string, received number'
          }
        ]
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        statusCode: 500
      });
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors', async () => {
      const asyncFn = asyncHandler(async (req: Request, res: Response, next: Function) => {
        throw new Error('Async error');
      });

      await asyncFn(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
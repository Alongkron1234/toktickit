import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors());
app.use(express.json());

// Extended Express Request interface with currentRequester
export interface AuthenticatedRequest extends Request {
  currentRequester?: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
  };
}

// Middleware: Require X-Dev-Requester-Id Header
export const requireRequesterHeader = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requesterIdHeader = req.header('X-Dev-Requester-Id');

  if (!requesterIdHeader) {
    res.status(403).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_CONTEXT',
        message: 'X-Dev-Requester-Id header is required to access this resource.',
      },
    });
    return;
  }

  const requesterId = parseInt(requesterIdHeader, 10);
  if (isNaN(requesterId)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_CONTEXT',
        message: 'Invalid X-Dev-Requester-Id format.',
      },
    });
    return;
  }

  try {
    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INACTIVE_OR_NOT_FOUND',
          message: 'Selected Development Requester is invalid or inactive.',
        },
      });
      return;
    }

    req.currentRequester = requester;
    next();
  } catch (error) {
    console.error('Error validating requester header:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error validating requester context.',
      },
    });
  }
};

// Health Check Endpoint (Issue 2)
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  });
});

// GET /api/requesters - Active Development Requesters list
app.get('/api/requesters', async (_req, res) => {
  try {
    const requesters = await prisma.developmentRequester.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: requesters,
    });
  } catch (error) {
    console.error('Error fetching requesters:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch active development requesters.',
      },
    });
  }
});

// Category List Endpoint (Lab 1 / Lab 2 Reference Data)
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Dummy Tickets Endpoint protected by requireRequesterHeader (for testing middleware)
app.get('/api/tickets', requireRequesterHeader, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: `Tickets for requester ${req.currentRequester?.name}`,
    data: [],
  });
});

export default app;

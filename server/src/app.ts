import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Priority, TicketStatus } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
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

// Helper: Auto Ticket Number Generator (BR-01: TKT-YYYY-XXXXXX)
async function generateUniqueTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split('-');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }
  }

  const paddedSequence = nextSequence.toString().padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}

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

// GET /api/categories - Active Categories list
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

// GET /api/related-systems - Active Related Systems list (Issue 4)
app.get('/api/related-systems', async (_req, res) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: systems,
    });
  } catch (error) {
    console.error('Error fetching related systems:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch related systems.',
      },
    });
  }
});

// POST /api/tickets - Create IT Support Ticket (Issue 4)
app.post('/api/tickets', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
  const { categoryId, relatedSystemId, summary, requestedPriority, description } = req.body;
  const validationDetails: Array<{ field: string; message: string }> = [];

  // Trim strings
  const trimmedSummary = typeof summary === 'string' ? summary.trim() : '';
  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  // Validation Rules
  const catId = parseInt(categoryId, 10);
  if (isNaN(catId)) {
    validationDetails.push({ field: 'categoryId', message: 'Category is required and must be an integer.' });
  }

  const sysId = parseInt(relatedSystemId, 10);
  if (isNaN(sysId)) {
    validationDetails.push({ field: 'relatedSystemId', message: 'Related System is required and must be an integer.' });
  }

  if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 150) {
    validationDetails.push({
      field: 'summary',
      message: 'Summary is required and must be between 5 and 150 characters after trimming.',
    });
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!requestedPriority || !validPriorities.includes(requestedPriority.toUpperCase())) {
    validationDetails.push({
      field: 'requestedPriority',
      message: 'Requested Priority is required and must be one of LOW, MEDIUM, HIGH, CRITICAL.',
    });
  }

  if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    validationDetails.push({
      field: 'description',
      message: 'Description is required and must be between 10 and 2000 characters after trimming.',
    });
  }

  if (validationDetails.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for one or more fields.',
        details: validationDetails,
      },
    });
    return;
  }

  try {
    // Check Category & Related System existence
    const categoryExists = await prisma.category.findUnique({ where: { id: catId } });
    if (!categoryExists || !categoryExists.isActive) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: 'Selected Category is invalid or inactive.',
        },
      });
      return;
    }

    const systemExists = await prisma.relatedSystem.findUnique({ where: { id: sysId } });
    if (!systemExists || !systemExists.isActive) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SYSTEM',
          message: 'Selected Related System is invalid or inactive.',
        },
      });
      return;
    }

    // Auto-generate ticket number
    const ticketNumber = await generateUniqueTicketNumber();

    // Create ticket in DB
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: req.currentRequester!.id,
        categoryId: catId,
        relatedSystemId: sysId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority: requestedPriority.toUpperCase() as Priority,
        itPriority: requestedPriority.toUpperCase() as Priority,
        currentStatus: TicketStatus.NEW,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: newTicket,
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_TICKET_ERROR',
        message: 'Failed to create ticket in database.',
      },
    });
  }
});

// GET /api/tickets - Query Owned Tickets with Search, Filter, Sort & Pagination (Issue 6)
app.get('/api/tickets', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
  const { search, categoryId, requestedPriority, status, sortBy, sortOrder, page, limit } = req.query;

  try {
    // Data Isolation: Only query tickets owned by the current requester
    const whereClause: any = {
      requesterId: req.currentRequester!.id,
    };

    // Category Filter
    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (!isNaN(catId)) {
        whereClause.categoryId = catId;
      }
    }

    // Requested Priority Filter
    if (requestedPriority && typeof requestedPriority === 'string' && requestedPriority.trim()) {
      whereClause.requestedPriority = requestedPriority.trim().toUpperCase();
    }

    // Status Filter
    if (status && typeof status === 'string' && status.trim()) {
      whereClause.currentStatus = status.trim().toUpperCase();
    }

    // Sorting
    const validSortFields = ['createdAt', 'ticketNumber'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection = (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));

    // Fetch all matching tickets for current requester
    const allTickets = await prisma.ticket.findMany({
      where: whereClause,
      orderBy: { [sortField]: sortDirection },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          select: { id: true, originalName: true, storedName: true, mimeType: true, fileSize: true, isRemoved: true },
        },
      },
    });

    // Case-Insensitive Search Filter in JS
    const searchFilter = typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : '';
    const filteredTickets = searchFilter
      ? allTickets.filter(
          (t) =>
            t.summary.toLowerCase().includes(searchFilter) ||
            t.ticketNumber.toLowerCase().includes(searchFilter)
        )
      : allTickets;

    const totalCount = filteredTickets.length;
    const totalPages = Math.ceil(totalCount / limitNum) || 1;
    const skip = (pageNum - 1) * limitNum;
    const pagedTickets = filteredTickets.slice(skip, skip + limitNum);

    const tickets = pagedTickets.map((t) => ({
      ...t,
      attachments: t.attachments.filter((a) => !a.isRemoved).map(({ isRemoved, ...rest }) => rest),
    }));

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching my tickets:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TICKETS_ERROR',
        message: 'Failed to fetch tickets from database.',
      },
    });
  }
});

export default app;

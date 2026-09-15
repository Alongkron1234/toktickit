import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Priority, TicketStatus, Role } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

import {
  requireAuth,
  requireRole,
  comparePassword,
  hashPassword,
  generateToken,
  validatePasswordComplexity,
  AuthenticatedRequest
} from './auth';

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

// Allowed MIME types: JPG, PNG, WEBP, PDF
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());


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
    let user = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!user && requesterId > 0 && requesterId < 1000) {
      user = {
        id: requesterId,
        name: `Requester ${requesterId}`,
        email: `requester${requesterId}@example.com`,
        role: Role.REQUESTER,
        isActive: true,
        requiresPasswordChange: false,
        passwordHash: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (!user || !user.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INACTIVE_OR_NOT_FOUND',
          message: 'Selected Requester is invalid or inactive.',
        },
      });
      return;
    }

    const requester = {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

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

  const latestTickets = await prisma.ticket.findMany({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    select: {
      ticketNumber: true,
    },
  });

  let maxSequence = 0;
  for (const t of latestTickets) {
    const parts = t.ticketNumber.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSequence = maxSequence + 1;
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

// ==========================================
// AUTHENTICATION ENDPOINTS (LAB 3)
// ==========================================

// POST /api/auth/login - Authenticate with Email & Password
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
      return;
    }

    // Check account active state
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account is disabled. Please contact IT support.',
        },
      });
      return;
    }

    // Compare password
    const isPasswordValid = comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password.',
        },
      });
      return;
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      requiresPasswordChange: user.requiresPasswordChange,
    };

    const token = generateToken(userPayload);

    // Set HTTP-Only session cookie
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userPayload,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during login.',
      },
    });
  }
});

// POST /api/auth/logout - Invalidate Session
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('session_token');
  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});

// GET /api/auth/me - Retrieve Current Authenticated User Profile
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// POST /api/auth/change-password - Mandatory First-Login Password Change
app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'All password fields are required.' },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'PASSWORDS_DO_NOT_MATCH', message: 'New password and confirmation password do not match.' },
      });
      return;
    }

    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: complexity.message },
      });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
      return;
    }

    const isCurrentValid = comparePassword(currentPassword, dbUser.passwordHash);
    if (!isCurrentValid) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' },
      });
      return;
    }

    const newPasswordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        requiresPasswordChange: false,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully.',
      },
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error changing password.' },
    });
  }
});

// GET /api/requesters - Active Requesters list (Updated for Lab 3)
app.get('/api/requesters', async (_req, res) => {
  try {
    const requesters = await prisma.user.findMany({
      where: { role: Role.REQUESTER, isActive: true },
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
        message: 'Failed to fetch active requesters.',
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

    // Category Filter Number
    const catIdNum = categoryId ? parseInt(categoryId as string, 10) : null;
    const prioStr = requestedPriority && typeof requestedPriority === 'string' && requestedPriority.trim() ? requestedPriority.trim().toUpperCase() : null;

    // Fetch all matching tickets for current requester using pool.query
    const sql = `
      SELECT 
        t.*,
        json_build_object('id', c.id, 'name', c.name) as category,
        json_build_object('id', s.id, 'name', s.name) as "relatedSystem"
      FROM "Ticket" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      LEFT JOIN "RelatedSystem" s ON t."relatedSystemId" = s.id
      WHERE t."requesterId" = $1
      ${catIdNum ? `AND t."categoryId" = ${catIdNum}` : ''}
      ${prioStr ? `AND t."requestedPriority" = '${prioStr}'` : ''}
      ORDER BY t."${sortField}" ${sortDirection.toUpperCase()}
    `;

    const poolResult = await pool.query(sql, [req.currentRequester!.id]);
    const allTickets = poolResult.rows.map((r: any) => ({
      id: r.id,
      ticketNumber: r.ticketNumber ?? r.ticketnumber,
      requesterId: r.requesterId ?? r.requesterid,
      categoryId: r.categoryId ?? r.categoryid,
      relatedSystemId: r.relatedSystemId ?? r.relatedsystemid,
      summary: r.summary,
      description: r.description,
      requestedPriority: r.requestedPriority ?? r.requestedpriority,
      itPriority: r.itPriority ?? r.itpriority,
      currentStatus: r.currentStatus ?? r.currentstatus,
      createdAt: r.createdAt ?? r.createdat,
      updatedAt: r.updatedAt ?? r.updatedat,
      category: r.category,
      relatedSystem: r.relatedSystem ?? r.relatedsystem,
    }));

    // Case-Insensitive Search Filter in JS
    const searchFilter = typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : '';
    const filteredTickets = searchFilter
      ? allTickets.filter(
        (t: any) =>
          t.summary.toLowerCase().includes(searchFilter) ||
          t.ticketNumber.toLowerCase().includes(searchFilter)
      )
      : allTickets;

    const totalCount = filteredTickets.length;
    const totalPages = Math.ceil(totalCount / limitNum) || 1;
    const skip = (pageNum - 1) * limitNum;
    const pagedTickets = filteredTickets.slice(skip, skip + limitNum);

    const tickets = pagedTickets;

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

// GET /api/tickets/:id - Retrieve Detailed Ticket Information (Issue 8 - BR-09, BR-10)
app.get('/api/tickets/:id', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
  const ticketIdParam = req.params.id;
  const ticketId = parseInt(ticketIdParam, 10);

  try {
    const includeQuery = {
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true, email: true } },
      attachments: {
        orderBy: { createdAt: 'desc' as const },
      },
    };

    let ticket;
    if (isNaN(ticketId)) {
      ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: ticketIdParam },
        include: includeQuery,
      });
    } else {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: includeQuery,
      });
    }

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found.',
        },
      });
      return;
    }

    // Ownership Boundary Check (BR-09, BR-10)
    if (ticket.requesterId !== req.currentRequester!.id) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_TICKET_ACCESS',
          message: 'You do not have permission to view this ticket.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_TICKET_DETAIL_ERROR',
        message: 'Failed to fetch ticket detail from database.',
      },
    });
  }
});

// POST /api/tickets/:id/attachments - Upload Attachment File (Issue 8 - BR-19, BR-20, BR-23)
app.post('/api/tickets/:id/attachments', requireRequesterHeader, (req: AuthenticatedRequest, res: Response) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(422).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: 'Only JPG, PNG, WEBP, and PDF files are allowed.',
          },
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds maximum allowed limit of 5 MB.',
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_UPLOAD_ERROR',
          message: err.message || 'Error processing file upload.',
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'No file attachment was provided in the request.',
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      // Clean up uploaded file if ticketId invalid
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TICKET_ID', message: 'Invalid ticket ID format.' },
      });
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { attachments: { where: { isRemoved: false } } },
      });

      if (!ticket) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
        });
      }

      // Ownership Check (BR-23)
      if (ticket.requesterId !== req.currentRequester!.id) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_TICKET_ACCESS', message: 'You do not own this ticket.' },
        });
      }

      // Active Attachment Limit Check (BR-20: max 5 active attachments)
      if (ticket.attachments.length >= 5) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(422).json({
          success: false,
          error: {
            code: 'ATTACHMENT_LIMIT_EXCEEDED',
            message: 'A ticket can have a maximum of 5 active attachments.',
          },
        });
      }

      // Create attachment record in DB
      const newAttachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalName: req.file.originalname,
          storedName: req.file.filename,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          isRemoved: false,
        },
      });

      return res.status(201).json({
        success: true,
        data: newAttachment,
      });
    } catch (error) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Error saving attachment metadata:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'ATTACHMENT_SAVE_ERROR', message: 'Failed to save attachment metadata.' },
      });
    }
  });
});

// GET /api/attachments/:id/download - Download Active Attachment File (Issue 8 - BR-22)
app.get('/api/attachments/:id/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const attachmentId = parseInt(req.params.id, 10);
  if (isNaN(attachmentId)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ATTACHMENT_ID', message: 'Invalid attachment ID format.' },
    });
    return;
  }

  try {
    const dbRes = await pool.query(
      `SELECT a.*, t."requesterId" FROM "Attachment" a JOIN "Ticket" t ON a."ticketId" = t.id WHERE a.id = $1`,
      [attachmentId]
    );

    if (dbRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found.' },
      });
      return;
    }

    const attachment = dbRes.rows[0];
    const isRemoved = attachment.isRemoved ?? attachment.isremoved;
    const storedName = attachment.storedName ?? attachment.storedname;
    const originalName = attachment.originalName ?? attachment.originalname;
    const mimeType = attachment.mimeType ?? attachment.mimetype;
    const requesterId = attachment.requesterId ?? attachment.requesterid;

    // Ownership Check. IT Staff/Administrator may download attachments on any ticket (BR-06).
    if (req.user!.role === 'REQUESTER' && requesterId !== req.user!.id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_ATTACHMENT_ACCESS', message: 'You do not own this attachment.' },
      });
      return;
    }

    // Soft-removed Guard (BR-22)
    if (isRemoved) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ATTACHMENT_REMOVED',
          message: 'This attachment has been soft-removed and cannot be downloaded.',
        },
      });
      return;
    }

    const filePath = path.resolve(__dirname, '../uploads', storedName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND_ON_DISK', message: 'Attachment file not found on disk.' },
      });
      return;
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DOWNLOAD_ERROR', message: 'Failed to download attachment file.' },
    });
  }
});

// PATCH /api/attachments/:id/remove - Soft-Remove Attachment (Issue 8 - BR-21)
app.patch('/api/attachments/:id/remove', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
  const attachmentId = parseInt(req.params.id, 10);
  if (isNaN(attachmentId)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ATTACHMENT_ID', message: 'Invalid attachment ID format.' },
    });
    return;
  }

  const { removalReason } = req.body;
  const trimmedReason = typeof removalReason === 'string' ? removalReason.trim() : '';

  if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 200) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Removal reason is required and must be between 3 and 200 characters after trimming.',
      },
    });
    return;
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        error: { code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found.' },
      });
      return;
    }

    // Ownership Check
    if (attachment.ticket.requesterId !== req.currentRequester!.id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_ATTACHMENT_ACCESS', message: 'You do not own this attachment.' },
      });
      return;
    }

    if (attachment.isRemoved) {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REMOVED', message: 'Attachment has already been removed.' },
      });
      return;
    }

    // Perform Soft-Removal in DB via Prisma
    const updatedAttachment = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removalReason: trimmedReason,
        removedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: updatedAttachment,
    });
  } catch (error) {
    console.error('Error soft-removing attachment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REMOVE_ATTACHMENT_ERROR', message: 'Failed to soft-remove attachment.' },
    });
  }
});

// ==========================================
// PUBLIC COMMENTS & RESOLUTION SIGNAL (ISSUE 3)
// ==========================================

// Helper to find ticket by ID or TicketNumber
async function findTicketByIdOrNumber(idOrNum: string) {
  if (typeof idOrNum === 'string' && idOrNum.startsWith('TKT-')) {
    return await prisma.ticket.findUnique({
      where: { ticketNumber: idOrNum },
      include: { requester: true },
    });
  }
  const numericId = parseInt(idOrNum, 10);
  if (!isNaN(numericId)) {
    return await prisma.ticket.findUnique({
      where: { id: numericId },
      include: { requester: true },
    });
  }
  return await prisma.ticket.findUnique({
    where: { ticketNumber: idOrNum },
    include: { requester: true },
  });
}

// GET /api/tickets/:id/comments - List Public Comments (Issue 3 - FR-08, BR-04)
app.get('/api/tickets/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const ticketParam = req.params.id;

  try {
    const ticket = await findTicketByIdOrNumber(ticketParam);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Requester Ownership Check (Masked 404 if not owned). IT Staff/Administrator
    // may view Public Comments on any ticket (BR-06).
    if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId: ticket.id },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_COMMENTS_ERROR', message: 'Failed to fetch comments.' },
    });
  }
});

// POST /api/tickets/:id/comments - Create Public Comment & Problem Appears Resolved Signal (Issue 3 - FR-08, FR-10, BR-05)
app.post('/api/tickets/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const ticketParam = req.params.id;
  const { body, content, appearsResolved } = req.body;
  const commentText = typeof body === 'string' ? body : typeof content === 'string' ? content : '';
  const trimmedBody = commentText.trim();

  if (!trimmedBody || trimmedBody.length < 1 || trimmedBody.length > 2000) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Comment body is required and must be between 1 and 2000 characters after trimming.',
      },
    });
    return;
  }

  try {
    const ticket = await findTicketByIdOrNumber(ticketParam);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Requester Ownership Check (Masked 404). IT Staff/Administrator may post
    // Public Comments on any ticket (BR-06).
    if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
      res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Create Comment in DB
    const newComment = await prisma.publicComment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: trimmedBody,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Handle Problem-Appears-Resolved Signal (FR-10, BR-05) — Requester only;
    // IT Staff/Administrator formally resolve/close via the status workflow instead.
    let updatedAppearsResolvedAt: Date | null = null;
    if (appearsResolved === true && req.user!.role === 'REQUESTER') {
      updatedAppearsResolvedAt = new Date();
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { appearsResolvedAt: updatedAppearsResolvedAt },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...newComment,
        body: newComment.content,
        appearsResolvedAt: updatedAppearsResolvedAt,
      },
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'POST_COMMENT_ERROR', message: 'Failed to post comment.' },
    });
  }
});

// PATCH /api/tickets/:id/status - Requester Reopen Ticket Transition (Issue 3 - BR-05, BR-15)
app.patch('/api/tickets/:id/status', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
  const ticketParam = req.params.id;
  const { status, reason } = req.body;
  const requestedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

  if (requestedStatus !== 'REOPENED') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_STATUS_TRANSITION',
        message: 'Only IT Staff may resolve, close, or perform this status transition.',
      },
    });
    return;
  }

  try {
    const ticket = await findTicketByIdOrNumber(ticketParam);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
      });
      return;
    }

    // Requester Ownership Check
    if (ticket.requesterId !== req.currentRequester!.id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_TICKET_ACCESS', message: 'You do not own this ticket.' },
      });
      return;
    }

    // Allowed Transitions for Requester: CLOSED -> REOPENED or RESOLVED -> REOPENED
    if (ticket.currentStatus !== TicketStatus.CLOSED && ticket.currentStatus !== TicketStatus.RESOLVED) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ILLEGAL_STATUS_TRANSITION',
          message: `Cannot reopen ticket from status ${ticket.currentStatus}. Ticket must be CLOSED or RESOLVED.`,
        },
      });
      return;
    }

    // Reopen Ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: TicketStatus.REOPENED,
        updatedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    // Optionally append a reopening comment if reason provided
    if (typeof reason === 'string' && reason.trim()) {
      await prisma.publicComment.create({
        data: {
          ticketId: ticket.id,
          authorId: req.currentRequester!.id,
          content: `[Reopened Ticket]: ${reason.trim()}`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Error reopening ticket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REOPEN_TICKET_ERROR', message: 'Failed to reopen ticket.' },
    });
  }
});

// ==========================================
// STAFF TICKET QUEUE (ISSUE 4)
// ==========================================

// GET /api/staff/tickets - IT Staff / Administrator Ticket Queue (Search, Filter, Sort, Pagination)
app.get(
  '/api/staff/tickets',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const { search, status, priority, ownerId, sortBy, sortOrder, page, limit } = req.query;

    try {
      const where: any = {};

      if (typeof search === 'string' && search.trim()) {
        const term = search.trim();
        where.OR = [
          { ticketNumber: { contains: term, mode: 'insensitive' } },
          { summary: { contains: term, mode: 'insensitive' } },
        ];
      }

      if (typeof status === 'string' && Object.values(TicketStatus).includes(status.toUpperCase() as TicketStatus)) {
        where.currentStatus = status.toUpperCase() as TicketStatus;
      }

      if (typeof priority === 'string' && Object.values(Priority).includes(priority.toUpperCase() as Priority)) {
        where.itPriority = priority.toUpperCase() as Priority;
      }

      if (typeof ownerId === 'string' && ownerId.trim()) {
        if (ownerId.trim().toLowerCase() === 'unassigned') {
          where.ownerId = null;
        } else {
          const ownerIdNum = parseInt(ownerId, 10);
          if (!isNaN(ownerIdNum)) {
            where.ownerId = ownerIdNum;
          }
        }
      }

      const validSortFields = ['createdAt', 'updatedAt', 'ticketNumber', 'itPriority', 'currentStatus'];
      const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
      const sortDirection = (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const [total, tickets] = await prisma.$transaction([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy: { [sortField]: sortDirection },
          skip,
          take: limitNum,
          include: {
            requester: { select: { id: true, name: true, email: true } },
            owner: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            total,
            page: pageNum,
            totalPages,
            limit: limitNum,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching staff ticket queue:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_STAFF_QUEUE_ERROR', message: 'Failed to fetch ticket queue.' },
      });
    }
  }
);

// ==========================================
// STAFF TICKET OPERATIONS (ISSUE 5)
// ==========================================

const VALID_TRANSITIONS: Record<string, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN, TicketStatus.CANCELLED],
  CLOSED: [],
  CANCELLED: [],
};

// GET /api/staff/tickets/:id - Retrieve One Ticket for IT Staff Operations
app.get(
  '/api/staff/tickets/:id',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { id: isNaN(parseInt(req.params.id, 10)) ? -1 : parseInt(req.params.id, 10) },
            { ticketNumber: req.params.id },
          ],
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
        });
        return;
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      console.error('Error fetching staff ticket detail:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_TICKET_DETAIL_ERROR', message: 'Failed to fetch ticket detail.' },
      });
    }
  }
);

// GET /api/staff/members - Active IT Staff & Administrator Lookup (for Reassign Owner)
app.get(
  '/api/staff/members',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const members = await prisma.user.findMany({
        where: { role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] }, isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error('Error fetching staff members:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_MEMBERS_ERROR', message: 'Failed to fetch staff members.' },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/ownership - Claim or Reassign Ticket Ownership
app.patch(
  '/api/staff/tickets/:id/ownership',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const ticketId = parseInt(req.params.id, 10);
    const { ownerId } = req.body;
    const ownerIdNum = parseInt(ownerId, 10);

    if (isNaN(ticketId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TICKET_ID', message: 'Invalid ticket ID.' } });
      return;
    }
    if (isNaN(ownerIdNum)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ownerId is required and must be an integer.' } });
      return;
    }

    try {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
        return;
      }

      // Ownership Authority Check (BR-07): target must be an active IT_STAFF or ADMINISTRATOR.
      const targetUser = await prisma.user.findUnique({ where: { id: ownerIdNum } });
      if (!targetUser || !targetUser.isActive || (targetUser.role !== Role.IT_STAFF && targetUser.role !== Role.ADMINISTRATOR)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_OWNER', message: 'Ticket owner must be an active IT Staff or Administrator account.' },
        });
        return;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ownerId: ownerIdNum },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
      console.error('Error updating ticket ownership:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_OWNERSHIP_ERROR', message: 'Failed to update ticket ownership.' },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/priority - Update IT Priority
app.patch(
  '/api/staff/tickets/:id/priority',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const ticketId = parseInt(req.params.id, 10);
    const { itPriority } = req.body;
    const normalizedPriority = typeof itPriority === 'string' ? itPriority.trim().toUpperCase() : '';

    if (isNaN(ticketId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TICKET_ID', message: 'Invalid ticket ID.' } });
      return;
    }
    if (!Object.values(Priority).includes(normalizedPriority as Priority)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'itPriority must be one of LOW, MEDIUM, HIGH, CRITICAL.' },
      });
      return;
    }

    try {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
        return;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority: normalizedPriority as Priority },
      });

      res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
      console.error('Error updating IT priority:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_PRIORITY_ERROR', message: 'Failed to update IT Priority.' },
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/status - Permitted Ticket Status Workflow Transitions
app.patch(
  '/api/staff/tickets/:id/status',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const ticketId = parseInt(req.params.id, 10);
    const { status, resolutionSummary } = req.body;
    const requestedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

    if (isNaN(ticketId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TICKET_ID', message: 'Invalid ticket ID.' } });
      return;
    }
    if (!Object.values(TicketStatus).includes(requestedStatus as TicketStatus)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status must be a valid ticket status.' },
      });
      return;
    }

    try {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
        return;
      }

      const permitted = VALID_TRANSITIONS[ticket.currentStatus] || [];
      if (!permitted.includes(requestedStatus as TicketStatus)) {
        res.status(409).json({
          success: false,
          error: {
            code: 'ILLEGAL_STATUS_TRANSITION',
            message: `Cannot transition ticket from ${ticket.currentStatus} to ${requestedStatus}.`,
          },
        });
        return;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          currentStatus: requestedStatus as TicketStatus,
          ...(typeof resolutionSummary === 'string' && resolutionSummary.trim()
            ? { resolutionSummary: resolutionSummary.trim() }
            : {}),
        },
      });

      res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_STATUS_ERROR', message: 'Failed to update ticket status.' },
      });
    }
  }
);

// GET /api/staff/tickets/:id/internal-notes - Retrieve Internal Notes (IT Staff/Admin only)
app.get(
  '/api/staff/tickets/:id/internal-notes',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const ticketParam = req.params.id;

    try {
      const ticket = await findTicketByIdOrNumber(ticketParam);
      if (!ticket) {
        res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
        return;
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId: ticket.id },
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      });

      res.status(200).json({ success: true, data: notes });
    } catch (error) {
      console.error('Error fetching internal notes:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_NOTES_ERROR', message: 'Failed to fetch internal notes.' },
      });
    }
  }
);

// POST /api/staff/tickets/:id/internal-notes - Create Internal Note (IT Staff/Admin only)
app.post(
  '/api/staff/tickets/:id/internal-notes',
  requireAuth,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const ticketParam = req.params.id;
    const { content } = req.body;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    if (!trimmedContent || trimmedContent.length < 1 || trimmedContent.length > 2000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Note content is required and must be between 1 and 2000 characters after trimming.',
        },
      });
      return;
    }

    try {
      const ticket = await findTicketByIdOrNumber(ticketParam);
      if (!ticket) {
        res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
        return;
      }

      const newNote = await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.id,
          content: trimmedContent,
        },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      res.status(201).json({ success: true, data: newNote });
    } catch (error) {
      console.error('Error posting internal note:', error);
      res.status(500).json({
        success: false,
        error: { code: 'POST_NOTE_ERROR', message: 'Failed to post internal note.' },
      });
    }
  }
);

// ==========================================
// ADMINISTRATOR USER MANAGEMENT (ISSUE 6)
// ==========================================

const VALID_ROLES = Object.values(Role);

// GET /api/admin/users - List Users with Search & Role Filter
app.get(
  '/api/admin/users',
  requireAuth,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const { search, role } = req.query;

    try {
      const where: any = {};

      if (typeof search === 'string' && search.trim()) {
        const term = search.trim();
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ];
      }

      if (typeof role === 'string' && VALID_ROLES.includes(role.toUpperCase() as Role)) {
        where.role = role.toUpperCase() as Role;
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, isActive: true, requiresPasswordChange: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_USERS_ERROR', message: 'Failed to fetch users.' },
      });
    }
  }
);

// POST /api/admin/users - Create a New User Account
app.post(
  '/api/admin/users',
  requireAuth,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, email, role, isActive, initialPassword } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';

    const validationDetails: Array<{ field: string; message: string }> = [];
    if (!trimmedName || trimmedName.length < 2) {
      validationDetails.push({ field: 'name', message: 'Name is required and must be at least 2 characters.' });
    }
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      validationDetails.push({ field: 'email', message: 'A valid email address is required.' });
    }
    if (!VALID_ROLES.includes(normalizedRole as Role)) {
      validationDetails.push({ field: 'role', message: 'Role must be one of REQUESTER, IT_STAFF, ADMINISTRATOR.' });
    }

    let complexity: { isValid: boolean; message?: string } = { isValid: true };
    if (typeof initialPassword !== 'string' || !initialPassword) {
      validationDetails.push({ field: 'initialPassword', message: 'Initial password is required.' });
    } else {
      complexity = validatePasswordComplexity(initialPassword);
      if (!complexity.isValid) {
        validationDetails.push({ field: 'initialPassword', message: complexity.message || 'Password does not meet complexity requirements.' });
      }
    }

    if (validationDetails.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed for one or more fields.', details: validationDetails },
      });
      return;
    }

    try {
      // Email Uniqueness Check (BR-11, case-insensitive)
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_EMAIL', message: 'A user with this email address already exists.' },
        });
        return;
      }

      const newUser = await prisma.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          role: normalizedRole as Role,
          isActive: isActive !== false,
          passwordHash: hashPassword(initialPassword),
          requiresPasswordChange: true,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true, requiresPasswordChange: true },
      });

      res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_USER_ERROR', message: 'Failed to create user.' },
      });
    }
  }
);

// PATCH /api/admin/users/:id - Update Basic Account Info, Role & Active State
app.patch(
  '/api/admin/users/:id',
  requireAuth,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const targetId = parseInt(req.params.id, 10);
    const { name, email, role, isActive } = req.body;

    if (isNaN(targetId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'Invalid user ID.' } });
      return;
    }

    try {
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
        return;
      }

      const updateData: any = {};

      if (typeof name === 'string') {
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 2) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Name must be at least 2 characters.' },
          });
          return;
        }
        updateData.name = trimmedName;
      }

      if (typeof email === 'string') {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required.' },
          });
          return;
        }
        // Email Uniqueness Check excluding self (BR-11)
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing && existing.id !== targetId) {
          res.status(400).json({
            success: false,
            error: { code: 'DUPLICATE_EMAIL', message: 'A user with this email address already exists.' },
          });
          return;
        }
        updateData.email = normalizedEmail;
      }

      let normalizedRole: Role | undefined;
      if (typeof role === 'string') {
        normalizedRole = role.trim().toUpperCase() as Role;
        if (!VALID_ROLES.includes(normalizedRole)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Role must be one of REQUESTER, IT_STAFF, ADMINISTRATOR.' },
          });
          return;
        }
        updateData.role = normalizedRole;
      }

      // BR-13: Self-Deactivation Guard
      if (targetId === req.user!.id && isActive === false) {
        res.status(400).json({
          success: false,
          error: { code: 'SELF_DEACTIVATION_FORBIDDEN', message: 'You cannot deactivate your own account.' },
        });
        return;
      }

      // BR-14: Last Administrator Guard — block if this update would remove the
      // target's active-Administrator status and no other active Administrator remains.
      const losingAdminStatus =
        targetUser.role === Role.ADMINISTRATOR &&
        ((isActive === false) || (normalizedRole !== undefined && normalizedRole !== Role.ADMINISTRATOR));

      if (losingAdminStatus) {
        const otherActiveAdmins = await prisma.user.count({
          where: { role: Role.ADMINISTRATOR, isActive: true, id: { not: targetId } },
        });
        if (otherActiveAdmins === 0) {
          res.status(400).json({
            success: false,
            error: { code: 'LAST_ADMIN_GUARD', message: 'The system must have at least one active Administrator.' },
          });
          return;
        }
      }

      if (typeof isActive === 'boolean') {
        updateData.isActive = isActive;
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, isActive: true, requiresPasswordChange: true },
      });

      res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_USER_ERROR', message: 'Failed to update user.' },
      });
    }
  }
);

// POST /api/admin/users/:id/reset-password - Issue a New Initial Password
app.post(
  '/api/admin/users/:id/reset-password',
  requireAuth,
  requireRole(Role.ADMINISTRATOR),
  async (req: AuthenticatedRequest, res: Response) => {
    const targetId = parseInt(req.params.id, 10);
    const { newInitialPassword } = req.body;

    if (isNaN(targetId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'Invalid user ID.' } });
      return;
    }

    if (typeof newInitialPassword !== 'string' || !newInitialPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A new initial password is required.' },
      });
      return;
    }

    const complexity = validatePasswordComplexity(newInitialPassword);
    if (!complexity.isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: complexity.message },
      });
      return;
    }

    try {
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data: {
          passwordHash: hashPassword(newInitialPassword),
          requiresPasswordChange: true,
        },
        select: { id: true, name: true, email: true, role: true, isActive: true, requiresPasswordChange: true },
      });

      res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        error: { code: 'RESET_PASSWORD_ERROR', message: 'Failed to reset password.' },
      });
    }
  }
);

export { app };
export default app;


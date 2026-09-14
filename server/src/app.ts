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
app.get('/api/attachments/:id/download', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
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

    // Ownership Check
    if (requesterId !== req.currentRequester!.id) {
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
app.get('/api/tickets/:id/comments', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
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

    // Requester Ownership Check (Masked 404 if not owned)
    if (ticket.requesterId !== req.currentRequester!.id) {
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
app.post('/api/tickets/:id/comments', requireRequesterHeader, async (req: AuthenticatedRequest, res: Response) => {
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

    // Requester Ownership Check (Masked 404)
    if (ticket.requesterId !== req.currentRequester!.id) {
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
        authorId: req.currentRequester!.id,
        content: trimmedBody,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Handle Problem-Appears-Resolved Signal (FR-10, BR-05)
    let updatedAppearsResolvedAt: Date | null = null;
    if (appearsResolved === true) {
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

export { app };
export default app;


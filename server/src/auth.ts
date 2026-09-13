import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './app';
import { Role } from '../generated/prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'toktickit_lab3_secret_key_super_secure';

export interface AuthenticatedUserPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  requiresPasswordChange: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
  currentRequester?: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
  };
}

// Utility: Hash Password
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Utility: Compare Password
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Utility: Generate JWT Token
export function generateToken(user: AuthenticatedUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      requiresPasswordChange: user.requiresPasswordChange,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Utility: Password Complexity Validation
export function validatePasswordComplexity(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number or special character.' };
  }
  return { isValid: true };
}

// Middleware: Require Authentication
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // 1. Extract token from Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Extract token from Cookie
  if (!token && req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token;
  }

  // 3. Backward Compatibility Fallback: X-Dev-Requester-Id Header
  const requesterIdHeader = req.header('X-Dev-Requester-Id');
  if (!token && requesterIdHeader) {
    const requesterId = parseInt(requesterIdHeader, 10);
    if (!isNaN(requesterId)) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: requesterId } });
        if (dbUser && dbUser.isActive) {
          req.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            isActive: dbUser.isActive,
            requiresPasswordChange: dbUser.requiresPasswordChange,
          };
          req.currentRequester = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            isActive: dbUser.isActive,
          };
          next();
          return;
        }
      } catch (err) {
        // Fallback check failed
      }
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token or valid session is required.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUserPayload;
    
    // Check if user is still active in DB
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!dbUser || !dbUser.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INACTIVE',
          message: 'Account is disabled. Please contact IT support.',
        },
      });
      return;
    }

    const payload: AuthenticatedUserPayload = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.isActive,
      requiresPasswordChange: dbUser.requiresPasswordChange,
    };

    req.user = payload;
    req.currentRequester = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      isActive: dbUser.isActive,
    };

    // Mandatory first-login password change guard
    if (dbUser.requiresPasswordChange && req.path !== '/api/auth/change-password' && req.path !== '/api/auth/logout' && req.path !== '/api/auth/me') {
      res.status(403).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Mandatory password change required before accessing the application.',
        },
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication session.',
      },
    });
  }
};

// Middleware: Require Specific Role(s)
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ACCESS',
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};

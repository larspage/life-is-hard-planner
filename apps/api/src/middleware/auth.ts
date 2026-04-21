import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'

/**
 * Extends Express Request to include user
 */
export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

/**
 * Auth middleware - verifies JWT token and attaches user to request
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    req.userId = decoded.userId
    req.userEmail = decoded.email

    next()
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' })
  }
}

/**
 * Optional auth middleware - doesn't fail if no token, but attaches user if valid
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    req.userId = decoded.userId
    req.userEmail = decoded.email

    next()
  } catch (error) {
    // Invalid token, but continue anyway (optional auth)
    next()
  }
}
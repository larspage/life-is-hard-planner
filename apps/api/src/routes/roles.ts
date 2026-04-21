import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/roles
 * List user's roles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Add auth middleware
    const roles = await prisma.role.findMany()
    res.json({ roles })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

export default router
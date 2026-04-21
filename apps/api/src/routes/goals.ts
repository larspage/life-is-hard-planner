import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/goals
 * List user's goals
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, horizon, roleId } = req.query

    const where: any = { userId: req.userId }
    if (status) where.status = status
    if (horizon) where.horizon = horizon
    if (roleId) where.roleId = roleId

    const goals = await prisma.goal.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    })
    logInformation('Fetched goals', { userId: req.userId, count: goals.length })
    res.json({ goals })
  } catch (error) {
    logError('Failed to fetch goals', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to fetch goals' })
  }
})

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, horizon, targetDate, roleId, status } = req.body

    if (!title) {
      logWarning('Goal creation failed: missing title', { userId: req.userId })
      return res.status(400).json({ error: 'Title is required' })
    }

    if (!horizon || !['LONG_TERM', 'MID_TERM'].includes(horizon)) {
      logWarning('Goal creation failed: invalid horizon', { userId: req.userId, horizon })
      return res.status(400).json({ error: 'Horizon must be LONG_TERM or MID_TERM' })
    }

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        description,
        horizon,
        targetDate: targetDate ? new Date(targetDate) : null,
        roleId: roleId || null,
        status: status || 'ACTIVE',
      },
    })

    logInformation('Goal created', { goalId: goal.id, userId: req.userId, title })
    res.status(201).json({ goal })
  } catch (error) {
    logError('Failed to create goal', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to create goal' })
  }
})

/**
 * PUT /api/goals/:id
 * Update a goal
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, horizon, targetDate, roleId, status } = req.body

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Goal update failed: not found', { goalId: id, userId: req.userId })
      return res.status(404).json({ error: 'Goal not found' })
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(horizon && { horizon }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(roleId !== undefined && { roleId }),
        ...(status && { status }),
      },
    })

    logInformation('Goal updated', { goalId: goal.id, userId: req.userId })
    res.json({ goal })
  } catch (error) {
    logError('Failed to update goal', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to update goal' })
  }
})

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Goal delete failed: not found', { goalId: id, userId: req.userId })
      return res.status(404).json({ error: 'Goal not found' })
    }

    await prisma.goal.delete({
      where: { id },
    })

    logInformation('Goal deleted', { goalId: id, userId: req.userId })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to delete goal', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to delete goal' })
  }
})

export default router
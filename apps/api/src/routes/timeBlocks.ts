import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/time-blocks
 * List user's time blocks with date filter
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const where: any = { userId: req.userId }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }

    const timeBlocks = await prisma.timeBlock.findMany({
      where,
      include: { task: true },
      orderBy: { startTime: 'asc' },
    })

    logInformation('Fetched time blocks', { userId: req.userId, count: timeBlocks.length })
    res.json({ timeBlocks })
  } catch (error) {
    logError('Failed to fetch time blocks', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to fetch time blocks' })
  }
})

/**
 * POST /api/time-blocks
 * Create a time block (schedule a task)
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, startTime, endTime } = req.body

    if (!taskId || !startTime || !endTime) {
      logWarning('Time block creation failed: missing required fields', { userId: req.userId })
      return res.status(400).json({ error: 'taskId, startTime, and endTime are required' })
    }

    // Verify task ownership
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId },
    })

    if (!task) {
      logWarning('Time block creation failed: task not found', { taskId, userId: req.userId })
      return res.status(404).json({ error: 'Task not found' })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    const timeBlock = await prisma.timeBlock.create({
      data: {
        taskId,
        userId: req.userId!,
        startTime: start,
        endTime: end,
        date: start,
      },
    })

    // Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'SCHEDULED' },
    })

    logInformation('Time block created', { timeBlockId: timeBlock.id, userId: req.userId, taskId })
    res.status(201).json({ timeBlock })
  } catch (error) {
    logError('Failed to create time block', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to create time block' })
  }
})

/**
 * PUT /api/time-blocks/:id
 * Reschedule a time block
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { startTime, endTime } = req.body

    // Verify ownership
    const existing = await prisma.timeBlock.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Time block update failed: not found', { timeBlockId: id, userId: req.userId })
      return res.status(404).json({ error: 'Time block not found' })
    }

    const start = startTime ? new Date(startTime) : existing.startTime
    const end = endTime ? new Date(endTime) : existing.endTime

    const timeBlock = await prisma.timeBlock.update({
      where: { id },
      data: {
        startTime: start,
        endTime: end,
        date: start,
      },
    })

    logInformation('Time block updated', { timeBlockId: timeBlock.id, userId: req.userId })
    res.json({ timeBlock })
  } catch (error) {
    logError('Failed to update time block', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to update time block' })
  }
})

/**
 * DELETE /api/time-blocks/:id
 * Remove a time block (unschedule)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.timeBlock.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Time block delete failed: not found', { timeBlockId: id, userId: req.userId })
      return res.status(404).json({ error: 'Time block not found' })
    }

    const taskId = existing.taskId

    await prisma.timeBlock.delete({
      where: { id },
    })

    // Update task status back to TODO if no more blocks
    const remainingBlocks = await prisma.timeBlock.count({
      where: { taskId },
    })

    if (remainingBlocks === 0) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'TODO' },
      })
    }

    logInformation('Time block deleted', { timeBlockId: id, userId: req.userId })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to delete time block', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to delete time block' })
  }
})

export default router
import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/tasks
 * List user's tasks with filters
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, quadrant, roleId, goalId, search } = req.query

    const where: any = { userId: req.userId }
    if (status) where.status = status
    if (quadrant) where.quadrant = quadrant
    if (roleId) where.roleId = roleId
    if (goalId) where.goalId = goalId

    const tasks = await prisma.task.findMany({
      where,
      include: { role: true, goal: true, parentTask: true },
      orderBy: [{ priorityType: 'desc' }, { createdAt: 'desc' }],
    })

    // Filter by search if provided
    let filteredTasks = tasks
    if (search) {
      const searchLower = (search as string).toLowerCase()
      filteredTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      )
    }

    logInformation('Fetched tasks', { userId: req.userId, count: filteredTasks.length })
    res.json({ tasks: filteredTasks })
  } catch (error) {
    logError('Failed to fetch tasks', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      title, description, duration, quadrant, roleId, goalId, 
      parentTaskId, priorityType, energyLevel 
    } = req.body

    if (!title || !duration) {
      logWarning('Task creation failed: missing title or duration', { userId: req.userId })
      return res.status(400).json({ error: 'Title and duration are required' })
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        duration,
        quadrant: quadrant || 'I',
        roleId: roleId || null,
        goalId: goalId || null,
        parentTaskId: parentTaskId || null,
        priorityType: priorityType || 'NORMAL',
        energyLevel: energyLevel || null,
        status: 'TODO',
      },
    })

    logInformation('Task created', { taskId: task.id, userId: req.userId, title })
    res.status(201).json({ task })
  } catch (error) {
    logError('Failed to create task', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to create task' })
  }
})

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, duration, quadrant, roleId, goalId, priorityType, energyLevel, status } = req.body

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Task update failed: not found', { taskId: id, userId: req.userId })
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(duration && { duration }),
        ...(quadrant && { quadrant }),
        ...(roleId !== undefined && { roleId }),
        ...(goalId !== undefined && { goalId }),
        ...(priorityType && { priorityType }),
        ...(energyLevel !== undefined && { energyLevel }),
        ...(status && { status }),
      },
    })

    logInformation('Task updated', { taskId: task.id, userId: req.userId })
    res.json({ task })
  } catch (error) {
    logError('Failed to update task', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to update task' })
  }
})

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Task delete failed: not found', { taskId: id, userId: req.userId })
      return res.status(404).json({ error: 'Task not found' })
    }

    await prisma.task.delete({
      where: { id },
    })

    logInformation('Task deleted', { taskId: id, userId: req.userId })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to delete task', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

/**
 * POST /api/tasks/:id/split
 * Split task into time blocks
 */
router.post('/:id/split', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { chunkMinutes = 30 } = req.body

    // Verify ownership
    const task = await prisma.task.findFirst({
      where: { id, userId: req.userId },
    })

    if (!task) {
      logWarning('Task split failed: not found', { taskId: id, userId: req.userId })
      return res.status(404).json({ error: 'Task not found' })
    }

    if (task.duration <= chunkMinutes) {
      return res.status(400).json({ error: 'Task duration less than chunk size' })
    }

    // Calculate number of chunks
    const numChunks = Math.ceil(task.duration / chunkMinutes)
    const startTime = new Date()
    startTime.setHours(9, 0, 0, 0)

    const timeBlocks = []
    for (let i = 0; i < numChunks; i++) {
      const blockStart = new Date(startTime.getTime() + i * chunkMinutes * 60 * 1000)
      const blockEnd = new Date(blockStart.getTime() + chunkMinutes * 60 * 1000)

      const block = await prisma.timeBlock.create({
        data: {
          taskId: task.id,
          userId: req.userId!,
          startTime: blockStart,
          endTime: blockEnd,
          date: blockStart,
        },
      })
      timeBlocks.push(block)
    }

    logInformation('Task split into blocks', { 
      taskId: task.id, 
      userId: req.userId, 
      chunkCount: timeBlocks.length 
    })
    res.json({ timeBlocks })
  } catch (error) {
    logError('Failed to split task', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to split task' })
  }
})

/**
 * POST /api/tasks/:id/migrate
 * Move incomplete task to future
 */
router.post('/:id/migrate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { days = 1 } = req.body

    // Verify ownership
    const task = await prisma.task.findFirst({
      where: { id, userId: req.userId },
      include: { timeBlocks: true },
    })

    if (!task) {
      logWarning('Task migrate failed: not found', { taskId: id, userId: req.userId })
      return res.status(404).json({ error: 'Task not found' })
    }

    // Move time blocks
    for (const block of task.timeBlocks) {
      await prisma.timeBlock.update({
        where: { id: block.id },
        data: {
          startTime: new Date(block.startTime.getTime() + days * 24 * 60 * 60 * 1000),
          endTime: new Date(block.endTime.getTime() + days * 24 * 60 * 60 * 1000),
          date: new Date(block.date.getTime() + days * 24 * 60 * 60 * 1000),
        },
      })
    }

    logInformation('Task migrated', { taskId: task.id, userId: req.userId, days })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to migrate task', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to migrate task' })
  }
})

export default router
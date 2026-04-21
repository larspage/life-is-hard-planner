import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/values
 * List user's values (guiding principles)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const values = await prisma.value.findMany({
      where: { userId: req.userId },
    })
    logInformation('Fetched values', { userId: req.userId, count: values.length })
    res.json({ values })
  } catch (error) {
    logError('Failed to fetch values', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to fetch values' })
  }
})

/**
 * POST /api/values
 * Create a new value
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { text, tags } = req.body

    if (!text) {
      logWarning('Value creation failed: missing text', { userId: req.userId })
      return res.status(400).json({ error: 'Text is required' })
    }

    const value = await prisma.value.create({
      data: {
        userId: req.userId!,
        text,
        tags: tags || [],
      },
    })

    logInformation('Value created', { valueId: value.id, userId: req.userId })
    res.status(201).json({ value })
  } catch (error) {
    logError('Failed to create value', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to create value' })
  }
})

/**
 * DELETE /api/values/:id
 * Delete a value
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.value.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Value delete failed: not found', { valueId: id, userId: req.userId })
      return res.status(404).json({ error: 'Value not found' })
    }

    await prisma.value.delete({
      where: { id },
    })

    logInformation('Value deleted', { valueId: id, userId: req.userId })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to delete value', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to delete value' })
  }
})

export default router
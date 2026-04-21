import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/roles
 * List user's roles
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      where: { userId: req.userId },
      orderBy: { priorityWeight: 'desc' },
    })
    logInformation('Fetched roles', { userId: req.userId, count: roles.length })
    res.json({ roles })
  } catch (error) {
    logError('Failed to fetch roles', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

/**
 * POST /api/roles
 * Create a new role
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, priorityWeight, color } = req.body

    if (!name) {
      logWarning('Role creation failed: missing name', { userId: req.userId })
      return res.status(400).json({ error: 'Name is required' })
    }

    const role = await prisma.role.create({
      data: {
        userId: req.userId!,
        name,
        description,
        priorityWeight: priorityWeight || 3,
        color: color || '#6366f1',
      },
    })

    logInformation('Role created', { roleId: role.id, userId: req.userId, name })
    res.status(201).json({ role })
  } catch (error) {
    logError('Failed to create role', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to create role' })
  }
})

/**
 * PUT /api/roles/:id
 * Update a role
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, priorityWeight, color } = req.body

    // Verify ownership
    const existing = await prisma.role.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Role update failed: not found', { roleId: id, userId: req.userId })
      return res.status(404).json({ error: 'Role not found' })
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(priorityWeight && { priorityWeight }),
        ...(color && { color }),
      },
    })

    logInformation('Role updated', { roleId: role.id, userId: req.userId })
    res.json({ role })
  } catch (error) {
    logError('Failed to update role', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to update role' })
  }
})

/**
 * DELETE /api/roles/:id
 * Delete a role
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.role.findFirst({
      where: { id, userId: req.userId },
    })

    if (!existing) {
      logWarning('Role delete failed: not found', { roleId: id, userId: req.userId })
      return res.status(404).json({ error: 'Role not found' })
    }

    await prisma.role.delete({
      where: { id },
    })

    logInformation('Role deleted', { roleId: id, userId: req.userId })
    res.json({ success: true })
  } catch (error) {
    logError('Failed to delete role', { error: String(error), userId: req.userId })
    res.status(500).json({ error: 'Failed to delete role' })
  }
})

export default router
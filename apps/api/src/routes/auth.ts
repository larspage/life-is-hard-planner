import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { logger, logInformation, logWarning, logError } from '../lib/logger'

const router = Router()
const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production'
const MOCK_AUTH = process.env.MOCK_AUTH === 'true'

// Mock users for development
const MOCK_USERS = [
  { id: uuidv4(), email: 'demo@lifeos.app', password: 'demo123' },
  { id: uuidv4(), email: 'larry@lifeos.app', password: 'larry123' },
]

/**
 * POST /api/auth/register
 * Create a new user account with 60-day trial
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      logWarning('Registration failed: missing email or password', { email })
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      logWarning('Registration failed: user already exists', { email })
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user with 60-day trial
    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 60)

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        subscriptionTier: 'TRIAL',
        trialExpiresAt,
        timeScaleConfig: {
          boulder: { value: 2, unit: 'hours' },
          rock: { value: 1, unit: 'hours' },
          pebble: { value: 15, unit: 'minutes' },
          sand: { value: 5, unit: 'minutes' },
        },
      },
    })

    logInformation('User registered', { userId: user.id, email })

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier },
      token,
    })
  } catch (error) {
    logError('Registration error', { error: String(error) })
    res.status(500).json({ error: 'Registration failed' })
  }
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      logWarning('Login failed: missing credentials', { email })
      return res.status(400).json({ error: 'Email and password required' })
    }

    let user

    if (MOCK_AUTH) {
      // Mock authentication for development
      const mockUser = MOCK_USERS.find((u) => u.email === email && u.password === password)
      if (!mockUser) {
        logWarning('Mock login failed: invalid credentials', { email })
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Find or create mock user in database
      user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: mockUser.id,
            email,
            passwordHash: await bcrypt.hash(password, 10),
            subscriptionTier: 'TRIAL',
            trialExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        })
      }
    } else {
      // Real authentication
      user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        logWarning('Login failed: user not found', { email })
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        logWarning('Login failed: invalid password', { email })
        return res.status(401).json({ error: 'Invalid credentials' })
      }
    }

    // Check trial expiration
    if (user.trialExpiresAt && new Date() > user.trialExpiresAt && user.subscriptionTier === 'TRIAL') {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionTier: 'FREE' },
      })
      user.subscriptionTier = 'FREE'
    }

    logInformation('User logged in', { userId: user.id, email })

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier },
      token,
    })
  } catch (error) {
    logError('Login error', { error: String(error) })
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        trialExpiresAt: true,
        subscriptionExpiresAt: true,
        uploadedBytes: true,
        timeScaleConfig: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    logError('Get current user error', { error: String(error) })
    res.status(401).json({ error: 'Unauthorized' })
  }
})

export default router
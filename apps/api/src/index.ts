import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { logger, logInformation, logError } from './lib/logger'

// Initialize Prisma client
export const prisma = new PrismaClient()

// Import routes
import authRoutes from './routes/auth'
import rolesRoutes from './routes/roles'
import valuesRoutes from './routes/values'
import goalsRoutes from './routes/goals'
import tasksRoutes from './routes/tasks'
import timeBlocksRoutes from './routes/timeBlocks'
import subscriptionRoutes from './routes/subscription'
import uploadsRoutes from './routes/uploads'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware (performance)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      logger.performance(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        duration_ms: duration,
        status: res.statusCode,
      })
    }
  })
  next()
})

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/roles', rolesRoutes)
app.use('/api/values', valuesRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/time-blocks', timeBlocksRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/uploads', uploadsRoutes)

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logError(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  })
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect()
    logInformation('Database connected', { component: 'prisma' })

    app.listen(PORT, () => {
      logInformation('Server started', { port: PORT, component: 'express' })
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInformation('Shutting down server')
  await prisma.$disconnect()
  process.exit(0)
})

start()

export default app
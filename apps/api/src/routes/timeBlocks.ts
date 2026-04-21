import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: TimeBlocks CRUD
router.get('/', (req: Request, res: Response) => {
  res.json({ timeBlocks: [] })
})

export default router
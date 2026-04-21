import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: Goals CRUD
router.get('/', (req: Request, res: Response) => {
  res.json({ goals: [] })
})

export default router
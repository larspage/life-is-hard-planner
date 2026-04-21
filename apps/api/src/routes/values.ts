import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: Values CRUD
router.get('/', (req: Request, res: Response) => {
  res.json({ values: [] })
})

export default router
import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: Tasks CRUD
router.get('/', (req: Request, res: Response) => {
  res.json({ tasks: [] })
})

export default router
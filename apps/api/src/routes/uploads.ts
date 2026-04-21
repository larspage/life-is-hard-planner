import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: File uploads
router.get('/', (req: Request, res: Response) => {
  res.json({ uploads: [] })
})

export default router
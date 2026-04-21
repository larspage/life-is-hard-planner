import { Router, Request, Response } from 'express'

const router = Router()

// Placeholder: Subscription status
router.get('/status', (req: Request, res: Response) => {
  res.json({ subscriptionTier: 'TRIAL', trialExpiresAt: null })
})

export default router
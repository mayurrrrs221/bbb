import { Router } from 'express';

export const authRouter = Router();

// Placeholder auth routes (Firebase handles most on client)
authRouter.get('/me', (req, res) => {
  res.json({ ok: true, data: { message: 'Auth via Firebase client SDK' } });
});

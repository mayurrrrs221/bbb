import { Router } from 'express';

export const ocrRouter = Router();

// Placeholder for future OCR-based receipt import
ocrRouter.post('/receipt', async (req, res) => {
  res.json({ ok: true, data: { message: 'OCR endpoint placeholder' } });
});

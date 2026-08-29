import { Router } from 'express';
import { z } from 'zod';
import { resolveIdentity } from '../auth/middleware.js';
import { runChat } from '../llm/loop.js';
import { scanForInjection, shouldBlock } from '../guardrails/index.js';

export const chatRouter: Router = Router();

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
});

chatRouter.post('/chat', resolveIdentity, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'body must be { message: string }' });
    return;
  }
  const ctx = req.ctx!;

  // Direct injection check on user input. Cheaper and less interesting than the
  // tool-result scan, but it closes the obvious front door.
  const scan = scanForInjection(parsed.data.message);
  if (shouldBlock(scan)) {
    res.status(400).json({
      error: 'message rejected',
      findings: scan.findings.map((f) => f.rule),
    });
    return;
  }

  try {
    const turn = await runChat(ctx, parsed.data.message);
    res.json(turn);
  } catch (err) {
    console.error('[chat] failed', err);
    res.status(500).json({ error: 'chat failed' });
  }
});

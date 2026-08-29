import { Router } from 'express';
import { resolveIdentity } from '../auth/middleware.js';
import { listDoors } from '../tools/handlers.js';

/**
 * A plain REST endpoint alongside the LLM path — useful for showing that the
 * same tenant scoping applies whether a human or a model is asking.
 */
export const doorsRouter: Router = Router();

doorsRouter.get('/doors', resolveIdentity, async (req, res) => {
  try {
    const result = await listDoors(req.ctx!, { locked_only: req.query['locked'] === 'true' });
    res.json({ doors: result.rows });
  } catch (err) {
    console.error('[doors] failed', err);
    res.status(500).json({ error: 'lookup failed' });
  }
});

import type { Request, Response, NextFunction } from 'express';
import type { RequestContext, Role } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}

const ROLES: Role[] = ['viewer', 'operator', 'admin'];

/**
 * Development identity resolution via headers.
 *
 * TODO(you): replace with real JWT verification before this goes anywhere real.
 * The important property to preserve is that tenantId comes from a *signed*
 * claim and never from anything the caller can freely set — and never from
 * anything the model produced.
 */
export function resolveIdentity(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.header('x-tenant-id');
  const userId = req.header('x-user-id');
  const role = req.header('x-role') as Role | undefined;

  if (!tenantId || !userId || !role || !ROLES.includes(role)) {
    res.status(401).json({ error: 'missing or invalid identity headers' });
    return;
  }

  req.ctx = { tenantId, userId, role };
  next();
}

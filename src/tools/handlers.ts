import type { RequestContext } from '../types.js';
import { getPool } from '../db/pool.js';

/**
 * Every query below takes tenantId as its first bound parameter, sourced from
 * the RequestContext. There is deliberately no code path that builds a query
 * without it.
 */

export interface HandlerResult {
  rows: unknown[];
  /** Rendered for the model. Kept compact — this lands in the context window. */
  text: string;
}

function maskCard(card: string): string {
  return card.length <= 4 ? '****' : `****-${card.slice(-4)}`;
}

export async function listDoors(ctx: RequestContext, input: Record<string, unknown>): Promise<HandlerResult> {
  const lockedOnly = input['locked_only'] === true;
  const { rows } = await getPool().query(
    `SELECT id, name, location, is_locked
       FROM doors
      WHERE tenant_id = $1
        AND ($2::boolean IS FALSE OR is_locked = true)
      ORDER BY name`,
    [ctx.tenantId, lockedOnly],
  );
  const text = rows
    .map((r: any) => `- ${r.id} | ${r.name} | ${r.location} | ${r.is_locked ? 'locked' : 'unlocked'}`)
    .join('\n');
  return { rows, text: text || '(no doors)' };
}

export async function getAccessEvents(ctx: RequestContext, input: Record<string, unknown>): Promise<HandlerResult> {
  const rawLimit = Number(input['limit'] ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 20;
  const result = input['result'] === 'granted' || input['result'] === 'denied' ? input['result'] : null;

  const { rows } = await getPool().query(
    `SELECT e.id, e.occurred_at, e.result, e.note, d.name AS door_name, u.full_name AS user_name
       FROM access_events e
       JOIN doors d ON d.id = e.door_id AND d.tenant_id = e.tenant_id
       LEFT JOIN users u ON u.id = e.user_id AND u.tenant_id = e.tenant_id
      WHERE e.tenant_id = $1
        AND ($2::text IS NULL OR e.result = $2)
      ORDER BY e.occurred_at DESC
      LIMIT $3`,
    [ctx.tenantId, result, limit],
  );
  const text = rows
    .map((r: any) => `- ${r.occurred_at.toISOString()} | ${r.result} | ${r.door_name} | ${r.user_name ?? 'unknown'}${r.note ? ` | note: ${r.note}` : ''}`)
    .join('\n');
  return { rows, text: text || '(no events)' };
}

export async function listCredentials(ctx: RequestContext, input: Record<string, unknown>): Promise<HandlerResult> {
  const status = ['active', 'revoked', 'lost'].includes(String(input['status'])) ? String(input['status']) : null;
  const { rows } = await getPool().query(
    `SELECT c.id, c.card_number, c.status, u.full_name
       FROM credentials c
       JOIN users u ON u.id = c.user_id AND u.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1
        AND ($2::text IS NULL OR c.status = $2)
      ORDER BY u.full_name`,
    [ctx.tenantId, status],
  );
  // Masked at the boundary. The raw card number never enters the context window.
  const text = rows
    .map((r: any) => `- ${r.id} | ${r.full_name} | ${maskCard(r.card_number)} | ${r.status}`)
    .join('\n');
  return { rows, text: text || '(no credentials)' };
}

export async function revokeCredential(ctx: RequestContext, input: Record<string, unknown>): Promise<HandlerResult> {
  const id = String(input['credential_id'] ?? '');
  const { rows } = await getPool().query(
    `UPDATE credentials
        SET status = 'revoked'
      WHERE tenant_id = $1 AND id = $2
      RETURNING id, status`,
    [ctx.tenantId, id],
  );
  const text = rows.length ? `Revoked credential ${id}.` : `No credential ${id} in this tenant.`;
  return { rows, text };
}

export const HANDLERS = {
  list_doors: listDoors,
  get_access_events: getAccessEvents,
  list_credentials: listCredentials,
  revoke_credential: revokeCredential,
} as const;

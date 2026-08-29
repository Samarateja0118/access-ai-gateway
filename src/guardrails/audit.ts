import type { Decision, RequestContext, ToolCall } from '../types.js';
import { getPool } from '../db/pool.js';

export interface AuditEntry {
  ctx: RequestContext;
  call: ToolCall;
  decision: Decision;
  reason?: string;
  rowCount?: number;
  durationMs?: number;
}

/**
 * One row per tool invocation, including the denied ones. The denials are the
 * interesting rows — they are the record of an attack being stopped.
 *
 * Never throws: an audit failure must not take down the request path, but it
 * does get surfaced on stderr so it is not silent.
 */
export async function recordToolCall(entry: AuditEntry): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO audit_log
        (tenant_id, actor_user_id, actor_role, tool_name, tool_input, decision, reason, result_rows, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        entry.ctx.tenantId,
        entry.ctx.userId,
        entry.ctx.role,
        entry.call.name,
        JSON.stringify(entry.call.input),
        entry.decision,
        entry.reason ?? null,
        entry.rowCount ?? null,
        entry.durationMs ?? null,
      ],
    );
  } catch (err) {
    console.error('[audit] failed to record tool call', err);
  }
}

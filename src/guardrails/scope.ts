import type { RequestContext, ToolCall } from '../types.js';

/**
 * Scope resolution happens BEFORE the query runs, not after it returns.
 *
 * You cannot redact a leak out of a context window once it is in there, so the
 * rule is that out-of-scope rows are never selected in the first place. Tool
 * handlers receive tenantId from the RequestContext only; any tenant_id the
 * model tried to supply is stripped and recorded.
 */

export interface ScopeResult {
  ok: boolean;
  reason?: string;
  /** Input with caller-supplied scope keys removed. */
  sanitizedInput: Record<string, unknown>;
  /** Keys the model tried to set that it had no business setting. */
  strippedKeys: string[];
}

const FORBIDDEN_INPUT_KEYS = ['tenant_id', 'tenantId', 'tenant', 'actor_role', 'role'];

export function enforceScope(ctx: RequestContext, call: ToolCall): ScopeResult {
  const sanitizedInput: Record<string, unknown> = {};
  const strippedKeys: string[] = [];

  for (const [key, value] of Object.entries(call.input)) {
    if (FORBIDDEN_INPUT_KEYS.includes(key)) {
      strippedKeys.push(key);
      continue;
    }
    sanitizedInput[key] = value;
  }

  // A model asking for a different tenant is not a routine event. Treat an
  // explicit mismatch as an attack signal rather than silently ignoring it.
  const requested = call.input['tenant_id'] ?? call.input['tenantId'];
  if (typeof requested === 'string' && requested !== ctx.tenantId) {
    return {
      ok: false,
      reason: `tool call attempted to read tenant "${requested}" while acting for "${ctx.tenantId}"`,
      sanitizedInput,
      strippedKeys,
    };
  }

  return { ok: true, sanitizedInput, strippedKeys };
}

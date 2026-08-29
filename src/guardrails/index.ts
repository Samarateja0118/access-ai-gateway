import type { RequestContext, ToolCall, ToolOutcome } from '../types.js';
import { isKnownTool, isToolAllowed } from '../tools/registry.js';
import { HANDLERS } from '../tools/handlers.js';
import { enforceScope } from './scope.js';
import { scanForInjection, shouldBlock } from './injection.js';
import { wrapUntrusted, redactionNotice } from './wrap.js';
import { recordToolCall } from './audit.js';

export { scanForInjection, shouldBlock } from './injection.js';
export { enforceScope } from './scope.js';
export { wrapUntrusted } from './wrap.js';

/**
 * The pipeline every tool call passes through, in order:
 *
 *   1. known tool?          unknown names are refused outright
 *   2. role allowlist       deny by default
 *   3. scope enforcement    caller-supplied tenant keys stripped; mismatch = attack
 *   4. execute              scoped SQL, tenant bound from context
 *   5. scan the RESULT      indirect injection lives here, not in user input
 *   6. wrap                 structural separation of data from instruction
 *   7. audit                one row either way
 *
 * Step 5 is the one most implementations skip.
 */
export async function executeToolCall(
  ctx: RequestContext,
  call: ToolCall,
  opts: { audit?: boolean } = {},
): Promise<ToolOutcome> {
  const started = Date.now();
  const audit = opts.audit ?? true;

  const finish = async (outcome: ToolOutcome): Promise<ToolOutcome> => {
    if (audit) {
      await recordToolCall({
        ctx,
        call,
        decision: outcome.decision,
        reason: outcome.reason,
        rowCount: outcome.rowCount,
        durationMs: Date.now() - started,
      });
    }
    return outcome;
  };

  if (!isKnownTool(call.name)) {
    return finish({
      decision: 'denied_by_role',
      reason: `unknown tool "${call.name}"`,
      content: redactionNotice(call.name, 'no such tool'),
    });
  }

  if (!isToolAllowed(ctx.role, call.name)) {
    return finish({
      decision: 'denied_by_role',
      reason: `role "${ctx.role}" may not call ${call.name}`,
      content: redactionNotice(call.name, `your role (${ctx.role}) is not permitted to use this tool`),
    });
  }

  const scope = enforceScope(ctx, call);
  if (!scope.ok) {
    return finish({
      decision: 'denied_by_scope',
      reason: scope.reason,
      content: redactionNotice(call.name, 'the call tried to read data outside this tenant'),
    });
  }

  let result;
  try {
    result = await HANDLERS[call.name](ctx, scope.sanitizedInput);
  } catch (err) {
    return finish({
      decision: 'error',
      reason: err instanceof Error ? err.message : String(err),
      content: redactionNotice(call.name, 'the lookup failed'),
    });
  }

  // The data came from our own database and is still untrusted, because tenant
  // users control the free-text fields inside it.
  const scan = scanForInjection(result.text);
  if (shouldBlock(scan)) {
    return finish({
      decision: 'blocked_injection',
      reason: scan.findings.map((f) => `${f.rule}@${f.confidence}`).join(','),
      rowCount: result.rows.length,
      content: redactionNotice(
        call.name,
        'the stored records contain text that appears to target the assistant, so the result was withheld',
      ),
    });
  }

  return finish({
    decision: 'allowed',
    rowCount: result.rows.length,
    content: wrapUntrusted(call.name, result.text),
  });
}

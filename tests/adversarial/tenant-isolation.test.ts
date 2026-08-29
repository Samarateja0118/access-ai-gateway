import { describe, it, expect } from 'vitest';
import { executeToolCall } from '../../src/guardrails/index.js';
import type { RequestContext } from '../../src/types.js';

const acmeViewer: RequestContext = { tenantId: 'acme', userId: 'u_acme_viewer', role: 'viewer' };
const acmeOperator: RequestContext = { tenantId: 'acme', userId: 'u_acme_operator', role: 'operator' };

/**
 * These run without a database because every one of them is expected to be
 * refused before any query is issued. That is the design claim being tested:
 * refusal happens above the data layer, not after it.
 */
describe('tenant and role isolation (pre-query refusals)', () => {
  it('refuses a viewer reaching for credentials', async () => {
    const out = await executeToolCall(acmeViewer, { name: 'list_credentials', input: {} }, { audit: false });
    expect(out.decision).toBe('denied_by_role');
    expect(out.content).not.toMatch(/ACME-/);
  });

  it('refuses a cross-tenant read before touching the database', async () => {
    const out = await executeToolCall(
      acmeOperator,
      { name: 'get_access_events', input: { tenant_id: 'globex' } },
      { audit: false },
    );
    expect(out.decision).toBe('denied_by_scope');
  });

  it('refuses a tool that does not exist', async () => {
    const out = await executeToolCall(acmeOperator, { name: 'exfiltrate', input: {} }, { audit: false });
    expect(out.decision).toBe('denied_by_role');
  });

  it('refuses a viewer attempting a state change', async () => {
    const out = await executeToolCall(
      acmeViewer,
      { name: 'revoke_credential', input: { credential_id: 'c_1' } },
      { audit: false },
    );
    expect(out.decision).toBe('denied_by_role');
  });

  it('never leaks the reason for refusal as raw data', async () => {
    const out = await executeToolCall(acmeViewer, { name: 'list_credentials', input: {} }, { audit: false });
    expect(out.content).toContain('withheld');
  });
});

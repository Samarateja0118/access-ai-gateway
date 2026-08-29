import { describe, it, expect } from 'vitest';
import { enforceScope } from '../../src/guardrails/scope.js';
import type { RequestContext } from '../../src/types.js';

const acmeOperator: RequestContext = { tenantId: 'acme', userId: 'u_acme_operator', role: 'operator' };

describe('scope enforcement', () => {
  it('passes a clean call through unchanged', () => {
    const r = enforceScope(acmeOperator, { name: 'list_doors', input: { locked_only: true } });
    expect(r.ok).toBe(true);
    expect(r.sanitizedInput).toEqual({ locked_only: true });
    expect(r.strippedKeys).toEqual([]);
  });

  it('strips a caller-supplied tenant_id that matches the session', () => {
    const r = enforceScope(acmeOperator, { name: 'list_doors', input: { tenant_id: 'acme' } });
    expect(r.ok).toBe(true);
    expect(r.sanitizedInput).not.toHaveProperty('tenant_id');
    expect(r.strippedKeys).toContain('tenant_id');
  });

  it('refuses a call naming a different tenant', () => {
    const r = enforceScope(acmeOperator, { name: 'list_credentials', input: { tenant_id: 'globex' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/globex/);
  });

  it('refuses camelCase tenant widening too', () => {
    const r = enforceScope(acmeOperator, { name: 'list_doors', input: { tenantId: 'globex' } });
    expect(r.ok).toBe(false);
  });

  it('strips attempts to escalate role through tool input', () => {
    const r = enforceScope(acmeOperator, { name: 'list_doors', input: { role: 'admin' } });
    expect(r.sanitizedInput).not.toHaveProperty('role');
    expect(r.strippedKeys).toContain('role');
  });
});

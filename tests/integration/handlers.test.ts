import { describe, it, expect, afterAll } from 'vitest';
import { executeToolCall } from '../../src/guardrails/index.js';
import { closePool } from '../../src/db/pool.js';
import type { RequestContext } from '../../src/types.js';

const hasDb = Boolean(process.env['DATABASE_URL']);
const d = hasDb ? describe : describe.skip;

const acmeAdmin: RequestContext = { tenantId: 'acme', userId: 'u_acme_admin', role: 'admin' };
const globexAdmin: RequestContext = { tenantId: 'globex', userId: 'u_globex_admin', role: 'admin' };

d('scoped handlers against a real database', () => {
  afterAll(async () => { await closePool(); });

  it('withholds the doors list because seeded data contains an injection payload', async () => {
    const out = await executeToolCall(acmeAdmin, { name: 'list_doors', input: {} }, { audit: false });
    // This is the headline result: real data, real detection, result withheld.
    expect(out.decision).toBe('blocked_injection');
  });

  it('returns only the calling tenant\'s credentials, masked', async () => {
    const out = await executeToolCall(globexAdmin, { name: 'list_credentials', input: {} }, { audit: false });
    expect(out.decision).toBe('allowed');
    expect(out.content).toMatch(/\*\*\*\*-3310/);
    expect(out.content).not.toMatch(/ACME-/);
    expect(out.content).not.toMatch(/GLBX-8801-3310/); // full number never surfaces
  });

  it('does not let one tenant see another tenant\'s doors', async () => {
    const out = await executeToolCall(globexAdmin, { name: 'list_doors', input: {} }, { audit: false });
    expect(out.content).not.toMatch(/Robotics Lab/);
  });
});

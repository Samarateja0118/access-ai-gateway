/**
 * Runs each guardrail stage twice: once with the pipeline intact, and once
 * bypassed, so the difference is observed rather than asserted.
 *
 * Bypassing here means calling the handler directly instead of editing src —
 * the handler is exactly what the pipeline would have called had the stage in
 * front of it not intervened, so the output is what would really have reached
 * the model.
 *
 * Run: npx tsx scripts/break-guardrails.ts
 */
import { executeToolCall } from '../src/guardrails/index.js';
import { HANDLERS } from '../src/tools/handlers.js';
import { scanForInjection, shouldBlock } from '../src/guardrails/injection.js';
import type { RequestContext } from '../src/types.js';

const admin: RequestContext = { tenantId: 'acme', userId: 'u_acme_admin', role: 'admin' };
const viewer: RequestContext = { tenantId: 'acme', userId: 'u_acme_viewer', role: 'viewer' };

const line = (s: string) => console.log('\n' + '='.repeat(72) + '\n' + s + '\n' + '='.repeat(72));
const clip = (s: string, n = 240) => (s.length > n ? s.slice(0, n) + ` … [+${s.length - n} chars]` : s);

async function main() {
  line('1. RESULT SCAN — the stage most implementations skip');

  const guarded = await executeToolCall(admin, { name: 'list_doors', input: {} }, { audit: false });
  console.log(`WITH guardrail    decision=${guarded.decision} reason=${guarded.reason ?? '-'}`);
  console.log(`                  model sees: ${clip(guarded.content, 160)}`);

  const raw = await HANDLERS.list_doors(admin, {});
  const scan = scanForInjection(raw.text);
  console.log(`\nWITHOUT guardrail decision=allowed (scan removed)`);
  console.log(`                  model would see: ${clip(raw.text)}`);
  console.log(`\n  what the scan actually caught: blocked=${shouldBlock(scan)} ` +
    `findings=${scan.findings.map((f) => `${f.rule}@${f.confidence}`).join(', ') || 'none'}`);

  line('2. ROLE ALLOWLIST — a viewer asking for credentials');

  const deniedByRole = await executeToolCall(viewer, { name: 'list_credentials', input: {} }, { audit: false });
  console.log(`WITH guardrail    decision=${deniedByRole.decision} reason=${deniedByRole.reason ?? '-'}`);

  const creds = await HANDLERS.list_credentials(viewer, {});
  console.log(`\nWITHOUT guardrail decision=allowed (allowlist removed), rows=${creds.rows.length}`);
  console.log(`                  viewer would see: ${clip(creds.text, 200)}`);

  line('3. SCOPE — an Acme session naming another tenant');

  const crossTenant = await executeToolCall(
    admin,
    { name: 'list_doors', input: { tenantId: 'globex' } },
    { audit: false },
  );
  console.log(`WITH guardrail    decision=${crossTenant.decision} reason=${crossTenant.reason ?? '-'}`);

  const globexAsAcme = await HANDLERS.list_doors({ ...admin, tenantId: 'globex' }, {});
  console.log(`\nWITHOUT guardrail decision=allowed (scope removed), rows=${globexAsAcme.rows.length}`);
  console.log(`                  Acme's admin would see: ${clip(globexAsAcme.text, 200)}`);

  console.log();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

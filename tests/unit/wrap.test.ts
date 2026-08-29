import { describe, it, expect } from 'vitest';
import { wrapUntrusted } from '../../src/guardrails/wrap.js';

describe('untrusted-data envelope', () => {
  it('labels the payload as untrusted data', () => {
    const out = wrapUntrusted('list_doors', 'Lobby North');
    expect(out).toContain('trust="untrusted"');
    expect(out).toContain('Lobby North');
  });

  it('uses a fresh delimiter each call so payload text cannot close it early', () => {
    const a = wrapUntrusted('list_doors', 'x');
    const b = wrapUntrusted('list_doors', 'x');
    expect(a).not.toEqual(b);
  });
});

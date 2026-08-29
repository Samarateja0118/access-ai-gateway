import { describe, it, expect } from 'vitest';
import { normalizeForScan, stripZeroWidth } from '../../src/guardrails/normalize.js';

describe('normalizeForScan', () => {
  it('strips zero-width joiners', () => {
    expect(stripZeroWidth('ig\u200dno\u200bre')).toBe('ignore');
  });

  it('maps Cyrillic е to Latin e', () => {
    expect(normalizeForScan('ignor\u0435')).toBe('ignore');
  });
});

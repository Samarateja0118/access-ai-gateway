import { describe, it, expect } from 'vitest';
import { isToolAllowed, allowedToolsFor, isKnownTool } from '../../src/tools/registry.js';

describe('tool allowlist', () => {
  it('denies unknown tools for every role', () => {
    expect(isKnownTool('drop_everything')).toBe(false);
    expect(isToolAllowed('admin', 'drop_everything')).toBe(false);
  });

  it('keeps credentials away from viewers and operators', () => {
    expect(isToolAllowed('viewer', 'list_credentials')).toBe(false);
    expect(isToolAllowed('operator', 'list_credentials')).toBe(false);
    expect(isToolAllowed('admin', 'list_credentials')).toBe(true);
  });

  it('does not offer a viewer any mutating tool', () => {
    expect(allowedToolsFor('viewer')).not.toContain('revoke_credential');
  });
});

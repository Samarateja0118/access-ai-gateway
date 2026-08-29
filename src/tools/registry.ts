import type { Role, ToolName } from '../types.js';

/**
 * Deny by default. A tool is callable only if the caller's role appears here.
 * A viewer's session cannot invoke list_credentials no matter what any text in
 * the context window asks for.
 */
const ALLOWLIST: Record<ToolName, Role[]> = {
  list_doors: ['viewer', 'operator', 'admin'],
  get_access_events: ['operator', 'admin'],
  list_credentials: ['admin'],
  revoke_credential: ['admin'],
};

/** Tools that change state. These are held to a higher bar in the loop. */
export const MUTATING_TOOLS: ToolName[] = ['revoke_credential'];

export function isKnownTool(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(ALLOWLIST, name);
}

export function isToolAllowed(role: Role, name: string): boolean {
  if (!isKnownTool(name)) return false;
  return ALLOWLIST[name].includes(role);
}

export function allowedToolsFor(role: Role): ToolName[] {
  return (Object.keys(ALLOWLIST) as ToolName[]).filter((t) => ALLOWLIST[t].includes(role));
}

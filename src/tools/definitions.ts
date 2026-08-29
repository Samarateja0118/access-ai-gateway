import type { Role } from '../types.js';
import { allowedToolsFor } from './registry.js';

/**
 * Anthropic tool schemas. Note that none of them accept tenant_id — the model
 * is never given the vocabulary to ask for a tenant. Scope comes from the
 * session, so widening it is not a parameter the model can reach for.
 */
const ALL_DEFINITIONS = {
  list_doors: {
    name: 'list_doors',
    description: 'List the doors in the current tenant, with location and lock state.',
    input_schema: {
      type: 'object' as const,
      properties: {
        locked_only: { type: 'boolean', description: 'Only return doors that are currently locked.' },
      },
      required: [],
    },
  },
  get_access_events: {
    name: 'get_access_events',
    description: 'Recent access events (granted or denied) for the current tenant, newest first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'integer', description: 'Maximum events to return (1-100).' },
        result: { type: 'string', enum: ['granted', 'denied'], description: 'Filter by outcome.' },
      },
      required: [],
    },
  },
  list_credentials: {
    name: 'list_credentials',
    description: 'List access credentials for the current tenant. Admin only. Card numbers are masked.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['active', 'revoked', 'lost'] },
      },
      required: [],
    },
  },
  revoke_credential: {
    name: 'revoke_credential',
    description: 'Revoke a credential by id. Admin only. This changes state — confirm with the user first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        credential_id: { type: 'string', description: 'The credential id to revoke.' },
      },
      required: ['credential_id'],
    },
  },
};

export function toolDefinitionsFor(role: Role) {
  return allowedToolsFor(role).map((name) => ALL_DEFINITIONS[name]);
}

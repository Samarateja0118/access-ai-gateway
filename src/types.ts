export type Role = 'viewer' | 'operator' | 'admin';

/**
 * Resolved identity for a request. Every tool call is executed under one of
 * these; nothing downstream is allowed to widen it.
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  role: Role;
}

export type ToolName =
  | 'list_doors'
  | 'get_access_events'
  | 'list_credentials'
  | 'revoke_credential';

export type Decision =
  | 'allowed'
  | 'denied_by_role'
  | 'denied_by_scope'
  | 'blocked_injection'
  | 'error';

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolOutcome {
  decision: Decision;
  reason?: string;
  /** Text handed back to the model. Always already wrapped as untrusted. */
  content: string;
  rowCount?: number;
}

export interface InjectionFinding {
  rule: string;
  /** 0..1. Higher means more confident this text is trying to steer a model. */
  confidence: number;
  excerpt: string;
}

export interface ScanResult {
  flagged: boolean;
  findings: InjectionFinding[];
}

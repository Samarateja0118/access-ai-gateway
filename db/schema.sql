-- Multi-tenant access-control schema.
-- Every domain table carries tenant_id. There is no table a query can reach
-- without naming a tenant, which is what makes scope enforcement checkable.

DROP TABLE IF EXISTS audit_log, access_events, credentials, doors, users, tenants CASCADE;

CREATE TABLE tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'operator', 'admin')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE doors (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,          -- free text, tenant-controlled: UNTRUSTED
  location    TEXT NOT NULL,          -- free text, tenant-controlled: UNTRUSTED
  is_locked   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE credentials (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  card_number  TEXT NOT NULL,         -- SENSITIVE
  status       TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'lost')),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_events (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  door_id    TEXT NOT NULL REFERENCES doors(id),
  user_id    TEXT REFERENCES users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result     TEXT NOT NULL CHECK (result IN ('granted', 'denied')),
  note       TEXT                     -- free text: UNTRUSTED
);

-- One row per tool invocation. This is the record that answers
-- "what did the model actually do on whose behalf".
CREATE TABLE audit_log (
  id             BIGSERIAL PRIMARY KEY,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id      TEXT NOT NULL,
  actor_user_id  TEXT NOT NULL,
  actor_role     TEXT NOT NULL,
  tool_name      TEXT NOT NULL,
  tool_input     JSONB NOT NULL,
  decision       TEXT NOT NULL CHECK (decision IN ('allowed', 'denied_by_role', 'denied_by_scope', 'blocked_injection', 'error')),
  reason         TEXT,
  result_rows    INTEGER,
  duration_ms    INTEGER
);

CREATE INDEX ON access_events (tenant_id, occurred_at DESC);
CREATE INDEX ON credentials (tenant_id, user_id);
CREATE INDEX ON audit_log (tenant_id, occurred_at DESC);

# Build plan

Five focused days. Each day ends with something demonstrable.

## Day 1 — Skeleton and data
- `docker compose up -d db`, load `db/schema.sql` and `db/seed.sql`
- Read the seed file properly. Understand each of the three planted payloads
  and why the field it sits in is tenant-controlled.
- Get `GET /api/doors` returning rows for `x-tenant-id: acme`
- **Done when:** the REST endpoint returns Acme's doors and nothing of Globex's

## Day 2 — Tool calling
- Add your `ANTHROPIC_API_KEY`, run `npm run dev`
- `POST /api/chat` with "which doors are locked?"
- Trace the loop in `src/llm/loop.ts` by hand: request, `tool_use` block,
  `executeToolCall`, `tool_result` block, second request
- **Done when:** you can explain, without reading, why `messages` grows by two
  entries per tool turn and what happens if you forget to append the assistant turn

## Day 3 — Guardrails
- Work through `src/guardrails/index.ts` in pipeline order
- Deliberately break each stage and watch what gets through:
  - comment out the role check, call credentials as a viewer
  - comment out the result scan, watch the model read the injected door name
- **Done when:** you have seen the unguarded failure with your own eyes. This is
  the story you tell in the interview.

## Day 4 — Close the todos
- Pick three of the six `it.todo` cases in the adversarial suite
- Normalisation (homoglyphs, zero-width) is the highest value per hour
- Then the false-positive case — precision is where the real thinking is
- **Done when:** three todos are passing tests and you can articulate the
  precision/recall tradeoff you chose

## Day 5 — CI and polish
- Push to GitHub, confirm `.github/workflows/ci.yml` goes green
- Write the README section on what you found on day 3
- **Done when:** the CI badge is green on a public repo

## Optional day 6-7
- Redis rate limiting (honestly adds Redis to your resume)
- Deploy to AWS App Runner + RDS (honestly adds AWS)

## Resume bullets this earns you

Only claim these once the corresponding work is actually done:

- Built a TypeScript/Express service over PostgreSQL exposing access-control
  data to an LLM through scoped tool calls, with tenant isolation enforced
  before query execution rather than by filtering results.
- Designed guardrails against indirect prompt injection — where attacker text
  stored in tenant-controlled fields reaches the model through tool results —
  combining role-based tool allowlisting, scope stripping, and detection over
  tool output.
- Wrote an adversarial test suite covering injection payloads, cross-tenant
  traversal, and role escalation, running against real Postgres in GitHub
  Actions CI.

Do not add "Redis" or "AWS" to the skills line until days 6-7 are done.

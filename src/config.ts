import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  anthropic: {
    // Read lazily so tests that never call the model don't need a key.
    get apiKey() {
      return required('ANTHROPIC_API_KEY');
    },
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    maxTokens: 1024,
  },
  /** Max tool-use round trips before the loop gives up. */
  maxToolTurns: 6,
};

/**
 * Decode-then-rescan for payloads that only look like instructions after
 * base64 decoding. Depth is capped so nested encodings cannot fan out.
 */

const CANDIDATE = /[A-Za-z0-9+/]{24,}={0,2}/g;
export const MAX_DECODE_DEPTH = 2;

function mostlyPrintable(text: string): boolean {
  if (text.length < 12) return false;
  let ok = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 160) ok++;
  }
  return ok / text.length >= 0.9;
}

function decodeOne(raw: string): string | null {
  const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
  const buf = Buffer.from(padded, 'base64');
  if (buf.length < 8) return null;
  const decoded = buf.toString('utf8');
  if (!mostlyPrintable(decoded)) return null;
  if (decoded === raw) return null;
  return decoded;
}

/** Decoded layers of `text`, shallowest first. Does not include `text` itself. */
export function decodedLayers(text: string, depth = 0): string[] {
  if (depth >= MAX_DECODE_DEPTH) return [];
  const layers: string[] = [];
  const seen = new Set<string>();
  const matches = text.match(CANDIDATE) ?? [];
  for (const raw of matches) {
    const decoded = decodeOne(raw);
    if (!decoded || seen.has(decoded)) continue;
    seen.add(decoded);
    layers.push(decoded);
    for (const inner of decodedLayers(decoded, depth + 1)) {
      if (seen.has(inner)) continue;
      seen.add(inner);
      layers.push(inner);
    }
  }
  return layers;
}

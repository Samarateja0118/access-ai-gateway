/**
 * Two door names can each be benign and still form an instruction once the
 * tool result is assembled. The pipeline already scans `result.text` as one
 * blob; this extracts names from that blob so the detector sees the phrase
 * the model would see, not each row in isolation.
 *
 * Matches the compact list format produced by listDoors:
 *   `- id | name | location | locked`
 */
export function assembledDoorNames(text: string): string | null {
  const names: string[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*-\s+\S+\s+\|\s+([^|]+)\|/);
    if (m?.[1]) names.push(m[1].trim());
  }
  if (names.length < 2) return null;
  return names.join(' ');
}

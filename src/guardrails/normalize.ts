/**
 * Text that looks like Latin to a human can still fail a Latin regex.
 * Homoglyphs and zero-width joiners are the cheap evasions; fold them
 * before the detector runs.
 *
 * We do not treat "looks similar" as "is an instruction". Normalisation
 * only recovers the string a reader would have seen; the existing rules
 * still have to fire. That is what keeps
 * "Ignore Previous Building Entrance" allowed.
 */

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060\u00AD]/g;

/** Common Cyrillic / Greek letters that are visually Latin. */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: 'a',
  А: 'A',
  е: 'e',
  Е: 'E',
  о: 'o',
  О: 'O',
  р: 'p',
  Р: 'P',
  с: 'c',
  С: 'C',
  у: 'y',
  У: 'Y',
  х: 'x',
  Х: 'X',
  і: 'i',
  І: 'I',
  ј: 'j',
  ѕ: 's',
  Ѕ: 'S',
  // Greek
  α: 'a',
  Α: 'A',
  ε: 'e',
  Ε: 'E',
  ι: 'i',
  Ι: 'I',
  ο: 'o',
  Ο: 'O',
  ν: 'n',
  Ν: 'N',
  ρ: 'p',
  Ρ: 'P',
  τ: 't',
  Τ: 'T',
  κ: 'k',
  Κ: 'K',
};

export function stripZeroWidth(text: string): string {
  return text.replace(ZERO_WIDTH, '');
}

export function mapConfusables(text: string): string {
  let out = '';
  for (const ch of text) {
    out += CONFUSABLES[ch] ?? ch;
  }
  return out;
}

export function normalizeForScan(text: string): string {
  return mapConfusables(stripZeroWidth(text).normalize('NFKC'));
}

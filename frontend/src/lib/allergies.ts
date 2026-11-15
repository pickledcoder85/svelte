/**
 * Foods to avoid, as chosen in setup and Profile. Saved on the profile as one note, for
 * example "Peanut; Wheat; Other: sesame". Parsing works on whole entries, so "Other: eggplant"
 * never reads back as Egg, and text that isn't a known choice is kept as Other.
 */

export type AllergyChoice = 'none' | 'milk' | 'egg' | 'peanut' | 'tree_nuts' | 'wheat' | 'shellfish' | 'other';

export const ALLERGY_LABELS: Record<Exclude<AllergyChoice, 'none' | 'other'>, string> = {
  milk: 'Milk',
  egg: 'Egg',
  peanut: 'Peanut',
  tree_nuts: 'Tree nuts',
  wheat: 'Wheat',
  shellfish: 'Shellfish'
};

const OTHER_PREFIX = /^other:\s*/i;

export function parseAllergySelection(notes: string | null | undefined): {
  selected: AllergyChoice[];
  otherText: string;
} {
  const value = notes?.trim();
  if (!value) {
    return { selected: ['none'], otherText: '' };
  }

  const selected: AllergyChoice[] = [];
  const otherParts: string[] = [];
  const byLabel = new Map(
    (Object.entries(ALLERGY_LABELS) as Array<[Exclude<AllergyChoice, 'none' | 'other'>, string]>).map(([id, label]) => [
      label.toLowerCase(),
      id
    ])
  );

  for (const raw of value.split(';')) {
    const entry = raw.trim();
    if (!entry) {
      continue;
    }
    const known = byLabel.get(entry.toLowerCase());
    if (known) {
      if (!selected.includes(known)) {
        selected.push(known);
      }
      continue;
    }
    // "Other: sesame", or older free text that isn't one of the choices: keep it as Other.
    otherParts.push(entry.replace(OTHER_PREFIX, '').trim());
  }

  const otherText = otherParts.filter(Boolean).join('; ');
  if (otherText) {
    selected.push('other');
  }
  return selected.length > 0 ? { selected, otherText } : { selected: ['none'], otherText: '' };
}

export function formatAllergySelection(selected: AllergyChoice[], otherText: string): string | null {
  if (selected.length === 0 || selected.includes('none')) {
    return null;
  }

  const labels = selected
    .filter((value): value is Exclude<AllergyChoice, 'none' | 'other'> => value !== 'none' && value !== 'other')
    .map((value) => ALLERGY_LABELS[value]);

  if (selected.includes('other') && otherText.trim()) {
    labels.push(`Other: ${otherText.trim()}`);
  }

  return labels.length > 0 ? labels.join('; ') : null;
}

/** "Other" chosen with nothing typed: the choice would be lost on save. */
export function missingOtherAllergy(selected: AllergyChoice[], otherText: string): boolean {
  return selected.includes('other') && !otherText.trim();
}

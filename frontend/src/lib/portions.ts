/**
 * Counted foods ("2 large eggs") versus weighed ones ("150 g"), as Gus's meals show them.
 */

/** "2", "½", "1½". */
export function countText(count: number): string {
  const whole = Math.floor(count);
  const half = count - whole >= 0.5;
  if (half) {
    return whole === 0 ? '½' : `${whole}½`;
  }
  return String(whole);
}

/** "2 large eggs", "1 medium sweet potato"; null when the food is weighed. */
export function countLabel(item: { count?: number | null; unit?: string | null; unit_plural?: string | null }): string | null {
  if (!item.count || !item.unit) {
    return null;
  }
  return `${countText(item.count)} ${item.count <= 1 ? item.unit : item.unit_plural || item.unit}`;
}

/** An ingredient line: "2 large eggs (100 g) · eggs" or "150 g chicken thigh". */
export function ingredientLine(item: { name: string; grams: number; count?: number | null; unit?: string | null; unit_plural?: string | null }): string {
  const counted = countLabel(item);
  return counted ? `${counted} (${Math.round(item.grams)} g) · ${item.name}` : `${Math.round(item.grams)} g ${item.name}`;
}

/**
 * Shopping lists: items grouped by aisle (the plan's roles), what's left on top in each group
 * and ticked items at the bottom, progress text, and the share text (only what's left).
 */
import type { TFunction } from '../i18n/translate';
import type { ShoppingItem, ShoppingList, ShoppingRole } from '../types';

const ROLE_ORDER = ['protein', 'carb', 'veg', 'fruit', 'fat', 'other'] as const;
type Role = (typeof ROLE_ORDER)[number];

function isRole(role: string): role is Role {
  return (ROLE_ORDER as readonly string[]).includes(role);
}

export function itemsByGroup(items: ShoppingItem[], t: TFunction): Array<{ role: string; label: string; items: ShoppingItem[] }> {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const role = isRole(item.role) ? item.role : 'other';
    groups.set(role, [...(groups.get(role) ?? []), item]);
  }
  return ROLE_ORDER.filter((role) => groups.has(role)).map((role) => ({
    role,
    label: t(`shopping.roles.${role}`),
    items: [...(groups.get(role) ?? [])].sort((a, b) => Number(a.checked) - Number(b.checked) || a.position - b.position)
  }));
}

export function remainingCount(list: Pick<ShoppingList, 'items'>): number {
  return list.items.filter((item) => !item.checked).length;
}

/** "6 of 14 left", "All done". */
export function progressLabel(remaining: number, total: number, t: TFunction): string {
  if (total === 0) {
    return t('shopping.progress.empty');
  }
  return remaining === 0 ? t('shopping.progress.allDone') : t('shopping.progress.left', { remaining, total });
}

/** Only what's still to buy, grouped. */
export function shareText(list: ShoppingList, t: TFunction): string {
  const groups = itemsByGroup(list.items.filter((item) => !item.checked), t);
  const body = groups
    .map((group) => `${group.label}\n${group.items.map((item) => `- ${item.name}${item.amount ? `: ${item.amount}` : ''}`).join('\n')}`)
    .join('\n\n');
  return body ? `${list.title}\n\n${body}` : `${list.title}\n\n${t('shopping.shareAllDone')}`;
}

/**
 * "Meal plan · Nov 18–20" (or one day, or across months). Saved as the list's title, so it stays
 * English until the Plan screens are translated (pass 2).
 */
export function planListTitle(dates: string[]): string {
  const sorted = [...dates].sort();
  if (sorted.length === 0) {
    return 'Shopping list';
  }
  const format = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', options);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === last) {
    return `Meal plan · ${format(first, { month: 'short', day: 'numeric' })}`;
  }
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return `Meal plan · ${format(first, { month: 'short', day: 'numeric' })}–${sameMonth ? format(last, { day: 'numeric' }) : format(last, { month: 'short', day: 'numeric' })}`;
}

export function isShoppingRole(role: string): role is ShoppingRole {
  return isRole(role);
}

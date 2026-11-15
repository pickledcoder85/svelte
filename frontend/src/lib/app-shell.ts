import type { AppSection } from '../types';

export interface AppShellSectionMeta {
  id: AppSection;
  label: string;
  detail: string;
  group: 'primary' | 'organize' | 'account';
}

export const appShellSections: AppShellSectionMeta[] = [
  { id: 'dashboard', label: 'Home', detail: "Today's targets and plan", group: 'primary' },
  { id: 'tracker', label: 'Tracker', detail: 'Exercise and today logs', group: 'primary' },
  { id: 'foods', label: 'Food Search', detail: 'Find and favorite foods', group: 'primary' },
  { id: 'ingestion', label: 'Scan Food', detail: 'Photograph labels and packages', group: 'primary' },
  { id: 'meals', label: 'Meals', detail: 'Compose and scale meals', group: 'organize' },
  { id: 'meal-plan', label: 'Meal Plan', detail: 'Weekly meal schedule', group: 'organize' },
  { id: 'meal-prep', label: 'Meal Prep', detail: 'Batch cooking checklist', group: 'organize' },
  { id: 'recipes', label: 'Recipes', detail: 'Browse and favorite recipes', group: 'organize' },
  { id: 'profile', label: 'Profile', detail: 'Body stats, goals, and targets', group: 'account' },
  { id: 'settings', label: 'Settings', detail: 'Units, time zone, and account', group: 'account' },
  { id: 'trends', label: 'Trends', detail: 'Weight, calories, and progress over time', group: 'primary' }
];

/**
 * Bottom tab bar (Today · Log · 📷 · Trends · Plan). Tabs are places; the raised camera in the
 * middle is the one action: scan something and log it (search and quick calories are inside
 * it). Each tab shows one or more sections; tabs with several show sub-tabs at the top.
 * Profile and Settings belong to the avatar's account sheet, not a tab.
 */
export type AppTabId = 'today' | 'log' | 'trends' | 'plan';

export const APP_TABS: Array<{
  id: AppTabId;
  label: string;
  /** Sections under this tab, in sub-tab order; the first opens when the tab is tapped. */
  sections: Array<{ id: AppSection; label: string }>;
}> = [
  { id: 'today', label: 'Today', sections: [{ id: 'dashboard', label: 'Today' }] },
  {
    id: 'log',
    label: 'Log',
    sections: [
      { id: 'tracker', label: 'Entries' },
      { id: 'foods', label: 'Foods' },
      { id: 'ingestion', label: 'Scan' }
    ]
  },
  { id: 'trends', label: 'Trends', sections: [{ id: 'trends', label: 'Trends' }] },
  {
    id: 'plan',
    label: 'Plan',
    sections: [
      { id: 'meal-plan', label: 'Meal plan' },
      { id: 'meal-prep', label: 'Prep' },
      { id: 'recipes', label: 'Recipes' },
      { id: 'meals', label: 'Meals' }
    ]
  }
];

/** The tab a section belongs to, or null for account screens (Profile, Settings). */
export function tabForSection(section: AppSection): AppTabId | null {
  return APP_TABS.find((tab) => tab.sections.some((item) => item.id === section))?.id ?? null;
}

/** The sub-tabs to show for a section (only when its tab has more than one). */
export function subTabsForSection(section: AppSection): Array<{ id: AppSection; label: string }> {
  const tab = APP_TABS.find((item) => item.sections.some((entry) => entry.id === section));
  return tab && tab.sections.length > 1 ? tab.sections : [];
}

/** What the ＋ button offers, and where each goes. */

export function getAppSectionMeta(section: AppSection): AppShellSectionMeta {
  return appShellSections.find((item) => item.id === section) ?? appShellSections[0];
}

export function getProfileInitials(displayName: string | null | undefined, email: string | null | undefined): string {
  const source = displayName?.trim() || email?.trim() || 'Profile';
  const words = source
    .replace(/[@._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'PR';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

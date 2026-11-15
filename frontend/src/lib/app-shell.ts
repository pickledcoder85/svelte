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
  { id: 'settings', label: 'Settings', detail: 'Units, time zone, and account', group: 'account' }
];

export const primaryAppSections = appShellSections.filter((section) => section.group === 'primary');

export const appShellMenuGroups: Array<{ title: string; sections: AppShellSectionMeta[] }> = [
  {
    title: 'Navigate',
    sections: appShellSections.filter((section) => section.group === 'primary')
  },
  {
    title: 'Organize',
    sections: appShellSections.filter((section) => section.group === 'organize')
  },
  {
    title: 'Account',
    sections: appShellSections.filter((section) => section.group === 'account')
  }
];

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

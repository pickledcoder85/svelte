import { describe, expect, it } from 'vitest';

import {
  appShellMenuGroups,
  getAppSectionMeta,
  getProfileInitials,
  primaryAppSections
} from './app-shell';

describe('app shell metadata', () => {
  it('keeps the focused primary navigation limited to the top-level sections', () => {
    expect(primaryAppSections.map((section) => section.id)).toEqual([
      'dashboard',
      'tracker',
      'foods',
      'ingestion'
    ]);
  });

  it('keeps secondary destinations inside menu groups', () => {
    expect(appShellMenuGroups.map((group) => group.title)).toEqual(['Navigate', 'Organize', 'Account']);
    expect(appShellMenuGroups[0]?.sections.map((section) => section.id)).toEqual([
      'dashboard',
      'tracker',
      'foods',
      'ingestion'
    ]);
    expect(appShellMenuGroups[1]?.sections.map((section) => section.id)).toEqual([
      'meals',
      'meal-plan',
      'meal-prep',
      'recipes'
    ]);
    expect(appShellMenuGroups[2]?.sections.map((section) => section.id)).toEqual(['profile', 'settings']);
  });

  it('returns consistent section copy and profile initials', () => {
    expect(getAppSectionMeta('dashboard').label).toBe('Home');
    expect(getAppSectionMeta('dashboard').detail).toContain("Today's");
    expect(getAppSectionMeta('ingestion').label).toBe('Scan Food');
    expect(getProfileInitials('Local Dev User', 'dev@example.com')).toBe('LD');
    expect(getProfileInitials(null, 'dev@example.com')).toBe('DE');
  });
});

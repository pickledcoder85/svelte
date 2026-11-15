import { describe, expect, it } from 'vitest';

import {
  APP_TABS,
  subTabsForSection,
  tabForSection,
  getAppSectionMeta,
  getProfileInitials
} from './app-shell';

describe('app shell metadata', () => {
  it('returns consistent section copy and profile initials', () => {
    expect(getAppSectionMeta('dashboard').label).toBe('Home');
    expect(getAppSectionMeta('dashboard').detail).toContain("Today's");
    expect(getAppSectionMeta('ingestion').label).toBe('Scan Food');
    expect(getProfileInitials('Local Dev User', 'dev@example.com')).toBe('LD');
    expect(getProfileInitials(null, 'dev@example.com')).toBe('DE');
  });

  it('maps every section to a tab, except the account screens', () => {
    expect(APP_TABS.map((tab) => tab.id)).toEqual(['today', 'log', 'trends', 'plan']);
    expect(tabForSection('dashboard')).toBe('today');
    expect(tabForSection('foods')).toBe('log');
    expect(tabForSection('ingestion')).toBe('log');
    expect(tabForSection('recipes')).toBe('plan');
    expect(tabForSection('trends')).toBe('trends');
    expect(tabForSection('profile')).toBeNull();
    expect(tabForSection('settings')).toBeNull();
  });

  it('shows sub-tabs only for tabs with several sections', () => {
    expect(subTabsForSection('foods').map((item) => item.label)).toEqual(['Entries', 'Foods', 'Scan']);
    expect(subTabsForSection('meal-prep').map((item) => item.id)).toEqual(['meal-plan', 'meal-prep', 'recipes', 'meals']);
    expect(subTabsForSection('dashboard')).toEqual([]);
    expect(subTabsForSection('profile')).toEqual([]);
  });

  it('names the log tab Log', () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual(['Today', 'Log', 'Trends', 'Plan']);
  });
});

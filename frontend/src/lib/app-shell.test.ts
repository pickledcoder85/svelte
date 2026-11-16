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
    expect(APP_TABS.map((tab) => tab.id)).toEqual(['today', 'trends', 'plan']);
    expect(tabForSection('dashboard')).toBe('today');
    expect(tabForSection('foods')).toBeNull();
    expect(tabForSection('ingestion')).toBeNull(); // the food bank is an account screen
    expect(tabForSection('recipes')).toBeNull();
    expect(tabForSection('workout-plan')).toBe('plan');
    expect(tabForSection('trends')).toBe('trends');
    expect(tabForSection('profile')).toBeNull();
    expect(tabForSection('settings')).toBeNull();
  });

  it('shows sub-tabs only for tabs with several sections', () => {
    expect(subTabsForSection('meal-plan').map((item) => item.label)).toEqual(['Meals', 'Workouts']);
    expect(subTabsForSection('ingestion').map((item) => item.label)).toEqual(['Foods', 'Recipes', 'Build a meal', 'Recent scans']);
    expect(tabForSection('ingestion')).toBeNull(); // the food bank is an account screen
    expect(subTabsForSection('dashboard')).toEqual([]);
    expect(subTabsForSection('profile')).toEqual([]);
  });

  it('has the three place tabs', () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual(['Today', 'Trends', 'Plan']);
  });
});

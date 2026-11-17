import { describe, expect, it } from 'vitest';

import { translatorFor } from '../i18n/dictionaries';
import {
  draftsFromWheel,
  formatBodyField,
  indexForOffset,
  initialWheelIndexes,
  nearestIndex,
  wheelColumns,
  wheelRange,
  type WheelDrafts
} from './wheel-picker';

const empty: WheelDrafts = { heightFeet: '', heightInches: '', heightCm: '', weight: '', age: '', goalWeight: '' };

function valuesAt(field: Parameters<typeof wheelColumns>[0], units: 'imperial' | 'metric', indexes: number[]) {
  return wheelColumns(field, units).map((column, index) => column.values[indexes[index]]);
}

describe('wheel helpers', () => {
  it('builds ranges and finds the nearest row', () => {
    expect(wheelRange(3, 7)).toEqual([3, 4, 5, 6, 7]);
    expect(nearestIndex([3, 4, 5], 4.4)).toBe(1);
    expect(nearestIndex([3, 4, 5], 99)).toBe(2);
    expect(nearestIndex([], 5)).toBe(0);
  });

  it('snaps a scroll offset to a row', () => {
    expect(indexForOffset(0, 10)).toBe(0);
    expect(indexForOffset(65, 10)).toBe(1);
    expect(indexForOffset(67, 10)).toBe(2);
    expect(indexForOffset(-30, 10)).toBe(0);
    expect(indexForOffset(10_000, 10)).toBe(9);
  });

  it('has the right wheels for each field and unit system', () => {
    expect(wheelColumns('height', 'imperial').map((column) => column.unit)).toEqual(['ft', 'in']);
    expect(wheelColumns('height', 'metric').map((column) => column.unit)).toEqual(['cm']);
    expect(wheelColumns('weight', 'imperial').map((column) => column.unit)).toEqual(['lb']);
    expect(wheelColumns('weight', 'metric').map((column) => column.unit)).toEqual(['kg']);
    expect(wheelColumns('age', 'imperial')[0].values[0]).toBe(13);
  });
});

describe('starting positions', () => {
  it('starts empty fields at typical values', () => {
    expect(valuesAt('height', 'imperial', initialWheelIndexes('height', 'imperial', empty))).toEqual([5, 7]);
    expect(valuesAt('height', 'metric', initialWheelIndexes('height', 'metric', empty))).toEqual([170]);
    expect(valuesAt('weight', 'imperial', initialWheelIndexes('weight', 'imperial', empty))).toEqual([165]);
    expect(valuesAt('weight', 'metric', initialWheelIndexes('weight', 'metric', empty))).toEqual([75]);
    expect(valuesAt('age', 'imperial', initialWheelIndexes('age', 'imperial', empty))).toEqual([30]);
  });

  it('starts at the current value, rounded to a whole number', () => {
    const drafts = { ...empty, heightFeet: '6', heightInches: '1', weight: '182.4', age: '41' };
    expect(valuesAt('height', 'imperial', initialWheelIndexes('height', 'imperial', drafts))).toEqual([6, 1]);
    expect(valuesAt('weight', 'imperial', initialWheelIndexes('weight', 'imperial', drafts))).toEqual([182]);
    expect(valuesAt('weight', 'imperial', initialWheelIndexes('weight', 'imperial', { ...drafts, weight: '182.6' }))).toEqual([183]);
    expect(valuesAt('age', 'imperial', initialWheelIndexes('age', 'imperial', drafts))).toEqual([41]);
  });

  it('starts an empty goal weight on the right side of the current weight', () => {
    const drafts = { ...empty, weight: '182.4' };
    expect(valuesAt('goalWeight', 'imperial', initialWheelIndexes('goalWeight', 'imperial', drafts, 'lose'))).toEqual([172]);
    expect(valuesAt('goalWeight', 'imperial', initialWheelIndexes('goalWeight', 'imperial', drafts, 'gain'))).toEqual([192]);
    expect(valuesAt('goalWeight', 'metric', initialWheelIndexes('goalWeight', 'metric', { ...empty, weight: '80' }, 'lose'))).toEqual([75]);
    // An existing goal weight wins.
    expect(valuesAt('goalWeight', 'imperial', initialWheelIndexes('goalWeight', 'imperial', { ...drafts, goalWeight: '160' }, 'lose'))).toEqual([160]);
  });

  it('clamps values outside the wheel', () => {
    expect(valuesAt('weight', 'imperial', initialWheelIndexes('weight', 'imperial', { ...empty, weight: '500.5' }))).toEqual([450]);
  });
});

describe('selections and display', () => {
  it('turns a selection into drafts', () => {
    expect(draftsFromWheel('height', 'imperial', [2, 10])).toEqual({ heightFeet: '5', heightInches: '10' });
    expect(draftsFromWheel('height', 'metric', [55])).toEqual({ heightCm: '175' });
    expect(draftsFromWheel('weight', 'imperial', [95])).toEqual({ weight: '165' });
    expect(draftsFromWheel('goalWeight', 'metric', [40])).toEqual({ goalWeight: '70' });
    expect(draftsFromWheel('age', 'imperial', [21])).toEqual({ age: '34' });
  });

  it('formats each field with its unit, or nothing when empty', () => {
    const drafts = { ...empty, heightFeet: '5', heightInches: '10', heightCm: '177.8', weight: '81.64', age: '34', goalWeight: '155' };
    expect(formatBodyField('height', 'imperial', drafts)).toBe('5 ft 10 in');
    expect(formatBodyField('height', 'metric', drafts)).toBe('177.8 cm');
    expect(formatBodyField('weight', 'metric', drafts)).toBe('82 kg');
    expect(formatBodyField('goalWeight', 'imperial', drafts)).toBe('155 lb');
    expect(formatBodyField('age', 'imperial', drafts)).toBe('34 years');
    expect(formatBodyField('weight', 'imperial', empty)).toBe('');
    expect(formatBodyField('height', 'imperial', empty)).toBe('');
  });

  it('labels ages and wheels in Spanish, keeping the unit symbols', () => {
    const es = translatorFor('es');
    const drafts = { ...empty, heightFeet: '5', heightInches: '10', age: '34', weight: '165' };
    expect(formatBodyField('age', 'imperial', drafts, es)).toBe('34 años');
    expect(formatBodyField('height', 'imperial', drafts, es)).toBe('5 ft 10 in');
    expect(wheelColumns('age', 'metric', es)[0]).toMatchObject({ unit: 'años', accessibilityLabel: 'Edad, años' });
    expect(wheelColumns('goalWeight', 'metric', es)[0].accessibilityLabel).toBe('Meta de peso, kilogramos');
    expect(wheelColumns('goalWeight', 'imperial')[0].accessibilityLabel).toBe('Goal weight, pounds');
  });
});

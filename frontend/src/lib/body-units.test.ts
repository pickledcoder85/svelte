import { describe, expect, it } from 'vitest';

import {
  bodyMeasurementsFromDrafts,
  convertBodyDrafts,
  defaultUnitSystemForLocale,
  type BodyDrafts
} from './body-units';

const empty: BodyDrafts = { heightFeet: '', heightInches: '', heightCm: '', weight: '' };

describe('body units', () => {
  it('picks imperial for US locales and metric elsewhere', () => {
    expect(defaultUnitSystemForLocale('en-US')).toBe('imperial');
    expect(defaultUnitSystemForLocale('en-GB')).toBe('metric');
    expect(defaultUnitSystemForLocale('de-DE')).toBe('metric');
    expect(defaultUnitSystemForLocale('en')).toBe('metric');
    expect(defaultUnitSystemForLocale(null)).toBe('metric');
  });

  it('turns imperial drafts into cm and lb', () => {
    expect(
      bodyMeasurementsFromDrafts('imperial', { ...empty, heightFeet: '5', heightInches: '10', weight: '180' })
    ).toEqual({ height_cm: 177.8, weight_lbs: 180 });
    expect(bodyMeasurementsFromDrafts('imperial', { ...empty, heightFeet: '6', heightInches: '', weight: '200' })).toEqual({
      height_cm: 182.9,
      weight_lbs: 200
    });
  });

  it('turns metric drafts into cm and lb', () => {
    expect(bodyMeasurementsFromDrafts('metric', { ...empty, heightCm: '178', weight: '70' })).toEqual({
      height_cm: 178,
      weight_lbs: 154.3
    });
  });

  it('rejects missing or invalid measurements', () => {
    expect(bodyMeasurementsFromDrafts('imperial', empty)).toBeNull();
    expect(bodyMeasurementsFromDrafts('imperial', { ...empty, heightFeet: '5', heightInches: '12', weight: '180' })).toBeNull();
    expect(bodyMeasurementsFromDrafts('metric', { ...empty, heightCm: '0', weight: '70' })).toBeNull();
    expect(bodyMeasurementsFromDrafts('metric', { ...empty, heightCm: '178', weight: 'abc' })).toBeNull();
  });

  it('converts typed values when switching systems, and back', () => {
    const imperial = { ...empty, heightFeet: '5', heightInches: '10', weight: '180' };
    const metric = convertBodyDrafts(imperial, 'imperial', 'metric');
    expect(metric).toMatchObject({ heightCm: '178', weight: '81.6' });
    expect(convertBodyDrafts(metric, 'metric', 'imperial')).toMatchObject({
      heightFeet: '5',
      heightInches: '10',
      weight: '179.9'
    });
  });

  it('keeps empty fields empty when switching', () => {
    expect(convertBodyDrafts(empty, 'imperial', 'metric')).toEqual(empty);
    expect(convertBodyDrafts(empty, 'metric', 'imperial')).toEqual(empty);
  });
});

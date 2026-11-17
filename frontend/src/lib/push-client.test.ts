import { describe, expect, it } from 'vitest';

import { applicationServerKey, REMINDER_TIME_OPTIONS, sameKey, timeLabel } from './push-client';

describe('push client', () => {
  it('offers hourly times from 7 AM to 9 PM', () => {
    expect(REMINDER_TIME_OPTIONS[0]).toBe('07:00');
    expect(REMINDER_TIME_OPTIONS.at(-1)).toBe('21:00');
  });

  it('labels times', () => {
    expect(timeLabel('10:00')).toBe('10 AM');
    expect(timeLabel('15:00')).toBe('3 PM');
    expect(timeLabel('12:00')).toBe('12 PM');
    expect(timeLabel('07:30')).toBe('7:30 AM');
  });

  it('decodes the server key', () => {
    // base64url of bytes 4, 255, 0, 62, 63 ("BP8APj8")
    expect(Array.from(applicationServerKey('BP8APj8'))).toEqual([4, 255, 0, 62, 63]);
  });

  it('notices a subscription made with another server key', () => {
    const key = applicationServerKey('BP8APj8');
    expect(sameKey(key.buffer, key)).toBe(true);
    expect(sameKey(new Uint8Array([4, 1, 2]).buffer, key)).toBe(false);
    expect(sameKey(null, key)).toBe(false);
  });
});

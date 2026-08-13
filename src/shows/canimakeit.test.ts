import { describe, expect, test } from 'vitest';
import { assess, hhmmToMinutes, nextTime } from './canimakeit';
import { activeEntries } from './schedule';
import type { ShowsData } from '../types';

describe('hhmmToMinutes', () => {
  test('parses HH:MM', () => {
    expect(hhmmToMinutes('00:00')).toBe(0);
    expect(hhmmToMinutes('15:45')).toBe(945);
  });
});

describe('nextTime', () => {
  const times = ['10:15', '13:15', '16:30'];
  test('picks the first time at or after now', () => {
    expect(nextTime(times, hhmmToMinutes('09:00'))).toBe('10:15');
    expect(nextTime(times, hhmmToMinutes('13:15'))).toBe('13:15');
    expect(nextTime(times, hhmmToMinutes('14:00'))).toBe('16:30');
  });
  test('returns null after the last show', () => {
    expect(nextTime(times, hhmmToMinutes('17:00'))).toBeNull();
  });
});

describe('assess', () => {
  const now = hhmmToMinutes('12:00');
  test('easy: walk + 5 min seat buffer fits', () => {
    expect(assess(hhmmToMinutes('12:20'), now, 10)).toBe('easy');
  });
  test('rush: only doable at jogging pace (60% of walk time)', () => {
    expect(assess(hhmmToMinutes('12:10'), now, 12)).toBe('rush');
  });
  test('missed: not even jogging helps', () => {
    expect(assess(hhmmToMinutes('12:05'), now, 20)).toBe('missed');
  });
  test('missed: show already started', () => {
    expect(assess(hhmmToMinutes('11:55'), now, 1)).toBe('missed');
  });
});

describe('activeEntries', () => {
  const data: ShowsData = {
    updated: '2026-08-13', timezone: 'Atlantic/Canary', venues: [],
    shows: [
      { venueId: 'a', times: ['10:00'] },
      { venueId: 'b', times: ['11:00'], validFrom: '2026-06-01', validTo: '2026-09-30' },
      { venueId: 'c', times: ['12:00'], validFrom: '2026-11-01' }
    ]
  };
  test('keeps undated and in-range entries, drops out-of-range', () => {
    const ids = activeEntries(data, '2026-08-13').map((e) => e.venueId);
    expect(ids).toEqual(['a', 'b']);
  });
});

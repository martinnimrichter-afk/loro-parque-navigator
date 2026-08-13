import { describe, expect, test } from 'vitest';
import { haversineM } from './distance';

describe('haversineM', () => {
  test('returns 0 for identical points', () => {
    expect(haversineM(28.4082, -16.5659, 28.4082, -16.5659)).toBe(0);
  });

  test('measures ~98 m for 0.001° longitude at park latitude', () => {
    const d = haversineM(28.4082, -16.5659, 28.4082, -16.5649);
    expect(d).toBeGreaterThan(95);
    expect(d).toBeLessThan(101);
  });

  test('is symmetric', () => {
    const a = haversineM(28.4082, -16.5659, 28.4079, -16.5689);
    const b = haversineM(28.4079, -16.5689, 28.4082, -16.5659);
    expect(a).toBeCloseTo(b, 6);
  });
});

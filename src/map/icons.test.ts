import { describe, expect, test } from 'vitest';
import { iconFor, poiIcon } from './icons';

describe('poiIcon', () => {
  test('returns the curated animal icon for known enclosures', () => {
    expect(poiIcon({ id: 'node/347312075', category: 'animal' })).toBe('🦍'); // Gorillas
    expect(poiIcon({ id: 'node/347312287', category: 'animal' })).toBe('🐧'); // Planet Penguin
    expect(poiIcon({ id: 'node/3940354788', category: 'animal' })).toBe('🐬'); // Dolphins
    expect(poiIcon({ id: 'node/347312713', category: 'animal' })).toBe('🐅'); // Tigers Island
  });

  test('keeps the parrot only where parrots actually live', () => {
    expect(poiIcon({ id: 'node/3926097588', category: 'animal' })).toBe('🦜'); // Parrots
    expect(poiIcon({ id: 'node/2652526875', category: 'animal' })).toBe('🦜'); // Loro Show
  });

  test('falls back to the category icon for uncurated POIs', () => {
    expect(poiIcon({ id: 'node/999999', category: 'animal' })).toBe(iconFor('animal'));
    expect(poiIcon({ id: 'way/1', category: 'food' })).toBe(iconFor('food'));
  });
});

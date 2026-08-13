import { describe, expect, test, vi } from 'vitest';
import { effectivePosition, startTracking, type LocationState } from './location';

const ENTRANCE = { lat: 28.4082, lon: -16.5659 };

describe('effectivePosition', () => {
  test('uses GPS position when granted', () => {
    const state: LocationState = { status: 'granted', position: { lat: 28.409, lon: -16.567, accuracy: 5 } };
    expect(effectivePosition(state, ENTRANCE)).toEqual({ lat: 28.409, lon: -16.567 });
  });
  test('falls back to entrance when denied or pending', () => {
    expect(effectivePosition({ status: 'denied', position: null }, ENTRANCE)).toEqual(ENTRANCE);
    expect(effectivePosition({ status: 'pending', position: null }, ENTRANCE)).toEqual(ENTRANCE);
  });
});

describe('startTracking', () => {
  test('reports unavailable without geolocation API', () => {
    const onChange = vi.fn();
    startTracking(undefined, onChange);
    expect(onChange).toHaveBeenCalledWith({ status: 'unavailable', position: null });
  });

  test('reports positions and denial via the callback', () => {
    const onChange = vi.fn();
    let success: PositionCallback = () => {};
    let failure: PositionErrorCallback = () => {};
    const fakeGeo = {
      watchPosition: (s: PositionCallback, f: PositionErrorCallback) => { success = s; failure = f; return 7; },
      clearWatch: vi.fn()
    } as unknown as Geolocation;

    const stop = startTracking(fakeGeo, onChange);
    expect(onChange).toHaveBeenCalledWith({ status: 'pending', position: null });

    success({ coords: { latitude: 28.41, longitude: -16.57, accuracy: 8 } } as GeolocationPosition);
    expect(onChange).toHaveBeenLastCalledWith({ status: 'granted', position: { lat: 28.41, lon: -16.57, accuracy: 8 } });

    failure({ code: 1 } as GeolocationPositionError);
    expect(onChange).toHaveBeenLastCalledWith({ status: 'denied', position: null });

    stop();
    expect(fakeGeo.clearWatch).toHaveBeenCalledWith(7);
  });
});

export interface Position { lat: number; lon: number; accuracy: number; }
export interface LocationState {
  status: 'pending' | 'granted' | 'denied' | 'unavailable';
  position: Position | null;
}

export function startTracking(
  geolocation: Geolocation | undefined,
  onChange: (state: LocationState) => void
): () => void {
  if (!geolocation) {
    onChange({ status: 'unavailable', position: null });
    return () => {};
  }
  onChange({ status: 'pending', position: null });
  const watchId = geolocation.watchPosition(
    (pos) => onChange({
      status: 'granted',
      position: { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
    }),
    () => onChange({ status: 'denied', position: null }),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
  return () => geolocation.clearWatch(watchId);
}

export function effectivePosition(
  state: LocationState,
  fallback: { lat: number; lon: number }
): { lat: number; lon: number } {
  return state.position ? { lat: state.position.lat, lon: state.position.lon } : fallback;
}

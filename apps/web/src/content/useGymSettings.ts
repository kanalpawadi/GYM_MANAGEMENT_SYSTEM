import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, GymSettings, getSettings } from '../services/gym';

// One shared request per page load; pages fall back to defaults if it fails.
let cached: Promise<GymSettings> | null = null;

/** For tests: forget the cached settings. */
export function resetGymSettingsCache() {
  cached = null;
}

export function loadGymSettings(force = false): Promise<GymSettings> {
  if (!cached || force) cached = getSettings().catch(() => DEFAULT_SETTINGS);
  return cached;
}

/** Discount switch, geofence and website-approval settings (read by everyone). */
export function useGymSettings(): { settings: GymSettings; reload: () => Promise<void> } {
  const [settings, setSettings] = useState<GymSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    let alive = true;
    loadGymSettings().then((s) => alive && setSettings(s));
    return () => {
      alive = false;
    };
  }, []);
  const reload = async () => setSettings(await loadGymSettings(true));
  return { settings, reload };
}

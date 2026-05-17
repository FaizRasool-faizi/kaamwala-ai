export const LAHORE_FALLBACK = { lat: 31.5204, lng: 74.3587 } as const;

export type LatLng = { lat: number; lng: number };

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export function fetchCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      GEOLOCATION_OPTIONS
    );
  });
}

/** Resolves real GPS coordinates, or Lahore center when unavailable or denied. */
export async function resolveUserLocation(): Promise<LatLng> {
  try {
    return await fetchCurrentPosition();
  } catch {
    return { ...LAHORE_FALLBACK };
  }
}

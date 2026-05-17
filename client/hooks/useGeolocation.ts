"use client";

import { useState, useEffect } from "react";
import {
  fetchCurrentPosition,
  GEOLOCATION_OPTIONS,
  LAHORE_FALLBACK,
  type LatLng,
} from "@/lib/location";

interface Location extends LatLng {
  accuracy: number;
  timestamp: number;
}

export const useGeolocation = (enabled: boolean = true) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    fetchCurrentPosition()
      .then((coords) => {
        if (cancelled) return;
        setLocation({
          ...coords,
          accuracy: 0,
          timestamp: Date.now(),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Location unavailable");
        setLocation({
          ...LAHORE_FALLBACK,
          accuracy: 0,
          timestamp: Date.now(),
        });
      });

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setError(null);
      },
      (positionError) => {
        if (cancelled) return;
        setError(positionError.message);
      },
      GEOLOCATION_OPTIONS
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watcher);
    };
  }, [enabled]);

  return { location, error };
};

"use client";

import { useState, useEffect } from "react";

interface Location {
  lat: number;
  lng: number;
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

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      setError(error.message);
    };

    const watcher = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, [enabled]);

  return { location, error };
};

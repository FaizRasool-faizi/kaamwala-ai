"use client";

import React, { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { fetchCurrentPosition, LAHORE_FALLBACK } from "@/lib/location";

interface MapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
}

export const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const applyLocation = (mapInstance: any, markerInstance: any, loc: { lat: number; lng: number }) => {
    mapInstance.setCenter(loc);
    markerInstance.setPosition(loc);

    if (typeof window === "undefined" || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: loc }, (results: any, status: any) => {
      if (status === "OK" && results?.[0]) {
        onLocationSelect({
          ...loc,
          address: results[0].formatted_address,
        });
      }
    });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.google) return;

    const defaultLoc = initialLocation ?? LAHORE_FALLBACK;

    const mapInstance = new window.google.maps.Map(mapRef.current!, {
      center: defaultLoc,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      mapId: "4504f8b37365c3d0",
    });

    const markerInstance = new window.google.maps.Marker({
      position: defaultLoc,
      map: mapInstance,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });

    setMap(mapInstance);
    setMarker(markerInstance);
    setLoading(false);

    fetchCurrentPosition()
      .then((loc) => applyLocation(mapInstance, markerInstance, loc))
      .catch(() => applyLocation(mapInstance, markerInstance, LAHORE_FALLBACK));

    markerInstance.addListener("dragend", () => {
      const pos = markerInstance.getPosition();
      if (!pos) return;
      const loc = { lat: pos.lat(), lng: pos.lng() };

      if (!window.google) return;
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: loc }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          onLocationSelect({
            ...loc,
            address: results[0].formatted_address,
          });
        }
      });
    });

    mapInstance.addListener("click", (e: any) => {
      if (!e.latLng) return;
      markerInstance.setPosition(e.latLng);
      const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };

      if (!window.google) return;
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: loc }, (results: any, status: any) => {
        if (status === "OK" && results?.[0]) {
          onLocationSelect({
            ...loc,
            address: results[0].formatted_address,
          });
        }
      });
    });
  }, [initialLocation, onLocationSelect]);

  const handleCurrentLocation = () => {
    if (!map || !marker) return;

    fetchCurrentPosition()
      .then((loc) => applyLocation(map, marker, loc))
      .catch(() => applyLocation(map, marker, LAHORE_FALLBACK));
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10">
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />
      <button
        type="button"
        onClick={handleCurrentLocation}
        className="absolute bottom-4 right-4 p-3 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all"
      >
        <Navigation className="w-5 h-5" />
      </button>
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};


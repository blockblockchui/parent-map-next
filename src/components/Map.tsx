"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import for react-leaflet to avoid SSR
const MapWithNoSSR = dynamic(
  () => import("./MapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">載入地圖中...</p>
      </div>
    ),
  }
);

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  district: string;
}

interface MapProps {
  places: Place[];
  selectedPlaceId?: string | null;
  onMarkerClick?: (place: Place) => void;
  userLocation?: { lat: number; lng: number } | null;
  locateAction?: { lat: number; lng: number; trigger: number } | null;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onBoundsChange?: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export default function Map(props: MapProps) {
  return <MapWithNoSSR {...props} />;
}

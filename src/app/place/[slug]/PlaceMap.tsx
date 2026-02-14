"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">載入地圖中...</p>
    </div>
  ),
});

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  district: string;
}

interface PlaceMapProps {
  place: Place;
}

export default function PlaceMap({ place }: PlaceMapProps) {
  return (
    <div className="relative h-[300px] rounded-lg overflow-hidden">
      <Map
        places={[place]}
        selectedPlaceId={place.id}
      />
    </div>
  );
}

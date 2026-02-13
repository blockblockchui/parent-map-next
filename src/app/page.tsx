"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PlaceList from "@/components/PlaceList";
import locationsData from "@/data/locations.json";

// Dynamic import for Map to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">載入地圖中...</p>
    </div>
  ),
});

interface Place {
  id: string;
  name: string;
  nameEn?: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  category: string;
  indoor: boolean;
  ageRange: number[];
  priceType: string;
}

const categoryLabels: Record<string, string> = {
  playhouse: "🎪 遊樂場",
  park: "🌳 公園",
  museum: "🏛️ 博物館",
};

export default function Home() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    region: "all",
    category: "all",
    age: "all",
    price: "all",
    indoor: "all",
  });

  const places: Place[] = locationsData.locations;

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      if (filters.region !== "all" && !place.district.includes(filters.region))
        return false;
      if (filters.category !== "all" && place.category !== filters.category)
        return false;
      if (filters.indoor !== "all") {
        if (filters.indoor === "indoor" && !place.indoor) return false;
        if (filters.indoor === "outdoor" && place.indoor) return false;
      }
      return true;
    });
  }, [places, filters]);

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              🗺️ 香港親子地圖
            </h1>
            <p className="text-base sm:text-lg text-blue-100 mb-4">
              發掘全港最適合親子活動的好去處
            </p>

            {/* Scenarios */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <button
                onClick={() => setFilters({ ...filters, indoor: "indoor" })}
                className="px-4 py-2 bg-white/90 text-blue-700 rounded-full text-sm font-medium hover:bg-white"
              >
                🌧️ 唔怕落雨
              </button>
              <button
                onClick={() => setFilters({ ...filters, age: "0-1" })}
                className="px-4 py-2 bg-white/90 text-blue-700 rounded-full text-sm font-medium hover:bg-white"
              >
                🧒 2歲以下
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, indoor: "indoor", age: "3-6" });
                }}
                className="px-4 py-2 bg-white/90 text-blue-700 rounded-full text-sm font-medium hover:bg-white"
              >
                🎂 生日會場地
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限地區</option>
              <option value="沙田">沙田</option>
              <option value="灣仔">灣仔</option>
              <option value="九龍城">九龍城</option>
              <option value="油尖旺">油尖旺</option>
              <option value="荃灣">荃灣</option>
              <option value="觀塘">觀塘</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限類型</option>
              <option value="playhouse">🎪 遊樂場</option>
              <option value="park">🌳 公園</option>
              <option value="museum">🏛️ 博物館</option>
            </select>

            <select
              value={filters.indoor}
              onChange={(e) =>
                setFilters({ ...filters, indoor: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限室內室外</option>
              <option value="indoor">🏠 室內</option>
              <option value="outdoor">☀️ 室外</option>
            </select>

            <button
              onClick={() =>
                setFilters({
                  region: "all",
                  category: "all",
                  age: "all",
                  price: "all",
                  indoor: "all",
                })
              }
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Map
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          onMarkerClick={(place) => setSelectedPlaceId(place.id)}
        />
      </div>

      {/* Place List */}
      <div className="max-w-7xl mx-auto px-4 py-4 pb-12">
        <PlaceList
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={(place) => setSelectedPlaceId(place.id)}
        />
      </div>

      {/* Selected Place Detail */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {categoryLabels[selectedPlace.category]}
                  </span>
                  <h2 className="text-xl font-bold mt-2">{selectedPlace.name}</h2>
                  <p className="text-gray-600">📍 {selectedPlace.district}</p>
                </div>
                <button
                  onClick={() => setSelectedPlaceId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center bg-green-100 text-green-700 rounded-lg"
                >
                  🗺️ 路線
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

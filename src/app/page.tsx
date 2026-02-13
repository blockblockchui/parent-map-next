"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PlaceList from "@/components/PlaceList";
import locationsData from "@/data/locations.json";

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
  website?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
}

const categoryLabels: Record<string, string> = {
  playhouse: "遊樂場",
  park: "公園",
  museum: "博物館",
  restaurant: "親子餐廳",
  library: "圖書館",
};

const priceSymbols: Record<string, string> = {
  free: "免費",
  low: "$",
  medium: "$$",
  high: "$$$",
};

export default function Home() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState({
    region: "all",
    category: "all",
    age: "all",
    price: "all",
    indoor: "all",
    distance: "all",
  });

  const places: Place[] = locationsData.locations;

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          alert("無法取得位置，請檢查瀏覽器權限");
        }
      );
    }
  };

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
      if (filters.age !== "all") {
        const [minAge, maxAge] = filters.age.split("-").map((a) =>
          a === "12+" ? 12 : parseInt(a)
        );
        if (maxAge) {
          if (place.ageRange[1] < minAge || place.ageRange[0] > maxAge)
            return false;
        }
      }
      if (filters.price !== "all") {
        if (filters.price === "free" && place.priceType !== "free")
          return false;
        if (filters.price === "low" && !["free", "low"].includes(place.priceType))
          return false;
        if (filters.price === "medium" && place.priceType !== "medium")
          return false;
        if (filters.price === "high" && !["high"].includes(place.priceType))
          return false;
      }
      return true;
    });
  }, [places, filters]);

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  const getWebsiteUrl = (place: Place): string | undefined => {
    return place.website || place.facebook_url || place.instagram_url || undefined;
  };

  const getWebsiteLabel = (place: Place) => {
    if (place.website) return "網站";
    if (place.facebook_url) return "Facebook";
    if (place.instagram_url) return "Instagram";
    return "網站";
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              香港親子地圖
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
                唔怕落雨
              </button>
              <button
                onClick={() => setFilters({ ...filters, age: "0-1" })}
                className="px-4 py-2 bg-white/90 text-blue-700 rounded-full text-sm font-medium hover:bg-white"
              >
                2歲以下
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, indoor: "indoor", age: "3-6" });
                }}
                className="px-4 py-2 bg-white/90 text-blue-700 rounded-full text-sm font-medium hover:bg-white"
              >
                生日會場地
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center">
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
              <option value="屯門">屯門</option>
              <option value="元朗">元朗</option>
              <option value="大埔">大埔</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限類型</option>
              <option value="playhouse">遊樂場</option>
              <option value="park">公園</option>
              <option value="museum">博物館</option>
            </select>

            <select
              value={filters.age}
              onChange={(e) => setFilters({ ...filters, age: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限年齡</option>
              <option value="0-1">0-1歲</option>
              <option value="1-2">1-2歲</option>
              <option value="2-3">2-3歲</option>
              <option value="3-6">3-6歲</option>
              <option value="6-12">6-12歲</option>
            </select>

            <select
              value={filters.price}
              onChange={(e) => setFilters({ ...filters, price: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限消費</option>
              <option value="free">免費</option>
              <option value="low">$1-100</option>
              <option value="medium">$100-200</option>
              <option value="high">$200+</option>
            </select>

            <select
              value={filters.indoor}
              onChange={(e) => setFilters({ ...filters, indoor: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">不限室內室外</option>
              <option value="indoor">室內</option>
              <option value="outdoor">室外</option>
            </select>

            <button
              onClick={() =>
                setFilters({
                  region: "all",
                  category: "all",
                  age: "all",
                  price: "all",
                  indoor: "all",
                  distance: "all",
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
        <div className="relative">
          <Map
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
            onMarkerClick={(place) => setSelectedPlaceId(place.id)}
          />
          <button
            onClick={handleLocate}
            className="absolute bottom-4 right-4 z-[500] bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            title="定位我的位置"
          >
            定位我
          </button>
        </div>
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
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedPlaceId(null)}
        >
          <div
            className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {categoryLabels[selectedPlace.category] || selectedPlace.category}
                  </span>
                  <h2 className="text-xl font-bold mt-2">{selectedPlace.name}</h2>
                  <p className="text-gray-600">{selectedPlace.district}</p>
                </div>
                <button
                  onClick={() => setSelectedPlaceId(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  x
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  路線
                </a>
                {getWebsiteUrl(selectedPlace) && (
                  <a
                    href={getWebsiteUrl(selectedPlace)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 text-center bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    {getWebsiteLabel(selectedPlace)}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

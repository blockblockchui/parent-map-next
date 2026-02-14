"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filters, setFilters] = useState({
    region: "all",
    category: "all",
    age: "all",
    price: "all",
    indoor: "all",
  });
  const [showMap, setShowMap] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Handle scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("parentMapFavorites");
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    if (typeof window !== "undefined") {
      localStorage.setItem("parentMapFavorites", JSON.stringify(newFavorites));
    }
  };

  const places: Place[] = locationsData.locations;

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("你的瀏覽器不支援定位功能");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        alert(`已定位：緯度 ${newLocation.lat.toFixed(4)}, 經度 ${newLocation.lng.toFixed(4)}`);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "無法取得位置";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "請允許使用定位權限（瀏覽器地址欄左邊會有提示）";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "位置資訊不可用";
            break;
          case error.TIMEOUT:
            message = "定位超時，請重試";
            break;
        }
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = place.name.toLowerCase().includes(query);
        const matchDistrict = place.district.toLowerCase().includes(query);
        const matchCategory = (categoryLabels[place.category] || "").toLowerCase().includes(query);
        if (!matchName && !matchDistrict && !matchCategory) return false;
      }

      // Favorites filter
      if (showFavoritesOnly && !favorites.includes(place.id)) return false;

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
  }, [places, filters, searchQuery, showFavoritesOnly, favorites]);

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

  // Generate slug from place name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, "") // Keep Chinese characters
      .replace(/\s+/g, "-")
      .replace(/-+$/, "") // Remove trailing dashes
      .substring(0, 50);
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate walking time (1km = 12 minutes)
  const calculateWalkingTime = (distanceMeters: number): { minutes: number; display: string } => {
    const distanceKm = distanceMeters / 1000;
    const minutes = Math.round(distanceKm * 12);
    if (minutes <= 30) {
      return { minutes, display: `約${minutes}分鐘` };
    }
    return { minutes, display: "行路有啲遠" };
  };

  // Get distance display for a place
  const getPlaceDistance = (place: Place) => {
    if (!userLocation) return null;
    const dist = calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng);
    const walking = calculateWalkingTime(dist);
    const distanceDisplay = dist >= 1000 
      ? `${(dist / 1000).toFixed(1)}公里`
      : `${Math.round(dist)}米`;
    return { distance: distanceDisplay, walking: walking.display };
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

            {/* Search */}
            <div className="max-w-2xl mx-auto flex gap-2 px-4 sm:px-0 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋地點..."
                className="flex-1 min-w-0 px-4 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  清除
                </button>
              )}
            </div>

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

      {/* Sticky Header: Filters + Map */}
      <div className="sticky top-0 z-40">
        {/* Filters */}
        <div className="bg-white border-b">
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
                  })
                }
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
              >
                重置篩選
              </button>

              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFavoritesOnly
                    ? "bg-red-200 text-red-700 border border-red-400"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                收藏地點 ({favorites.length})
              </button>

              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showMap
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                {showMap ? "隱藏地圖" : "顯示地圖"}
              </button>
            </div>
          </div>
        </div>

        {/* Map - Mobile: height 50% of viewport width, max 350px */}
        {showMap && (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{ height: 'clamp(250px, 50vw, 350px)' }}
              >
                <Map
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlaceId}
                  onMarkerClick={(place) => setSelectedPlaceId(place.id)}
                  userLocation={userLocation}
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
          </div>
        )}
      </div>

      {/* Place List */}
      <div className="max-w-7xl mx-auto px-4 py-4 pb-12">
        <PlaceList
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={(place) => setSelectedPlaceId(place.id)}
          userLocation={userLocation}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
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
                  {userLocation && (() => {
                    const distInfo = getPlaceDistance(selectedPlace);
                    if (!distInfo) return null;
                    return (
                      <p className="text-sm text-purple-600 mt-1">
                        {distInfo.distance} · 步行{distInfo.walking}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-2 items-start">
                  <button
                    onClick={() => toggleFavorite(selectedPlace.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      favorites.includes(selectedPlace.id)
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={favorites.includes(selectedPlace.id) ? "取消收藏" : "加入收藏"}
                  >
                    {favorites.includes(selectedPlace.id) ? "已收藏" : "收藏"}
                  </button>
                  <button
                    onClick={() => setSelectedPlaceId(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl px-2"
                  >
                    x
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Link
                  href={`/place/${generateSlug(selectedPlace.name)}`}
                  className="flex-1 py-2 text-center bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                  onClick={() => setSelectedPlaceId(null)}
                >
                  查看詳情
                </Link>
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

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="回到頂部"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </main>
  );
}

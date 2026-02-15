"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PlaceList from "@/components/PlaceList";
import CarparkList from "@/components/CarparkList";
import RainfallNowcast from "@/components/RainfallNowcast";
import locationsData from "@/data/locations.json";
import { useCarparks } from "@/lib/carpark";

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
  nameEn?: any;
  district: string;
  region: string;
  lat: number;
  lng: number;
  category: string;
  indoor: boolean;
  ageRange: number[];
  priceType: string;
  priceDescription?: any;
  description?: any;
  address?: any;
  tips?: any;
  openingHours?: any;
  website?: any;
  facebook_url?: any;
  instagram_url?: any;
}

const categoryLabels: Record<string, string> = {
  playhouse: "🎪 遊樂場",
  park: "🌳 公園",
  museum: "🏛️ 博物館",
  restaurant: "🍽️ 親子餐廳",
  library: "📚 圖書館",
};

const priceSymbols: Record<string, string> = {
  free: "免費",
  low: "$",
  medium: "$$",
  high: "$$$",
};

export default function Home() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showPlaceDetail, setShowPlaceDetail] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [filters, setFilters] = useState({
    regions: [] as string[],
    categories: [] as string[],
    ages: [] as string[],
    prices: [] as string[],
    indoor: "all",
  });
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [locateAction, setLocateAction] = useState<{ lat: number; lng: number; trigger: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 22.32, lng: 114.17 });
  const [listCenter, setListCenter] = useState<{ lat: number; lng: number }>({ lat: 22.32, lng: 114.17 });
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'distance' | 'priceLow' | 'priceHigh'>('default');
  const [isListView, setIsListView] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [filterBarHeight, setFilterBarHeight] = useState(60);
  const filterBarRef = useRef<HTMLDivElement>(null);
  
  // Fetch carparks data
  const { carparks, loading: carparksLoading } = useCarparks();
  
  // Debug: log carparks count
  useEffect(() => {
    console.log('Page loaded carparks:', carparks.length, 'Loading:', carparksLoading);
  }, [carparks, carparksLoading]);
  
  // Global toggle for carpark display
  const [showCarparks, setShowCarparks] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("parentMapFavorites");
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Dynamic calculate filter bar height for sticky positioning
  useEffect(() => {
    const updateHeight = () => {
      if (filterBarRef.current) {
        setFilterBarHeight(filterBarRef.current.offsetHeight);
      }
    };
    
    updateHeight();
    // Small delay to ensure DOM is fully rendered after map toggle
    const timeout = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeout);
    };
  }, [showMap]);

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showRegionModal && !target.closest('.region-modal-container')) {
        setShowRegionModal(false);
      }
      if (showCategoryModal && !target.closest('.category-modal-container')) {
        setShowCategoryModal(false);
      }
      if (showAgeModal && !target.closest('.age-modal-container')) {
        setShowAgeModal(false);
      }
      if (showPriceModal && !target.closest('.price-modal-container')) {
        setShowPriceModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRegionModal, showCategoryModal, showAgeModal, showPriceModal]);

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

  // Calculate distance between two points (Haversine formula) - defined outside useMemo
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

  const handleLocate = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        // Set locate action with new location to force map update
        // Use timestamp to ensure unique value
        setLocateAction({ ...newLocation, trigger: Date.now() });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Calculate distance between two points (Haversine formula) in km
  const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredPlaces = useMemo(() => {
    // Always use listCenter (frozen until user clicks update button)
    const refPoint = listCenter;
    
    return places.filter((place) => {
      // Map radius filter - only show places within 4km
      const distance = calculateDistanceKm(refPoint.lat, refPoint.lng, place.lat, place.lng);
      if (distance > 4) return false;
      
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

      if (filters.regions.length > 0 && !filters.regions.some(r => place.district.includes(r)))
        return false;
      if (filters.categories.length > 0 && !filters.categories.includes(place.category))
        return false;
      if (filters.indoor !== "all") {
        if (filters.indoor === "indoor" && !place.indoor) return false;
        if (filters.indoor === "outdoor" && place.indoor) return false;
      }
      if (filters.ages.length > 0) {
        // Check if place age range overlaps with any selected age ranges
        const ageOverlaps = filters.ages.some(ageFilter => {
          const [minAge, maxAge] = ageFilter.split("-").map((a) =>
            a === "12+" ? 12 : parseInt(a)
          );
          if (maxAge) {
            return !(place.ageRange[1] < minAge || place.ageRange[0] > maxAge);
          }
          return place.ageRange[0] <= minAge && place.ageRange[1] >= minAge;
        });
        if (!ageOverlaps) return false;
      }
      if (filters.prices.length > 0) {
        const priceMatches = filters.prices.some(priceFilter => {
          if (priceFilter === "free") return place.priceType === "free";
          if (priceFilter === "low") return ["free", "low"].includes(place.priceType);
          if (priceFilter === "medium") return place.priceType === "medium";
          if (priceFilter === "high") return place.priceType === "high";
          return false;
        });
        if (!priceMatches) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort logic
      if (sortBy === 'distance') {
        const distA = calculateDistanceKm(refPoint.lat, refPoint.lng, a.lat, a.lng);
        const distB = calculateDistanceKm(refPoint.lat, refPoint.lng, b.lat, b.lng);
        return distA - distB;
      }
      if (sortBy === 'priceLow') {
        const priceOrder = { free: 0, low: 1, medium: 2, high: 3 };
        return priceOrder[a.priceType as keyof typeof priceOrder] - priceOrder[b.priceType as keyof typeof priceOrder];
      }
      if (sortBy === 'priceHigh') {
        const priceOrder = { free: 0, low: 1, medium: 2, high: 3 };
        return priceOrder[b.priceType as keyof typeof priceOrder] - priceOrder[a.priceType as keyof typeof priceOrder];
      }
      return 0;
    });
  }, [places, filters, searchQuery, showFavoritesOnly, favorites, sortBy, listCenter]);

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

  // Calculate walking time (1km = 12 minutes)
  const calculateWalkingTime = (distanceMeters: number): { minutes: number; display: string } => {
    const distanceKm = distanceMeters / 1000;
    const minutes = Math.round(distanceKm * 12);
    if (minutes <= 30) {
      return { minutes, display: `約${minutes}分鐘` };
    }
    return { minutes, display: "🚶有啲遠" };
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
                className="flex-1 min-w-0 px-4 py-3 rounded-lg text-gray-900 text-base bg-white focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
              <button
                onClick={() => searchQuery ? setSearchQuery("") : {}}
                className="px-4 py-3 rounded-lg font-medium transition-colors bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
              >
                {searchQuery ? "清除" : "搜尋"}
              </button>
            </div>

            {/* Scenarios */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <button
                onClick={() => {
                  setFilters({ ...filters, indoor: "indoor" });
                  setActiveScenario("☔ 唔怕落雨");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeScenario === "☔ 唔怕落雨"
                    ? "bg-blue-600 text-white"
                    : "bg-white/90 text-blue-700 hover:bg-white"
                }`}
              >
                ☔ 唔怕落雨
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, ages: ["0-1", "1-2"] });
                  setActiveScenario("👶 2歲以下");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeScenario === "👶 2歲以下"
                    ? "bg-blue-600 text-white"
                    : "bg-white/90 text-blue-700 hover:bg-white"
                }`}
              >
                👶 2歲以下
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, indoor: "indoor", ages: ["3-6"] });
                  setActiveScenario("🎂 生日會場地");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeScenario === "🎂 生日會場地"
                    ? "bg-blue-600 text-white"
                    : "bg-white/90 text-blue-700 hover:bg-white"
                }`}
              >
                🎂 生日會場地
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Filter Bar + Map */}
      <div ref={filterBarRef} className="sticky top-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Region Multi-select */}
            <div className="relative region-modal-container">
              <button
                onClick={() => setShowRegionModal(!showRegionModal)}
                className={`px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 flex items-center gap-1 ${
                  filters.regions.length > 0 ? 'border-blue-400 bg-blue-50' : ''
                }`}
              >
                地區
                {filters.regions.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {filters.regions.length}
                  </span>
                )}
                <span className="ml-1">{showRegionModal ? '▲' : '▼'}</span>
              </button>
              
              {showRegionModal && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[150px]">
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {['沙田', '灣仔', '九龍城', '油尖旺', '荃灣', '觀塘', '屯門', '元朗', '大埔'].map((region) => (
                      <label key={region} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.regions.includes(region)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, regions: [...filters.regions, region] });
                            } else {
                              setFilters({ ...filters, regions: filters.regions.filter(r => r !== region) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{region}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-end">
                    <button
                      onClick={() => setShowRegionModal(false)}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Multi-select */}
            <div className="relative category-modal-container">
              <button
                onClick={() => setShowCategoryModal(!showCategoryModal)}
                className={`px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 flex items-center gap-1 ${
                  filters.categories.length > 0 ? 'border-blue-400 bg-blue-50' : ''
                }`}
              >
                類型
                {filters.categories.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {filters.categories.length}
                  </span>
                )}
                <span className="ml-1">{showCategoryModal ? '▲' : '▼'}</span>
              </button>
              
              {showCategoryModal && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[150px]">
                  <div className="space-y-2">
                    {[
                      { value: 'playhouse', label: '遊樂場' },
                      { value: 'park', label: '公園' },
                      { value: 'museum', label: '博物館' },
                      { value: 'restaurant', label: '親子餐廳' },
                      { value: 'library', label: '圖書館' },
                    ].map((cat) => (
                      <label key={cat.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(cat.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, categories: [...filters.categories, cat.value] });
                            } else {
                              setFilters({ ...filters, categories: filters.categories.filter(c => c !== cat.value) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-end">
                    <button
                      onClick={() => setShowCategoryModal(false)}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Age Multi-select */}
            <div className="relative age-modal-container">
              <button
                onClick={() => setShowAgeModal(!showAgeModal)}
                className={`px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 flex items-center gap-1 ${
                  filters.ages.length > 0 ? 'border-blue-400 bg-blue-50' : ''
                }`}
              >
                年齡
                {filters.ages.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {filters.ages.length}
                  </span>
                )}
                <span className="ml-1">{showAgeModal ? '▲' : '▼'}</span>
              </button>
              
              {showAgeModal && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[150px]">
                  <div className="space-y-2">
                    {[
                      { value: '0-1', label: '0-1歲' },
                      { value: '1-2', label: '1-2歲' },
                      { value: '2-3', label: '2-3歲' },
                      { value: '3-6', label: '3-6歲' },
                      { value: '6-12', label: '6-12歲' },
                    ].map((age) => (
                      <label key={age.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.ages.includes(age.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, ages: [...filters.ages, age.value] });
                            } else {
                              setFilters({ ...filters, ages: filters.ages.filter(a => a !== age.value) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{age.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-end">
                    <button
                      onClick={() => setShowAgeModal(false)}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Price Multi-select */}
            <div className="relative price-modal-container">
              <button
                onClick={() => setShowPriceModal(!showPriceModal)}
                className={`px-3 py-2 border rounded-lg text-sm bg-white text-gray-900 flex items-center gap-1 ${
                  filters.prices.length > 0 ? 'border-blue-400 bg-blue-50' : ''
                }`}
              >
                消費
                {filters.prices.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {filters.prices.length}
                  </span>
                )}
                <span className="ml-1">{showPriceModal ? '▲' : '▼'}</span>
              </button>
              
              {showPriceModal && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[150px]">
                  <div className="space-y-2">
                    {[
                      { value: 'free', label: '免費' },
                      { value: 'low', label: '$1-100' },
                      { value: 'medium', label: '$100-200' },
                      { value: 'high', label: '$200+' },
                    ].map((price) => (
                      <label key={price.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.prices.includes(price.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, prices: [...filters.prices, price.value] });
                            } else {
                              setFilters({ ...filters, prices: filters.prices.filter(p => p !== price.value) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">{price.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-end">
                    <button
                      onClick={() => setShowPriceModal(false)}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>

            <select
              value={filters.indoor}
              onChange={(e) => setFilters({ ...filters, indoor: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-900"
            >
              <option value="all">不限室內室外</option>
              <option value="indoor">室內</option>
              <option value="outdoor">室外</option>
            </select>

            <button
              onClick={() => {
                setFilters({
                  regions: [],
                  categories: [],
                  ages: [],
                  prices: [],
                  indoor: "all",
                });
                setActiveScenario(null);
              }}
              className="px-3 py-2 text-sm text-gray-900 hover:text-gray-700 border border-gray-200 rounded-lg bg-white"
            >
              重置篩選
            </button>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="px-3 py-2 text-lg transition-colors"
              title="收藏地點"
            >
              {showFavoritesOnly ? "❤️" : "🤍"}
            </button>

            <button
              onClick={() => setShowMap(!showMap)}
              className="px-3 py-2 text-sm font-medium transition-colors bg-blue-100 text-blue-700 border border-blue-300 rounded-lg"
            >
              {showMap ? "隱藏地圖" : "顯示地圖"}
            </button>
          </div>
        </div>

        {/* Map - Inside sticky container */}
        {showMap && (
          <div className="bg-white border-t">
            <div className="w-full sm:max-w-7xl sm:mx-auto sm:px-4 py-0 sm:py-4">
              <div 
                className="relative sm:rounded-lg overflow-hidden"
                style={{ 
                  height: 'clamp(200px, 40vw, 350px)'
                }}
              >
                <Map
                  places={places}
                  selectedPlaceId={selectedPlaceId}
                  onMarkerClick={(place) => {
                    setSelectedPlaceId(place.id);
                    setShowPlaceDetail(true);
                  }}
                  userLocation={userLocation}
                  locateAction={locateAction}
                  onCenterChange={(center) => {
                    setMapCenter(center);
                    // Check if center has moved significantly from listCenter
                    const distance = calculateDistanceKm(listCenter.lat, listCenter.lng, center.lat, center.lng);
                    if (distance > 0.5) { // 500 meters threshold
                      setHasMapMoved(true);
                    }
                  }}
                />
                <button
                  onClick={handleLocate}
                  className="absolute bottom-4 right-4 z-[500] bg-white text-gray-900 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors font-medium text-sm whitespace-nowrap"
                  title="取得我的位置"
                >
                  取得定位
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Header - Sticky (below filter bar) */}
      <div className="sticky z-50 bg-gray-50 py-3 shadow-sm" style={{ top: `${filterBarHeight}px` }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-gray-600">{filteredPlaces.length} 個好去處</p>
            {activeScenario && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {activeScenario}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showMap && (
              <button
                onClick={() => {
                  setListCenter(mapCenter);
                  setHasMapMoved(false);
                  // Scroll to top of place list
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  hasMapMoved
                    ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
                disabled={!hasMapMoved}
                title={hasMapMoved ? "地圖已移動，點擊更新列表" : "列表已是最新"}
              >
                {hasMapMoved ? '🔄 按地圖更新列表' : '✓ 列表已同步'}
              </button>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'distance' | 'priceLow' | 'priceHigh')}
              className="px-2 py-1.5 border rounded-lg text-sm bg-white"
            >
              <option value="default">預設</option>
              <option value="distance">📍 近→遠</option>
              <option value="priceLow">💰 低→高</option>
              <option value="priceHigh">💰 高→低</option>
            </select>
            <button
              onClick={() => setIsListView(!isListView)}
              className="px-3 py-1.5 border rounded-lg text-lg bg-white hover:bg-gray-50"
              title={isListView ? "格狀" : "列表"}
            >
              {isListView ? "⠿" : "☰"}
            </button>
          </div>
        </div>
      </div>

      {/* Place List */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <PlaceList
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          onPlaceClick={(place) => {
            setSelectedPlaceId(place.id);
            setShowPlaceDetail(true);
          }}
          userLocation={userLocation}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          isListView={isListView}
        />
      </div>

      {/* Selected Place Detail */}
      {selectedPlace && showPlaceDetail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowPlaceDetail(false)}
        >
          <div
            className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              {/* Header with Category & Favorite */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {categoryLabels[selectedPlace.category] || selectedPlace.category}
                </span>
                <div className="flex gap-2 items-start">
                  <button
                    onClick={() => toggleFavorite(selectedPlace.id)}
                    className="text-2xl transition-transform hover:scale-110"
                    title={favorites.includes(selectedPlace.id) ? "取消收藏" : "加入收藏"}
                  >
                    {favorites.includes(selectedPlace.id) ? "❤️" : "🤍"}
                  </button>
                  <button
                    onClick={() => setShowPlaceDetail(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl px-2"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedPlace.name}</h2>

              {/* Age & Description */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {selectedPlace.ageRange[0]}-{selectedPlace.ageRange[1]}歲
                </span>
                {selectedPlace.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{selectedPlace.description}</p>
                )}
              </div>

              {/* District, Address, Tips */}
              <div className="space-y-1 mb-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{selectedPlace.district}</span>
                  {selectedPlace.address && (
                    <p className="text-sm text-gray-600">{selectedPlace.address}</p>
                  )}
                </div>
                {selectedPlace.tips && (
                  <p className="text-xs text-amber-600">💡 {selectedPlace.tips}</p>
                )}
              </div>

              {/* Opening Hours & Price */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPlace.openingHours && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">🕐 {selectedPlace.openingHours}</span>
                )}
                {selectedPlace.priceDescription && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">💰 {selectedPlace.priceDescription}</span>
                )}
              </div>

              {/* Distance */}
              {userLocation && (() => {
                const distInfo = getPlaceDistance(selectedPlace);
                if (!distInfo) return null;
                return (
                  <p className="text-sm text-purple-600 mb-4">
                    {distInfo.distance} · 🚶{distInfo.walking}
                  </p>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                >
                  路線
                </a>
                {getWebsiteUrl(selectedPlace) && (
                  <a
                    href={getWebsiteUrl(selectedPlace)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 text-center bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    {getWebsiteLabel(selectedPlace)}
                  </a>
                )}
              </div>

              {/* Rainfall Nowcast */}
              <div className="border-t pt-4">
                <RainfallNowcast
                  placeLat={selectedPlace.lat}
                  placeLng={selectedPlace.lng}
                />
              </div>

              {/* Carpark Toggle & Information */}
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => setShowCarparks(!showCarparks)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    showCarparks
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg">🅿️</span>
                  <span className="text-sm font-medium">
                    {showCarparks ? '隱藏停車場' : '顯示附近停車場'}
                  </span>
                </button>

                {showCarparks && (
                  <div className="mt-3">
                    <CarparkList
                      carparks={carparks}
                      placeLat={selectedPlace.lat}
                      placeLng={selectedPlace.lng}
                      radiusKm={1}
                      maxResults={5}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

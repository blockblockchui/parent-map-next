"use client";

import { useState, useMemo } from "react";

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
  description?: string;
  images?: {
    local?: string;
    cloudinary?: string;
  };
}

interface PlaceListProps {
  places: Place[];
  onPlaceClick?: (place: Place) => void;
  selectedPlaceId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  isListView?: boolean;
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

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate walking time (1km = 12 minutes)
function calculateWalkingTime(distanceMeters: number): { minutes: number; display: string } {
  const distanceKm = distanceMeters / 1000;
  const minutes = Math.round(distanceKm * 12);
  if (minutes <= 30) {
    return { minutes, display: `約${minutes}分鐘` };
  }
  return { minutes, display: "🚶有啲遠" };
}

export default function PlaceList({
  places,
  onPlaceClick,
  selectedPlaceId,
  userLocation,
  favorites = [],
  onToggleFavorite,
  isListView = false
}: PlaceListProps) {

  // Calculate distances for display (places already sorted by parent)
  const placesWithDistance = useMemo(() => {
    return places.map(place => {
      if (userLocation) {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng);
        const walking = calculateWalkingTime(dist);
        return { ...place, distance: dist, walkingTime: walking };
      }
      return { ...place, distance: null, walkingTime: null };
    });
  }, [places, userLocation]);

  if (places.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暫時沒有符合條件的地點</p>
      </div>
    );
  }

  return (
    <div>
      {/* List */}
      <div className={isListView ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {placesWithDistance.map((place, index) => (
          <PlaceCard
            key={place.id}
            place={place}
            index={index + 1}
            total={placesWithDistance.length}
            isListView={isListView}
            isSelected={selectedPlaceId === place.id}
            onClick={() => onPlaceClick?.(place)}
            userLocation={userLocation}
            isFavorite={favorites.includes(place.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

interface PlaceWithDistance extends Place {
  distance: number | null;
  walkingTime: { minutes: number; display: string } | null;
}

function PlaceCard({
  place,
  index,
  total,
  isListView,
  isSelected,
  onClick,
  userLocation,
  isFavorite,
  onToggleFavorite,
}: {
  place: PlaceWithDistance;
  index: number;
  total: number;
  isListView: boolean;
  isSelected: boolean;
  onClick: () => void;
  userLocation?: { lat: number; lng: number } | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const hasImage = place.images?.local || place.images?.cloudinary;
  const imageUrl = place.images?.local || place.images?.cloudinary;
  const categoryColor = getCategoryColor(place.category);
  
  // Format distance display
  const distanceDisplay = place.distance !== null && place.distance !== undefined
    ? place.distance >= 1000 
      ? `${(place.distance / 1000).toFixed(1)}公里`
      : `${Math.round(place.distance)}米`
    : null;

  if (isListView) {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-3 cursor-pointer ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex gap-3">
          {/* Index number */}
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
            {index}
          </div>
          {/* Image - hidden on mobile */}
          <div className="hidden sm:block w-24 h-20 flex-shrink-0">
            {hasImage ? (
              <img
                src={imageUrl}
                alt={place.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className={`w-full h-full rounded-lg flex items-center justify-center ${categoryColor}`}>
                <span className="text-white text-2xl" style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}>
                  {categoryLabels[place.category]?.split(' ')[0] || '🎯'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {categoryLabels[place.category] || place.category}
                  </span>
                  {distanceDisplay && place.walkingTime && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {distanceDisplay} · 步行{place.walkingTime.display}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 truncate">{place.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{place.district}</span>
                  <span className="text-xs">{place.indoor ? "室內" : "戶外"}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {place.ageRange[0]}-{place.ageRange[1]}歲
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    {priceSymbols[place.priceType] || place.priceType}
                  </span>
                </div>
              </div>
              {/* Favorite button - always visible */}
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(place.id);
                  }}
                  className="text-xl transition-transform hover:scale-110 flex-shrink-0"
                  title={isFavorite ? "取消收藏" : "加入收藏"}
                >
                  {isFavorite ? "❤️" : "🤍"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer relative ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      {/* Index badge */}
      <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
        {index}
      </div>
      {/* Image */}
      <div className="h-40 relative">
        {hasImage ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${categoryColor}`}>
            <span className="text-white text-5xl" style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}>
              {categoryLabels[place.category]?.split(' ')[0] || '🎯'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {categoryLabels[place.category] || place.category}
            </span>
            {distanceDisplay && place.walkingTime && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {distanceDisplay} · 步行{place.walkingTime.display}
              </span>
            )}
          </div>
          {/* Favorite button - always visible */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(place.id);
              }}
              className="text-xl transition-transform hover:scale-110"
              title={isFavorite ? "取消收藏" : "加入收藏"}
            >
              {isFavorite ? "❤️" : "🤍"}
            </button>
          )}
        </div>
        <h3 className="font-bold text-gray-900 mt-2">{place.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{place.district}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
            {place.ageRange[0]}-{place.ageRange[1]}歲
          </span>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            {priceSymbols[place.priceType] || place.priceType}
          </span>
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    playhouse: "bg-gradient-to-br from-blue-400 to-indigo-500",
    park: "bg-gradient-to-br from-green-400 to-emerald-500",
    museum: "bg-gradient-to-br from-amber-400 to-orange-500",
    restaurant: "bg-gradient-to-br from-rose-400 to-pink-500",
    library: "bg-gradient-to-br from-violet-400 to-purple-500",
  };
  return colors[category] || "bg-gradient-to-br from-gray-400 to-gray-500";
}

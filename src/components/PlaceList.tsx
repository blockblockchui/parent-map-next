"use client";

import { useState } from "react";

interface Place {
  id: string;
  name: string;
  nameEn?: string;
  district: string;
  region: string;
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

export default function PlaceList({ places, onPlaceClick, selectedPlaceId }: PlaceListProps) {
  const [isListView, setIsListView] = useState(false);

  if (places.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暫時找不到符合條件的地點</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">找到 {places.length} 個好去處</p>
        <button
          onClick={() => setIsListView(!isListView)}
          className="px-3 py-1.5 border rounded-lg text-sm bg-white hover:bg-gray-50"
        >
          {isListView ? "⊞ 格狀" : "☰ 列表"}
        </button>
      </div>

      {/* List */}
      <div className={isListView ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            isListView={isListView}
            isSelected={selectedPlaceId === place.id}
            onClick={() => onPlaceClick?.(place)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaceCard({
  place,
  isListView,
  isSelected,
  onClick,
}: {
  place: Place;
  isListView: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasImage = place.images?.local || place.images?.cloudinary;
  const imageUrl = place.images?.local || place.images?.cloudinary;
  const categoryColor = getCategoryColor(place.category);

  if (isListView) {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-3 cursor-pointer ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
      >
        <div className="flex gap-3">
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
                <span className="text-white text-2xl">
                  {categoryLabels[place.category]?.[0] || "🎯"}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {categoryLabels[place.category] || place.category}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 truncate">{place.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{place.district}</span>
              <span className="text-xs">{place.indoor ? "🏠 室內" : "🌳 戶外"}</span>
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
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
    >
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
            <span className="text-white text-5xl">
              {categoryLabels[place.category]?.[0] || "🎯"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
            {categoryLabels[place.category] || place.category}
          </span>
        </div>
        <h3 className="font-bold text-gray-900 mt-2">{place.name}</h3>
        <p className="text-sm text-gray-600 mt-1">📍 {place.district}</p>
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

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import locationsData from "@/data/locations.json";
import PlaceMap from "./PlaceMap";

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
  website?: any;
  facebook_url?: any;
  instagram_url?: any;
  googleMapsUrl?: any;
  tips?: any;
  openingHours?: any;
  address?: any;
  hasBabyRoom?: boolean;
  hasStrollerAccess?: boolean;
  hasRestaurant?: boolean;
  rainyDaySuitable?: boolean;
  verified?: boolean;
  updatedAt?: any;
  checkedAt?: any;
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

// Generate slug from place name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, "") // Keep Chinese characters
    .replace(/\s+/g, "-")
    .replace(/-+$/, "") // Remove trailing dashes
    .substring(0, 50);
};

// Generate static params for all places
export function generateStaticParams() {
  return locationsData.locations.map((place) => ({
    slug: generateSlug(place.name),
  }));
}

// Generate metadata for each place
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const decodedSlug = decodeURIComponent(params.slug);
  const place = locationsData.locations.find(
    (p) => generateSlug(p.name) === decodedSlug
  );
  
  if (!place) {
    return {
      title: "找不到地點 | 香港親子地圖",
    };
  }
  
  return {
    title: `${place.name} | 香港親子地圖`,
    description: place.description || `發掘${place.district}的親子好去處：${place.name}`,
  };
}

// Find place by slug (handle URL encoding)
const findPlaceBySlug = (slug: string): Place | undefined => {
  // Decode URL-encoded slug (e.g., %E6%B2%99%E7%94%B0 -> 沙田)
  const decodedSlug = decodeURIComponent(slug);
  return locationsData.locations.find(
    (place) => generateSlug(place.name) === decodedSlug
  );
};

export default function PlacePage({ params }: { params: { slug: string } }) {
  const place = findPlaceBySlug(params.slug);
  
  if (!place) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold">香港親子地圖</h1>
            <div className="w-6" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="mb-4">
            <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded mb-2">
              {categoryLabels[place.category] || place.category}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
            {place.nameEn && (
              <p className="text-gray-500 text-sm mt-1">{place.nameEn}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="bg-gray-100 px-3 py-1 rounded-full">{place.district}</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {place.indoor ? "室內" : "戶外"}
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              {place.ageRange[0]}-{place.ageRange[1]}歲
            </span>
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
              {priceSymbols[place.priceType] || place.priceType}
              {place.priceDescription && ` (${place.priceDescription})`}
            </span>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <PlaceMap place={place} />
        </div>

        {/* Description */}
        {place.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h2 className="text-lg font-bold mb-3">簡介</h2>
            <p className="text-gray-700 leading-relaxed">{place.description}</p>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {place.address && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-500 mb-1">地址</h3>
              <p className="text-gray-900">{place.address}</p>
            </div>
          )}
          {place.openingHours && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-500 mb-1">開放時間</h3>
              <p className="text-gray-900">{place.openingHours}</p>
            </div>
          )}
          {place.tips && (
            <div className="bg-white rounded-xl shadow-sm p-4 md:col-span-2">
              <h3 className="text-sm font-bold text-gray-500 mb-1">貼士</h3>
              <p className="text-gray-900">{place.tips}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 text-center bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            路線導航
          </a>
          {(place.website || place.facebook_url || place.instagram_url) && (
            <a
              href={place.website || place.facebook_url || place.instagram_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 text-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              {place.website ? "網站" : place.facebook_url ? "Facebook" : "Instagram"}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <Link href="/" className="text-blue-600 hover:underline">
            ← 返回地圖
          </Link>
          {place.checkedAt && (
            <p className="mt-2">資料更新於：{place.checkedAt}</p>
          )}
        </div>
      </div>
    </main>
  );
}

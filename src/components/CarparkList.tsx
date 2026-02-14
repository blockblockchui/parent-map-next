'use client';

import { useMemo } from 'react';
import { 
  CarparkWithVacancy, 
  CarparkWithVacancyAndDistance,
  getNearbyCarparks, 
  formatFacilities, 
  getHeightLimit 
} from '@/lib/carpark';

interface CarparkListProps {
  carparks: CarparkWithVacancy[];
  placeLat: number;
  placeLng: number;
  radiusKm?: number;
  maxResults?: number;
}

export default function CarparkList({ 
  carparks, 
  placeLat, 
  placeLng, 
  radiusKm = 1,
  maxResults = 5 
}: CarparkListProps) {
  const nearbyCarparks = useMemo(() => {
    return getNearbyCarparks<CarparkWithVacancy>(carparks, placeLat, placeLng, radiusKm).slice(0, maxResults);
  }, [carparks, placeLat, placeLng, radiusKm, maxResults]);

  if (nearbyCarparks.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        附近暫無停車場資料
      </div>
    );
  }

  // Format vacancy number with color
  const getVacancyDisplay = (count: number) => {
    if (count === 0) return { text: '滿', color: 'text-red-600 bg-red-50' };
    if (count <= 5) return { text: `${count}個`, color: 'text-orange-600 bg-orange-50' };
    return { text: `${count}個`, color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🅿️</span>
        <h3 className="font-bold text-gray-900">附近停車場</h3>
        <span className="text-xs text-gray-500">({nearbyCarparks.length}個)</span>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {nearbyCarparks.map((carpark, index) => {
          const vacancyDisplay = carpark.vacancy 
            ? getVacancyDisplay(carpark.vacancy.vacancy)
            : null;
          
          return (
            <a
              key={carpark.park_Id}
              href={`https://www.google.com/maps/dir/?api=1&destination=${carpark.latitude},${carpark.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {index + 1}. {carpark.name}
                    </span>
                    {carpark.opening_status === 'OPEN' ? (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">開放中</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">已關閉</span>
                    )}
                    {vacancyDisplay && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${vacancyDisplay.color}`}>
                        空位: {vacancyDisplay.text}
                      </span>
                    )}
                  </div>

                  {/* Vacancy details */}
                  {carpark.vacancy && (carpark.vacancy.vacancyEV !== undefined || carpark.vacancy.vacancyDIS !== undefined) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      {carpark.vacancy.vacancyEV !== undefined && (
                        <span className="text-blue-600">
                          ⚡ EV: {carpark.vacancy.vacancyEV}個
                        </span>
                      )}
                      {carpark.vacancy.vacancyDIS !== undefined && (
                        <span className="text-purple-600">
                          ♿ 傷健: {carpark.vacancy.vacancyDIS}個
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                    <span>📍 {carpark.distanceDisplay}</span>
                    <span>🚶 {carpark.walkingTime}</span>
                    {getHeightLimit(carpark) && (
                      <span>🚗 限高{getHeightLimit(carpark)}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {carpark.facilities && carpark.facilities.length > 0 && (
                      <span className="text-sm" title={carpark.facilities.join(', ')}>
                        {formatFacilities(carpark.facilities)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {carpark.displayAddress}
                  </p>

                  {/* Last update time */}
                  {carpark.vacancy?.lastupdate && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      更新: {carpark.vacancy.lastupdate}
                    </p>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        資料來源：運輸署 · 實時更新
      </p>
    </div>
  );
}

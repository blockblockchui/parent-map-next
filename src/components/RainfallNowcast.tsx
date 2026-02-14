'use client';

import { useMemo } from 'react';
import { 
  useRainfallNowcast, 
  getRainfallAtLocation, 
  getRainfallDescription,
  formatForecastTime 
} from '@/lib/rainfall';

interface RainfallNowcastProps {
  placeLat: number;
  placeLng: number;
}

export default function RainfallNowcast({ placeLat, placeLng }: RainfallNowcastProps) {
  const { gridPoints, loading, error, lastUpdate } = useRainfallNowcast();

  const rainfall = useMemo(() => {
    return getRainfallAtLocation(gridPoints, placeLat, placeLng);
  }, [gridPoints, placeLat, placeLng]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-2">
        載入降雨預測中...
      </div>
    );
  }

  if (error || !rainfall) {
    return (
      <div className="text-sm text-gray-400 py-2">
        暫無降雨預測資料
      </div>
    );
  }

  const description = getRainfallDescription(rainfall.rainfall);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌧️</span>
        <h3 className="font-bold text-gray-900">臨近降雨預測</h3>
      </div>

      <div className={`rounded-lg p-4 ${description.color}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{description.icon}</span>
          <div>
            <div className="text-lg font-bold">
              {description.text}
            </div>
            <div className="text-sm">
              預計累計雨量: {rainfall.rainfall.toFixed(1)} 毫米
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          預測時段: {formatForecastTime(rainfall.startTime)} - {formatForecastTime(rainfall.endTime)}
        </p>
        <p>
          資料更新: {lastUpdate}
        </p>
      </div>

      <p className="text-xs text-gray-400">
        資料來源：香港天文台 · 網格降雨預測
      </p>
    </div>
  );
}

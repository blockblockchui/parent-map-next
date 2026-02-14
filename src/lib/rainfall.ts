import { useState, useEffect } from 'react';

export interface RainfallGridPoint {
  startTime: string;
  endTime: string;
  lat: number;
  lng: number;
  rainfall: number;
}

// Parse CSV content to rainfall data
export function parseRainfallCSV(csvText: string): RainfallGridPoint[] {
  const lines = csvText.trim().split('\n');
  const results: RainfallGridPoint[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 5) continue;
    
    const [startTime, endTime, latStr, lngStr, rainfallStr] = parts;
    
    results.push({
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
      rainfall: parseFloat(rainfallStr) || 0,
    });
  }
  
  return results;
}

// Fetch rainfall nowcast data
export async function fetchRainfallNowcast(): Promise<RainfallGridPoint[]> {
  try {
    const response = await fetch(
      'https://data.weather.gov.hk/weatherAPI/hko_data/F3/Gridded_rainfall_nowcast_tc.csv',
      { cache: 'no-store' }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch rainfall data');
    }
    const csvText = await response.text();
    return parseRainfallCSV(csvText);
  } catch (error) {
    console.error('Error fetching rainfall data:', error);
    return [];
  }
}

// Calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get rainfall at specific location (find nearest grid point)
export function getRainfallAtLocation(
  gridPoints: RainfallGridPoint[],
  lat: number,
  lng: number
): RainfallGridPoint | null {
  if (gridPoints.length === 0) return null;
  
  let nearest = gridPoints[0];
  let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);
  
  for (const point of gridPoints) {
    const distance = calculateDistance(lat, lng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }
  
  return nearest;
}

// Get rainfall description based on amount
export function getRainfallDescription(rainfall: number): { 
  text: string; 
  color: string; 
  icon: string;
  level: 'none' | 'light' | 'moderate' | 'heavy' | 'very_heavy';
} {
  if (rainfall === 0) {
    return { 
      text: '無雨', 
      color: 'text-gray-600 bg-gray-50', 
      icon: '☀️',
      level: 'none'
    };
  }
  if (rainfall < 0.5) {
    return { 
      text: '微雨', 
      color: 'text-blue-400 bg-blue-50', 
      icon: '🌤️',
      level: 'light'
    };
  }
  if (rainfall < 2.5) {
    return { 
      text: '小雨', 
      color: 'text-blue-600 bg-blue-100', 
      icon: '🌦️',
      level: 'light'
    };
  }
  if (rainfall < 8) {
    return { 
      text: '中雨', 
      color: 'text-blue-700 bg-blue-200', 
      icon: '🌧️',
      level: 'moderate'
    };
  }
  if (rainfall < 16) {
    return { 
      text: '大雨', 
      color: 'text-indigo-700 bg-indigo-200', 
      icon: '⛈️',
      level: 'heavy'
    };
  }
  return { 
    text: '暴雨', 
    color: 'text-red-700 bg-red-200', 
    icon: '⛈️',
    level: 'very_heavy'
  };
}

// Format time from HHMM to readable format
export function formatForecastTime(timeStr: string): string {
  if (timeStr.length !== 12) return timeStr;
  const hour = timeStr.substring(8, 10);
  const minute = timeStr.substring(10, 12);
  return `${hour}:${minute}`;
}

// Hook to fetch rainfall data
export function useRainfallNowcast() {
  const [gridPoints, setGridPoints] = useState<RainfallGridPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function loadRainfall() {
      try {
        // Check cache first (valid for 10 minutes)
        const cached = localStorage.getItem('rainfall_cache');
        const cachedTime = localStorage.getItem('rainfall_cache_time');
        const now = Date.now();

        if (cached && cachedTime && (now - parseInt(cachedTime)) < 600000) {
          if (mounted) {
            const data = JSON.parse(cached);
            setGridPoints(data);
            setLastUpdate(new Date(parseInt(cachedTime)).toLocaleTimeString('zh-HK'));
            setLoading(false);
          }
          return;
        }

        const data = await fetchRainfallNowcast();
        
        if (mounted) {
          setGridPoints(data);
          setLastUpdate(new Date().toLocaleTimeString('zh-HK'));
          localStorage.setItem('rainfall_cache', JSON.stringify(data));
          localStorage.setItem('rainfall_cache_time', now.toString());
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load rainfall data');
          setLoading(false);
        }
      }
    }

    loadRainfall();

    return () => {
      mounted = false;
    };
  }, []);

  return { gridPoints, loading, error, lastUpdate };
}

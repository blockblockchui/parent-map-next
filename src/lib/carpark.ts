import { useState, useEffect } from 'react';

export interface Carpark {
  park_Id: string;
  name: string;
  displayAddress: string;
  district: string;
  latitude: number;
  longitude: number;
  opening_status: 'OPEN' | 'CLOSED';
  heightLimits?: { height: number; remark?: string }[];
  facilities?: string[];
  paymentMethods?: string[];
  contactNo?: string;
  website?: string;
  privateCar?: {
    parkingSpaces?: {
      type: string;
      category: string;
    }[];
  };
}

export interface CarparkWithDistance extends Carpark {
  distance: number;
  distanceDisplay: string;
  walkingTime: string;
}

const FACILITY_ICONS: Record<string, string> = {
  evCharger: '⚡',
  disabilities: '♿',
  unloading: '📦',
  washing: '🚿',
  cctv: '📹',
};

const PAYMENT_ICONS: Record<string, string> = {
  cash: '💵',
  octopus: '💳',
  creditCard: '💳',
  eps: '🏧',
  alipay: '支付宝',
  wechatPay: '微信支付',
};

// Calculate distance between two coordinates in km
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

// Calculate walking time (assume 5km/h walking speed)
export function calculateWalkingTime(distanceKm: number): string {
  const minutes = Math.round(distanceKm / 5 * 60);
  if (minutes < 1) return '<1分鐘';
  return `${minutes}分鐘`;
}

// Fetch all carparks from API
export async function fetchCarparks(): Promise<Carpark[]> {
  try {
    const response = await fetch(
      'https://api.data.gov.hk/v1/carpark-info-vacancy?vehicleTypes=privateCar&lang=zh_TW'
    );
    if (!response.ok) {
      throw new Error('Failed to fetch carparks');
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching carparks:', error);
    return [];
  }
}

// Get nearby carparks within radius (km)
export function getNearbyCarparks(
  carparks: Carpark[],
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1
): CarparkWithDistance[] {
  return carparks
    .map(carpark => {
      const distance = calculateDistance(
        centerLat,
        centerLng,
        carpark.latitude,
        carpark.longitude
      );
      return {
        ...carpark,
        distance,
        distanceDisplay: formatDistance(distance),
        walkingTime: calculateWalkingTime(distance),
      };
    })
    .filter(c => c.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Format facility list
export function formatFacilities(facilities: string[] = []): string {
  return facilities
    .map(f => FACILITY_ICONS[f] || f)
    .filter(Boolean)
    .join(' ');
}

// Format payment methods
export function formatPaymentMethods(methods: string[] = []): string {
  return methods
    .map(m => PAYMENT_ICONS[m] || m)
    .filter(Boolean)
    .join(' ');
}

// Get height limit display
export function getHeightLimit(carpark: Carpark): string | null {
  if (!carpark.heightLimits || carpark.heightLimits.length === 0) return null;
  const limit = carpark.heightLimits[0];
  if (limit.height > 0) {
    return `${limit.height}m`;
  }
  return null;
}

// Hook to fetch and cache carparks
export function useCarparks() {
  const [carparks, setCarparks] = useState<Carpark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCarparks() {
      try {
        // Check cache first (valid for 1 hour)
        const cached = localStorage.getItem('carparks_cache');
        const cachedTime = localStorage.getItem('carparks_cache_time');
        const now = Date.now();

        if (cached && cachedTime && (now - parseInt(cachedTime)) < 3600000) {
          if (mounted) {
            setCarparks(JSON.parse(cached));
            setLoading(false);
          }
          return;
        }

        const data = await fetchCarparks();
        
        if (mounted) {
          setCarparks(data);
          localStorage.setItem('carparks_cache', JSON.stringify(data));
          localStorage.setItem('carparks_cache_time', now.toString());
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load carparks');
          setLoading(false);
        }
      }
    }

    loadCarparks();

    return () => {
      mounted = false;
    };
  }, []);

  return { carparks, loading, error };
}

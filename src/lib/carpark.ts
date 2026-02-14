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

export interface CarparkVacancy {
  park_Id: string;
  vacancy: number;
  vacancyEV?: number;
  vacancyDIS?: number;
  lastupdate: string;
}

export interface CarparkWithVacancy extends Carpark {
  vacancy?: CarparkVacancy;
}

export interface CarparkWithDistance extends Carpark {
  distance: number;
  distanceDisplay: string;
  walkingTime: string;
}

export interface CarparkWithVacancyAndDistance extends CarparkWithVacancy {
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
export function getNearbyCarparks<T extends Carpark>(
  carparks: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1
): (T & { distance: number; distanceDisplay: string; walkingTime: string })[] {
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

// Fetch vacancy data for all carparks
export async function fetchCarparkVacancies(): Promise<CarparkVacancy[]> {
  try {
    const response = await fetch(
      'https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy&vehicleTypes=privateCar&lang=zh_TW'
    );
    if (!response.ok) {
      throw new Error('Failed to fetch carpark vacancies');
    }
    const data = await response.json();
    
    return (data.results || []).map((item: any) => {
      const privateCar = item.privateCar?.[0];
      return {
        park_Id: item.park_Id,
        vacancy: privateCar?.vacancy ?? 0,
        vacancyEV: privateCar?.vacancyEV,
        vacancyDIS: privateCar?.vacancyDIS,
        lastupdate: privateCar?.lastupdate,
      };
    });
  } catch (error) {
    console.error('Error fetching carpark vacancies:', error);
    return [];
  }
}

// Merge carparks with vacancy data
export function mergeCarparksWithVacancies(
  carparks: Carpark[],
  vacancies: CarparkVacancy[]
): CarparkWithVacancy[] {
  const vacancyMap = new Map(vacancies.map(v => [v.park_Id, v]));
  return carparks.map(carpark => ({
    ...carpark,
    vacancy: vacancyMap.get(carpark.park_Id),
  }));
}

// Hook to fetch and cache carparks with vacancies
export function useCarparks() {
  const [carparks, setCarparks] = useState<CarparkWithVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCarparks() {
      try {
        // Check cache first (valid for 5 minutes for vacancy data)
        const cached = localStorage.getItem('carparks_cache');
        const cachedTime = localStorage.getItem('carparks_cache_time');
        const now = Date.now();

        if (cached && cachedTime && (now - parseInt(cachedTime)) < 300000) {
          if (mounted) {
            setCarparks(JSON.parse(cached));
            setLoading(false);
          }
          return;
        }

        // Fetch both carpark info and vacancy data in parallel
        const [carparksData, vacanciesData] = await Promise.all([
          fetchCarparks(),
          fetchCarparkVacancies(),
        ]);
        
        const mergedData = mergeCarparksWithVacancies(carparksData, vacanciesData);
        
        if (mounted) {
          setCarparks(mergedData);
          localStorage.setItem('carparks_cache', JSON.stringify(mergedData));
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

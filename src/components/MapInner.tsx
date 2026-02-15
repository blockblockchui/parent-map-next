'use client';

import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  district: string;
}

interface MapInnerProps {
  places: Place[];
  selectedPlaceId?: string | null;
  onMarkerClick?: (place: Place) => void;
  userLocation?: { lat: number; lng: number } | null;
  locateAction?: { lat: number; lng: number; trigger: number } | null;
}

// Minimum zoom level to show pins
const MIN_ZOOM_FOR_PINS = 13;
// Radius in km to show pins when zoomed in
const SHOW_RADIUS_KM = 2;

// Fix Leaflet default icon
function fixLeafletIcon() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/marker-icon-2x.png",
    iconUrl: "/marker-icon.png",
    shadowUrl: "/marker-shadow.png",
  });
}

// Calculate distance between two points in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// Hook to track map center and zoom
function useMapViewport() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 22.32, lng: 114.17 });
  const [zoom, setZoom] = useState<number>(11);
  
  const map = useMap();
  
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    },
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  
  useEffect(() => {
    const c = map.getCenter();
    setCenter({ lat: c.lat, lng: c.lng });
    setZoom(map.getZoom());
  }, [map]);
  
  return { center, zoom };
}

// Filter places based on zoom level and distance from center
function useFilteredPlaces(
  places: Place[],
  center: { lat: number; lng: number },
  zoom: number,
  selectedPlaceId: string | null | undefined
): { filteredPlaces: Place[]; shouldShowZoomHint: boolean } {
  return useMemo(() => {
    // Always show selected place
    const selectedPlace = selectedPlaceId ? places.find(p => p.id === selectedPlaceId) : null;
    
    // If zoom is too low, only show selected place
    if (zoom < MIN_ZOOM_FOR_PINS) {
      return {
        filteredPlaces: selectedPlace ? [selectedPlace] : [],
        shouldShowZoomHint: !selectedPlace || places.length > 1
      };
    }
    
    // Zoom is sufficient, show places within radius + selected place
    const placesInRadius = places.filter(place => {
      // Always include selected place
      if (place.id === selectedPlaceId) return true;
      
      const distance = calculateDistance(center.lat, center.lng, place.lat, place.lng);
      return distance <= SHOW_RADIUS_KM;
    });
    
    return {
      filteredPlaces: placesInRadius,
      shouldShowZoomHint: false
    };
  }, [places, center, zoom, selectedPlaceId]);
}

// Zoom hint overlay component - uses useMap hook internally
function ZoomHintOverlay({ visible }: { visible: boolean }) {
  const map = useMap();
  
  if (!visible) return null;
  
  const handleZoomIn = () => {
    map.setZoom(MIN_ZOOM_FOR_PINS);
  };
  
  return (
    <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl px-6 py-4 mx-4 text-center pointer-events-auto">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-gray-800 font-medium mb-1">放大地圖以查看地點</p>
        <p className="text-gray-500 text-sm mb-3">縮放至更近以顯示附近親子地點</p>
        <button
          onClick={handleZoomIn}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          放大 +
        </button>
      </div>
    </div>
  );
}

// Pin count indicator
function PinCountIndicator({ 
  total, 
  visible, 
  zoom 
}: { 
  total: number; 
  visible: number; 
  zoom: number;
}) {
  return (
    <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs">
      <span className="font-medium text-gray-800">
        {zoom < MIN_ZOOM_FOR_PINS ? '📍' : `📍 ${visible} / ${total}`}
      </span>
      {zoom >= MIN_ZOOM_FOR_PINS && (
        <span className="text-gray-500 ml-1">(2km內)</span>
      )}
    </div>
  );
}

function MapBounds({ places }: { places: Place[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, places]);
  
  return null;
}

function MapResizer() {
  const map = useMap();
  
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
}

// Component to handle map view changes
function MapViewController({
  selectedPlaceId,
  places,
  locateAction,
}: {
  selectedPlaceId?: string | null;
  places: Place[];
  locateAction?: { lat: number; lng: number; trigger: number } | null;
}) {
  const map = useMap();
  const { zoom } = useMapViewport();
  const lastLocateTriggerRef = useRef<number>(0);

  // Handle locate action from parent (e.g., when clicking "取得定位")
  // This fires every time locateAction changes, using the position from the action itself
  useEffect(() => {
    if (locateAction && locateAction.trigger !== lastLocateTriggerRef.current) {
      lastLocateTriggerRef.current = locateAction.trigger;
      map.invalidateSize();
      map.setView([locateAction.lat, locateAction.lng], MIN_ZOOM_FOR_PINS);
    }
  }, [locateAction, map]);

  // Center on selected place - only if no recent locate action
  useEffect(() => {
    if (selectedPlaceId && (!locateAction || locateAction.trigger === lastLocateTriggerRef.current)) {
      const place = places.find(p => p.id === selectedPlaceId);
      if (place) {
        map.invalidateSize();
        const targetZoom = zoom < MIN_ZOOM_FOR_PINS ? MIN_ZOOM_FOR_PINS : zoom;
        map.setView([place.lat, place.lng], targetZoom);
      }
    }
  }, [selectedPlaceId, places, map, zoom, locateAction]);

  return null;
}

function MapRef({ 
  places, 
  selectedPlaceId, 
  onMarkerClick,
  userLocation,
  locateAction,
}: MapInnerProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Track viewport changes
  const { center, zoom } = useMapViewport();
  
  // Filter places based on zoom and distance
  const { filteredPlaces, shouldShowZoomHint } = useFilteredPlaces(
    places, 
    center, 
    zoom, 
    selectedPlaceId
  );

  const hongKongBounds = L.latLngBounds(
    [22.15, 113.75],
    [22.55, 114.45]
  );

  return (
    <>
      <MapResizer />
      <MapViewController
        selectedPlaceId={selectedPlaceId}
        places={places}
        locateAction={locateAction}
      />
      <TileLayer
        attribution='© 地圖資料由地政總署提供'
        url="https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/wgs84/{z}/{x}/{y}.png"
        minZoom={10}
        maxZoom={20}
      />
      <MapBounds places={places} />
      
      {/* Filtered place markers */}
      {filteredPlaces.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(place),
          }}
          opacity={place.id === selectedPlaceId ? 1 : 0.8}
        >
          <Popup>
            <div className="font-sans">
              <p className="font-bold text-sm">{place.name}</p>
              <p className="text-xs text-gray-600">{place.district}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={L.divIcon({
            className: "custom-div-icon",
            html: "<div style='background-color:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);'></div>",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>
            <div className="font-sans">
              <p className="font-bold text-sm">你的位置</p>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Zoom hint overlay */}
      <ZoomHintOverlay visible={shouldShowZoomHint} />
      
      {/* Pin count indicator */}
      <PinCountIndicator 
        total={places.length} 
        visible={filteredPlaces.length} 
        zoom={zoom}
      />
    </>
  );
}

export default function MapInner(props: MapInnerProps) {
  const hongKongBounds = L.latLngBounds(
    [22.15, 113.75],
    [22.55, 114.45]
  );
  
  return (
    <MapContainer
      center={[22.32, 114.17]}
      zoom={11}
      maxBounds={hongKongBounds}
      maxBoundsViscosity={0.8}
      className="w-full h-full min-h-[250px] rounded-lg z-0"
    >
      <MapRef {...props} />
    </MapContainer>
  );
}

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
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  onBoundsChange?: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

// Minimum zoom level to show pins
const MIN_ZOOM_FOR_PINS = 13;
// Radius in km to show pins when zoomed in (expanded to 4km for better coverage)
const SHOW_RADIUS_KM = 4;
// Maximum number of places to show on map
const MAX_PLACES_ON_MAP = 50;

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

// Individual place marker component
function PlaceMarker({
  place,
  isSelected,
  onClick,
}: {
  place: Place;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Marker
      position={[place.lat, place.lng]}
      eventHandlers={{
        click: onClick,
      }}
      opacity={isSelected ? 1 : 0.5}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup>
        <div className="font-sans">
          <p className="font-bold text-sm">
            {place.name}
          </p>
          <p className="text-xs text-gray-600">{place.district}</p>
        </div>
      </Popup>
    </Marker>
  );
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

// Filter places based on zoom level and distance from map center
function useFilteredPlaces(
  places: Place[],
  mapCenter: { lat: number; lng: number },
  userLocation: { lat: number; lng: number } | null | undefined,
  zoom: number,
  selectedPlaceId: string | null | undefined,
  useMapCenterAsRef: boolean
): { filteredPlaces: Place[]; shouldShowZoomHint: boolean } {
  return useMemo(() => {
    // Always use map center as reference point
    const referencePoint = mapCenter;
    
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
    // Sort by distance and limit to MAX_PLACES_ON_MAP
    const placesWithDistance = places
      .map(place => ({
        place,
        distance: calculateDistance(referencePoint.lat, referencePoint.lng, place.lat, place.lng),
        isSelected: place.id === selectedPlaceId
      }))
      .filter(({ place, isSelected }) => isSelected || calculateDistance(referencePoint.lat, referencePoint.lng, place.lat, place.lng) <= SHOW_RADIUS_KM)
      .sort((a, b) => {
        // Selected place always first
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
        // Then by distance
        return a.distance - b.distance;
      });
    
    // Take top MAX_PLACES_ON_MAP places
    const limitedPlaces = placesWithDistance
      .slice(0, MAX_PLACES_ON_MAP)
      .map(({ place }) => place);
    
    return {
      filteredPlaces: limitedPlaces,
      shouldShowZoomHint: false
    };
  }, [places, mapCenter, userLocation, zoom, selectedPlaceId, useMapCenterAsRef]);
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

function MapBounds({ places }: { places: Place[] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  
  useEffect(() => {
    // Only fit bounds on initial load, not on subsequent updates
    if (places.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
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
  locateAction,
}: {
  locateAction?: { lat: number; lng: number; trigger: number } | null;
}) {
  const map = useMap();
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

  return null;
}

function MapRef({ 
  places, 
  selectedPlaceId, 
  onMarkerClick,
  userLocation,
  locateAction,
  onCenterChange,
  onBoundsChange,
}: MapInnerProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Track viewport changes
  const { center, zoom } = useMapViewport();
  const map = useMap();
  
  // Notify parent of center changes
  useEffect(() => {
    onCenterChange?.(center);
  }, [center, onCenterChange]);

  // Track map bounds changes
  useEffect(() => {
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    };
    
    map.on('moveend', handleMoveEnd);
    // Initial bounds
    handleMoveEnd();
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);
  
  // Filter places based on zoom and distance - always use map center
  const { filteredPlaces, shouldShowZoomHint } = useFilteredPlaces(
    places, 
    center,
    userLocation,
    zoom, 
    selectedPlaceId,
    true // always use map center
  );

  const hongKongBounds = L.latLngBounds(
    [22.15, 113.75],
    [22.55, 114.45]
  );

  return (
    <>
      <MapResizer />
      <MapViewController
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
        <PlaceMarker
          key={place.id}
          place={place}
          isSelected={place.id === selectedPlaceId}
          onClick={() => onMarkerClick?.(place)}
        />
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

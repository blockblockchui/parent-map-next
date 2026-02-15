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

// Individual place marker component - uses default icon with styling
function PlaceMarker({
  place,
  isSelected,
  onClick,
}: {
  place: Place;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Force re-render when selection changes
  const key = `${place.id}-${isSelected ? 'sel' : 'unsel'}`;
  
  return (
    <Marker
      key={key}
      position={[place.lat, place.lng]}
      eventHandlers={{
        click: onClick,
      }}
      opacity={isSelected ? 1 : 0.7}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup>
        <div className="font-sans">
          <p className={`font-bold text-sm ${isSelected ? 'text-red-600' : ''}`}>
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

// Filter places based on zoom level and distance from reference point
function useFilteredPlaces(
  places: Place[],
  mapCenter: { lat: number; lng: number },
  userLocation: { lat: number; lng: number } | null | undefined,
  zoom: number,
  selectedPlaceId: string | null | undefined,
  useMapCenterAsRef: boolean
): { filteredPlaces: Place[]; shouldShowZoomHint: boolean; referencePoint: { lat: number; lng: number } } {
  return useMemo(() => {
    // Determine reference point (map center or user location)
    const referencePoint = (useMapCenterAsRef || !userLocation) 
      ? mapCenter 
      : userLocation;
    
    // Always show selected place
    const selectedPlace = selectedPlaceId ? places.find(p => p.id === selectedPlaceId) : null;
    
    // If zoom is too low, only show selected place
    if (zoom < MIN_ZOOM_FOR_PINS) {
      return {
        filteredPlaces: selectedPlace ? [selectedPlace] : [],
        shouldShowZoomHint: !selectedPlace || places.length > 1,
        referencePoint
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
      shouldShowZoomHint: false,
      referencePoint
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

// Pin count indicator
function PinCountIndicator({ 
  total, 
  visible, 
  zoom,
  isCenterBased
}: { 
  total: number; 
  visible: number; 
  zoom: number;
  isCenterBased?: boolean;
}) {
  return (
    <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs">
      <span className="font-medium text-gray-800">
        {zoom < MIN_ZOOM_FOR_PINS ? '📍' : `📍 ${visible}`}
      </span>
      {zoom >= MIN_ZOOM_FOR_PINS && (
        <span className="text-gray-500 ml-1">
          ({isCenterBased ? '地圖中心' : '定位'}4km內{visible >= MAX_PLACES_ON_MAP ? '·最多顯示50個' : ''})
        </span>
      )}
    </div>
  );
}

// Center crosshair component - shows the reference point for distance calculation
function CenterCrosshair() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none">
      <div className="relative">
        {/* Crosshair lines */}
        <div className="absolute w-8 h-0.5 bg-gray-800/80 -translate-x-1/2 left-1/2 top-1/2" />
        <div className="absolute h-8 w-0.5 bg-gray-800/80 -translate-y-1/2 left-1/2 top-1/2" />
        {/* Center dot */}
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

// Toggle for using map center vs user location as reference point
function ReferenceToggle({ 
  useMapCenter, 
  onToggle 
}: { 
  useMapCenter: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900"
      >
        <span className={`w-2 h-2 rounded-full ${useMapCenter ? 'bg-blue-500' : 'bg-green-500'}`} />
        {useMapCenter ? '📍 以地圖中心搜索' : '📍 以我的位置搜索'}
      </button>
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
}: MapInnerProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Track viewport changes
  const { center, zoom } = useMapViewport();
  
  // Notify parent of center changes
  useEffect(() => {
    onCenterChange?.(center);
  }, [center, onCenterChange]);
  
  // Toggle between using map center or user location as reference point
  const [useMapCenterAsRef, setUseMapCenterAsRef] = useState(true);
  
  // Filter places based on zoom and distance
  const { filteredPlaces, shouldShowZoomHint, referencePoint } = useFilteredPlaces(
    places, 
    center,
    userLocation,
    zoom, 
    selectedPlaceId,
    useMapCenterAsRef
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
      
      {/* Center crosshair - shows reference point for distance calculation */}
      <CenterCrosshair />
      
      {/* Reference point toggle */}
      {userLocation && (
        <ReferenceToggle 
          useMapCenter={useMapCenterAsRef} 
          onToggle={() => setUseMapCenterAsRef(!useMapCenterAsRef)}
        />
      )}
      
      {/* Pin count indicator */}
      <PinCountIndicator 
        total={places.length} 
        visible={filteredPlaces.length} 
        zoom={zoom}
        isCenterBased={useMapCenterAsRef}
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

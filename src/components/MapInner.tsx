"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
}

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
    
    // Initial invalidate after mount
    const timer = setTimeout(handleResize, 100);
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
}

function MapRef({ 
  places, 
  selectedPlaceId, 
  onMarkerClick,
  userLocation
}: MapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  useEffect(() => {
    if (mapRef.current && selectedPlaceId) {
      const place = places.find(p => p.id === selectedPlaceId);
      if (place) {
        // Invalidate size before setting view to ensure correct centering
        mapRef.current.invalidateSize();
        mapRef.current.setView([place.lat, place.lng], 15);
      }
    }
  }, [selectedPlaceId, places]);

  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.invalidateSize();
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [userLocation]);

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
      ref={mapRef}
    >
      <MapResizer />
      <TileLayer
        attribution='© 地圖資料由地政總署提供'
        url="https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/wgs84/{z}/{x}/{y}.png"
        minZoom={10}
        maxZoom={20}
      />
      <MapBounds places={places} />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(place),
          }}
        >
          <Popup>
            <div className="font-sans">
              <p className="font-bold text-sm">{place.name}</p>
              <p className="text-xs text-gray-600">{place.district}</p>
            </div>
          </Popup>
        </Marker>
      ))}
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
    </MapContainer>
  );
}

export default function MapInner(props: MapInnerProps) {
  return <MapRef {...props} />;
}

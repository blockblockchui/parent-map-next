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

function MapRef({ 
  places, 
  selectedPlaceId, 
  onMarkerClick 
}: MapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  useEffect(() => {
    if (mapRef.current && selectedPlaceId) {
      const place = places.find(p => p.id === selectedPlaceId);
      if (place) {
        mapRef.current.setView([place.lat, place.lng], 15);
      }
    }
  }, [selectedPlaceId, places]);

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
      className="w-full h-[400px] rounded-lg z-0"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
    </MapContainer>
  );
}

export default function MapInner(props: MapInnerProps) {
  return <MapRef {...props} />;
}

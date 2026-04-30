"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

interface MapShow {
  id: string;
  slug: string;
  title: string;
  date: string;
  venueName: string;
  city: string;
  countryCode: string;
  lat: number;
  lng: number;
}

const ICON = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#8b0000;box-shadow:0 0 0 2px #0a0a0a, 0 0 12px rgba(196,30,30,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function ConcertMap({ shows }: { shows: MapShow[] }) {
  // Default centre: Sofia (BG) — switch to bbox-from-shows if any present.
  let center: [number, number] = [42.7, 23.3];
  let zoom = 4;
  if (shows.length > 0) {
    const lats = shows.map((s) => s.lat);
    const lngs = shows.map((s) => s.lng);
    center = [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
    zoom = shows.length === 1 ? 11 : 5;
  }

  // Leaflet renders client-side; default tile sets do not work well in dark
  // mode without filtering. We dim them via CSS.
  useEffect(() => {
    // Marker shadow assets aren't critical for divIcon, so no-op.
  }, []);

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-card">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: 480, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="opacity-80 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.6)_brightness(0.95)]"
        />
        {shows.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={ICON}>
            <Popup>
              <div className="text-xs">
                <Link
                  href={`/concerts/${s.slug}`}
                  className="font-medium hover:underline"
                >
                  {s.title}
                </Link>
                <p className="text-[11px] mt-1">
                  {new Date(s.date).toLocaleDateString()} ·{" "}
                  {s.venueName}, {s.city} [{s.countryCode}]
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

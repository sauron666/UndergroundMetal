"use client";

import dynamic from "next/dynamic";

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

const ConcertMap = dynamic(
  () =>
    import("./concert-map").then((m) => m.ConcertMap),
  { ssr: false }
);

export function ConcertMapLoader({ shows }: { shows: MapShow[] }) {
  return <ConcertMap shows={shows} />;
}

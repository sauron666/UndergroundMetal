"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface VenueData {
  id?: string;
  name: string;
  city: string;
  region: string | null;
  countryCode: string;
  address: string | null;
  capacity: number | null;
  websiteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function VenueForm({ venue }: { venue: VenueData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    name: venue?.name ?? "",
    city: venue?.city ?? "",
    region: venue?.region ?? "",
    countryCode: venue?.countryCode ?? "",
    address: venue?.address ?? "",
    capacity: venue?.capacity?.toString() ?? "",
    websiteUrl: venue?.websiteUrl ?? "",
    latitude: venue?.latitude?.toString() ?? "",
    longitude: venue?.longitude?.toString() ?? "",
  });

  const submit = () => {
    startTransition(async () => {
      const url = venue?.id
        ? `/api/admin/venues/${venue.id}`
        : "/api/admin/venues";
      const res = await fetch(url, {
        method: venue?.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          region: data.region || null,
          countryCode: data.countryCode.toUpperCase(),
          address: data.address || null,
          capacity: data.capacity ? Number(data.capacity) : null,
          websiteUrl: data.websiteUrl || null,
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      const j = await res.json();
      toast.success("Saved");
      if (!venue?.id) router.push(`/admin/venues/${j.venue.slug}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Name">
        <Input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City">
          <Input
            value={data.city}
            onChange={(e) => setData({ ...data, city: e.target.value })}
          />
        </Field>
        <Field label="Region">
          <Input
            value={data.region}
            onChange={(e) => setData({ ...data, region: e.target.value })}
          />
        </Field>
        <Field label="Country (ISO 2)">
          <Input
            value={data.countryCode}
            maxLength={2}
            onChange={(e) =>
              setData({
                ...data,
                countryCode: e.target.value.toUpperCase(),
              })
            }
          />
        </Field>
      </div>
      <Field label="Address">
        <Input
          value={data.address}
          onChange={(e) => setData({ ...data, address: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Capacity">
          <Input
            type="number"
            value={data.capacity}
            onChange={(e) => setData({ ...data, capacity: e.target.value })}
          />
        </Field>
        <Field label="Latitude">
          <Input
            type="number"
            step="any"
            value={data.latitude}
            onChange={(e) => setData({ ...data, latitude: e.target.value })}
          />
        </Field>
        <Field label="Longitude">
          <Input
            type="number"
            step="any"
            value={data.longitude}
            onChange={(e) => setData({ ...data, longitude: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Website">
        <Input
          value={data.websiteUrl}
          onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
          placeholder="https://..."
        />
      </Field>
      <div className="flex justify-end pt-4 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : venue?.id ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

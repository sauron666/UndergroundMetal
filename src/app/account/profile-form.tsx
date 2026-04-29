"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/uploads/image-upload";
import { toast } from "sonner";

export function ProfileForm({
  user,
}: {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    bio: string | null;
    image: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    username: user.username ?? "",
    name: user.name ?? "",
    bio: user.bio ?? "",
    image: user.image,
  });

  const submit = () => {
    startTransition(async () => {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: data.username || null,
          name: data.name || null,
          bio: data.bio || null,
          image: data.image,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <ImageUpload
        scope="user"
        ownerId={user.id}
        value={data.image}
        onChange={(url) => setData({ ...data, image: url })}
        label="Avatar"
        aspect="square"
      />
      <Field label="Username">
        <Input
          value={data.username}
          onChange={(e) =>
            setData({
              ...data,
              username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""),
            })
          }
          maxLength={24}
          minLength={3}
        />
      </Field>
      <Field label="Display name">
        <Input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          maxLength={100}
        />
      </Field>
      <Field label="Bio">
        <Textarea
          rows={4}
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          maxLength={500}
          placeholder="A line or two about yourself."
        />
      </Field>
      <div className="flex justify-end">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : "Save"}
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

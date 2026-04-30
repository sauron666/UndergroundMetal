"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

/**
 * Tiny audio preview for short MP3/OGG/WAV samples — not a full player,
 * intended for release-page sneak-peek clips uploaded by editors.
 *
 * For full streaming we use the Bandcamp / Spotify embed components instead.
 */
export function AudioPreview({
  src,
  title,
}: {
  src: string;
  title?: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => null);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 border border-border rounded-sm px-3 py-1.5 hover:border-primary/60">
      <button
        type="button"
        onClick={toggle}
        className="text-primary hover:text-blood-glow"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        {title ?? "preview"}
      </span>
      <audio
        ref={ref}
        src={src}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}

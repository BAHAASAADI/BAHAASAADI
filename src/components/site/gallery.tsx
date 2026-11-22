"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Gallery({ photos, alt, emptyLabel, photoLabel }: { photos: string[]; alt: string; emptyLabel: string; photoLabel: string }) {
  const [index, setIndex] = useState(0);

  if (!photos.length) {
    return (
      <div className="surface product-stage animate-rise flex aspect-square items-center justify-center rounded-[var(--radius-card)] p-6 text-center">
        <div>
          <p className="text-sheen font-display text-3xl font-semibold tracking-tight">{alt}</p>
          <p className="mt-2 text-sm text-muted">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="animate-rise">
      <div className="surface product-stage relative aspect-square overflow-hidden rounded-[var(--radius-card)]">
        {photos.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${alt} — ${photoLabel.replace("{n}", String(i + 1))}`}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={`object-cover transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md transition-colors duration-300 hover:border-white"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md transition-colors duration-300 hover:border-white"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
            <span className="absolute bottom-3 end-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-grey backdrop-blur-md">
              {index + 1} / {photos.length}
            </span>
          </>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={photoLabel.replace("{n}", String(i + 1))}
              aria-current={i === index}
              className={`relative aspect-square overflow-hidden rounded-lg border transition-colors ${i === index ? "border-white shadow-[0_0_18px_-4px_rgb(var(--glow)/calc(0.5*var(--glow-k)))]" : "border-white/10 hover:border-white/40"}`}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

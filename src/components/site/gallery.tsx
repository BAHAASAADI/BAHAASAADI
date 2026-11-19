"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Gallery({ photos, alt, emptyLabel, photoLabel }: { photos: string[]; alt: string; emptyLabel: string; photoLabel: string }) {
  const [index, setIndex] = useState(0);

  if (!photos.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[var(--radius-card)] border border-line text-center">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{alt}</p>
          <p className="mt-2 text-sm text-muted">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-line bg-black">
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
              className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/70 hover:border-white"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-black/70 hover:border-white"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
            <span className="absolute bottom-3 end-3 rounded-full bg-black/70 px-3 py-1 text-xs text-grey">
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
              className={`relative aspect-square overflow-hidden rounded-lg border transition-colors ${i === index ? "border-white" : "border-line hover:border-grey"}`}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

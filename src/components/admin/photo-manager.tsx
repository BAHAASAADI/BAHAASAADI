"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { uploadProductPhotos } from "@/components/admin/photos";
import { Notice, Spinner } from "@/components/ui";
import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_PHOTOS_BUCKET, publicPhotoUrl } from "@/lib/env";
import type { ProductPhoto } from "@/lib/types";

/** Add, reorder, replace and delete a phone's photographs. */
export function PhotoManager({ productId, photos }: { productId: string; photos: ProductPhoto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const add = (files: FileList | null) =>
    run("Uploading…", async () => {
      if (!files?.length) return;
      const blobs = [];
      for (const f of Array.from(files)) blobs.push(await compressImage(f, 2000, 0.88));
      const start = photos.length ? Math.max(...photos.map((p) => p.sort_order)) + 1 : 0;
      const res = await uploadProductPhotos(productId, blobs, start);
      if (res.failed) throw new Error(`${res.failed} photo(s) could not be uploaded.`);
    });

  const remove = (photo: ProductPhoto) =>
    run("Deleting…", async () => {
      if (!window.confirm("Delete this photo?")) return;
      const { error: e1 } = await supabase.from("product_photos").delete().eq("id", photo.id);
      if (e1) throw new Error(e1.message);
      await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([photo.path]);
    });

  const move = (index: number, delta: number) =>
    run("Saving order…", async () => {
      const ordered = [...photos];
      const target = index + delta;
      if (target < 0 || target >= ordered.length) return;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      for (const [i, p] of ordered.entries()) {
        const { error: e } = await supabase.from("product_photos").update({ sort_order: i }).eq("id", p.id);
        if (e) throw new Error(e.message);
      }
    });

  const replace = (photo: ProductPhoto, files: FileList | null) =>
    run("Replacing…", async () => {
      const file = files?.[0];
      if (!file) return;
      const blob = await compressImage(file, 2000, 0.88);
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: up } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (up) throw new Error(up.message);
      const { error: e } = await supabase.from("product_photos").update({ path }).eq("id", photo.id);
      if (e) {
        await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([path]);
        throw new Error(e.message);
      }
      await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([photo.path]);
    });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((p, i) => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-line">
            <div className="relative aspect-square bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicPhotoUrl(p.path)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 ? <span className="absolute start-2 top-2 rounded-full bg-white px-2 text-[0.65rem] text-black">Cover</span> : null}
            </div>
            <div className="flex items-center justify-between border-t border-line px-1 py-1">
              <button type="button" disabled={!!busy || i === 0} onClick={() => move(i, -1)} className="rounded-lg p-2 text-grey hover:text-white disabled:opacity-30" aria-label="Move left">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <label className="cursor-pointer rounded-lg p-2 text-grey hover:text-white" aria-label="Replace photo" title="Replace">
                <RefreshCw className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" disabled={!!busy} onChange={(e) => { void replace(p, e.target.files); e.target.value = ""; }} />
              </label>
              <button type="button" disabled={!!busy} onClick={() => remove(p)} className="rounded-lg p-2 text-grey hover:text-white disabled:opacity-30" aria-label="Delete photo">
                <Trash2 className="h-4 w-4" />
              </button>
              <button type="button" disabled={!!busy || i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-2 text-grey hover:text-white disabled:opacity-30" aria-label="Move right">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-grey hover:border-white hover:text-white">
          {busy ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
          {busy ?? "Add photos"}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={!!busy} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} data-testid="photo-input" />
        </label>
      </div>
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
    </div>
  );
}

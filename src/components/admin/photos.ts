"use client";

import { createClient } from "@/lib/supabase/client";
import { PRODUCT_PHOTOS_BUCKET } from "@/lib/env";

/** Uploads compressed photos for a phone and registers them (staff permissions apply). */
export async function uploadProductPhotos(productId: string, blobs: Blob[], startOrder = 0): Promise<{ uploaded: number; failed: number }> {
  const supabase = createClient();
  let uploaded = 0;
  let failed = 0;
  for (const [i, blob] of blobs.entries()) {
    const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) {
      failed++;
      continue;
    }
    const { error: rowError } = await supabase.from("product_photos").insert({ product_id: productId, path, sort_order: startOrder + i });
    if (rowError) {
      await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([path]);
      failed++;
    } else {
      uploaded++;
    }
  }
  return { uploaded, failed };
}

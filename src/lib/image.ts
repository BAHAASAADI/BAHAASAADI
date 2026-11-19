"use client";

/**
 * Resizes and re-encodes a photo in the browser before upload: phone photos are
 * often 3–8 MB (and HEIC on iPhone). The result is a JPEG of at most `maxSize`
 * pixels on its longest side, with the camera orientation applied.
 */
export async function compressImage(file: File, maxSize = 1800, quality = 0.85): Promise<Blob> {
  const source = await loadBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source.image, 0, 0, width, height);
  source.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))), "image/jpeg", quality);
  });
}

async function loadBitmap(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // fall through to <img> decoding (e.g. HEIC on Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function randomFileName(index: number): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${index + 1}-${rand}.jpg`;
}

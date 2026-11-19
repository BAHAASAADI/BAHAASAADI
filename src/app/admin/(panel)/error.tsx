"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="rounded-2xl border border-line p-8">
      <h1 className="text-xl font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-grey">{error.message || "Unexpected error."}</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm text-black">
        Try again
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TEXT: Record<string, { title: string; retry: string }> = {
  en: { title: "Something went wrong. Please try again.", retry: "Try again" },
  fr: { title: "Une erreur est survenue. Veuillez réessayer.", retry: "Réessayer" },
  ar: { title: "حدث خطأ ما. يرجى المحاولة مرة أخرى.", retry: "حاول مرة أخرى" },
  pl: { title: "Coś poszło nie tak. Spróbuj ponownie.", retry: "Spróbuj ponownie" },
};

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = usePathname().split("/")[1];
  const text = TEXT[locale] ?? TEXT.en;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="stage light-top flex min-h-[50vh] flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">{text.title}</h1>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center btn-glow rounded-full border border-white bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-100"
      >
        {text.retry}
      </button>
    </div>
  );
}

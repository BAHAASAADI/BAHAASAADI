import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-grey">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-grey">This record does not exist or has been deleted.</p>
      <Link href="/admin" className="mt-8 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm text-black">
        Back to the dashboard
      </Link>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container-page py-10 sm:py-16" aria-busy="true" aria-live="polite">
      <div className="skeleton h-4 w-40 rounded-full" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="skeleton aspect-square rounded-[var(--radius-card)]" />
        <div>
          <div className="skeleton h-6 w-40 rounded-full" />
          <div className="skeleton mt-6 h-12 w-3/4 rounded-2xl" />
          <div className="skeleton mt-4 h-5 w-1/2 rounded-full" />
          <div className="skeleton mt-10 h-10 w-1/3 rounded-2xl" />
          <div className="skeleton mt-8 h-13 w-full rounded-full" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="skeleton h-13 rounded-full" />
            <div className="skeleton h-13 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

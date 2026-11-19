export default function Loading() {
  return (
    <div className="container-page py-14 sm:py-20" aria-busy="true" aria-live="polite">
      <div className="skeleton h-4 w-32 rounded-full" />
      <div className="skeleton mt-6 h-12 w-2/3 max-w-xl rounded-2xl" />
      <div className="skeleton mt-4 h-5 w-1/2 max-w-md rounded-full" />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-line">
            <div className="skeleton aspect-square" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-5 w-2/3 rounded-full" />
              <div className="skeleton h-4 w-1/2 rounded-full" />
              <div className="skeleton h-6 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

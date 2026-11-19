export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skeleton h-8 w-56 rounded-xl" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full rounded-full" />
      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

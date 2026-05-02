export default function GlobalLoading() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
      <div className="mt-4 w-full max-w-6xl px-4 md:px-8">
        <div className="glass-card-strong rounded-full p-1">
          <div className="h-1.5 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500" />
        </div>
        <p className="mt-2 text-center text-xs font-medium text-slate-500">
          Loading latest view...
        </p>
      </div>
    </div>
  );
}

export default function RequestDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-4 animate-pulse">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15 sm:p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-20 rounded-full bg-surface-container" />
            <div className="h-4 w-32 rounded bg-surface-container" />
          </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <div className="h-10 w-40 rounded-lg bg-surface-container-high" />
            <div className="h-4 w-56 rounded bg-surface-container" />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-surface-container" />
                <div className="h-4 w-36 rounded bg-surface-container-high" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15">
        <div className="space-y-4">
          <div className="h-5 w-36 rounded bg-surface-container-high" />
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 flex-1 rounded-xl bg-surface-container" />
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-12 flex-1 rounded-xl bg-surface-container-high" />
            <div className="h-12 w-28 rounded-xl bg-surface-container" />
          </div>
        </div>
      </div>
    </div>
  );
}

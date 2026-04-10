export default function PublicPaymentLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12 animate-pulse">
      <div className="mb-6 flex flex-col items-center gap-1">
        <div className="h-8 w-24 rounded-lg bg-surface-container-high" />
        <div className="h-4 w-32 rounded bg-surface-container" />
      </div>

      <div className="space-y-6">
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
              {[1, 2, 3].map((i) => (
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
            <div className="h-5 w-44 rounded bg-surface-container-high" />
            <div className="space-y-3">
              <div className="h-12 w-full rounded-2xl bg-surface-container" />
              <div className="h-12 w-full rounded-2xl bg-surface-container" />
            </div>
            <div className="h-11 w-full rounded-xl bg-surface-container-high" />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8 text-center">
        <div className="mx-auto h-3 w-52 rounded bg-surface-container" />
      </div>
    </div>
  );
}

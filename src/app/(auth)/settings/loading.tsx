export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-28 rounded-lg bg-surface-container-high" />
        <div className="mt-2 h-4 w-64 rounded bg-surface-container" />
      </div>

      <div>
        <div className="mb-4 h-6 w-32 rounded bg-surface-container-high" />
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-outline-variant/15">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-surface-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-surface-container-high" />
              <div className="h-3 w-52 rounded bg-surface-container" />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-12 rounded bg-surface-container" />
              <div className="h-12 w-full rounded-2xl bg-surface-container" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-48 rounded bg-surface-container" />
              <div className="h-12 w-full rounded-2xl bg-surface-container" />
            </div>
            <div className="h-11 w-full rounded-xl bg-surface-container-high" />
          </div>
        </div>
      </div>
    </div>
  );
}

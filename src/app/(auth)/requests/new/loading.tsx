export default function NewRequestLoading() {
  return (
    <div className="flex flex-col items-center gap-8 pt-4 sm:gap-12 sm:pt-8 animate-pulse">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-8 w-48 rounded-lg bg-surface-container-high" />
        <div className="mx-auto h-5 w-72 rounded bg-surface-container" />
      </div>

      <div className="w-full max-w-xl space-y-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-10">
          <div className="h-3 w-32 rounded bg-surface-container" />
          <div className="mt-4 h-14 w-full rounded-lg bg-surface-container-high" />
        </div>

        <div className="space-y-6 rounded-[2rem] bg-surface-container-low p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded bg-surface-container" />
            <div className="flex gap-2">
              <div className="h-10 w-20 rounded-full bg-surface-container-high" />
              <div className="h-10 w-20 rounded-full bg-surface-container" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-surface-container" />
            <div className="h-12 w-full rounded-2xl bg-white" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-surface-container" />
            <div className="h-24 w-full rounded-2xl bg-white" />
          </div>
        </div>

        <div className="h-16 w-full rounded-full bg-surface-container-high" />
      </div>
    </div>
  );
}

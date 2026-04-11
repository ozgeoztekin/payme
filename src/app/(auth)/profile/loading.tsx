export default function ProfileLoading() {
  return (
    <div className="max-w-lg mx-auto space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-slate-200 rounded mb-6" />
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-6">
          <div>
            <div className="h-4 w-16 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-48 bg-slate-100 rounded" />
          </div>
          <div>
            <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-40 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-6">
        <div className="h-10 w-full bg-slate-100 rounded" />
        <div className="h-10 w-full bg-slate-200 rounded" />
      </div>
    </div>
  );
}

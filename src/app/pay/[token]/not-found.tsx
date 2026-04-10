import Link from 'next/link';

export default function PaymentNotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-bold text-slate-900">
        Not Found
      </h1>
      <p className="mt-3 text-slate-500">
        This payment request doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

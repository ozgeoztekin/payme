'use client';

import { useEffect, useState } from 'react';

export function SuccessBanner({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.history.replaceState(null, '', '/profile');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-6" role="status">
      <div className="flex items-center gap-2 text-emerald-700">
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </section>
  );
}

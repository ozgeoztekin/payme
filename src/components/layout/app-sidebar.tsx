'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/requests/new', label: 'New Request', icon: 'plus' },
  { href: '/wallet', label: 'Wallet', icon: 'wallet' },
] as const;

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className ?? 'w-5 h-5';
  switch (icon) {
    case 'grid':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'plus':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case 'wallet':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    default:
      return null;
  }
}

function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.15" />
        <path d="M12 7a2 2 0 0 0-2 2v2H8a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2a1 1 0 0 0 0-2h-2V9a2 2 0 0 0-2-2z" />
      </svg>
      <span className="font-bold text-xl tracking-tight font-[family-name:var(--font-manrope)]">
        PayMe
      </span>
    </Link>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white/95 backdrop-blur-sm px-4 py-3 border-b border-slate-100">
      <AppLogo />
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-100">
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-indigo-600' : 'text-slate-400 active:text-slate-600',
              )}
            >
              <NavIcon icon={item.icon} className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-white">
      <div className="p-6">
        <AppLogo />
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

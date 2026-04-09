'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth-actions';

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-lg mb-6">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h1 className="text-[1.75rem] font-bold text-foreground tracking-tight leading-tight font-[family-name:var(--font-manrope)]">
              Create Account
            </h1>
            <p className="mt-3 text-on-surface-variant text-base">
              Join PayMe and start sending payments in seconds.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm">
            <form action={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[0.75rem] font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full h-14 px-4 bg-surface-container-low border-none rounded-xl text-foreground focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all duration-200 placeholder:text-outline"
                />
              </div>

              <div>
                <label className="block text-[0.75rem] font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full h-14 px-4 pr-12 bg-surface-container-low border-none rounded-xl text-foreground focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all duration-200 placeholder:text-outline"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[0.75rem] font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    className="w-full h-14 px-4 pr-12 bg-surface-container-low border-none rounded-xl text-foreground focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all duration-200 placeholder:text-outline"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-[52px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-full shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <>
                      Create Account
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-dashed border-surface-container">
              <p className="text-center text-on-surface-variant text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 text-center">
        <p className="text-[0.75rem] text-outline font-medium tracking-wide uppercase">
          &copy; {new Date().getFullYear()} PayMe Financial. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

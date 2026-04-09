'use client';

import { useEffect, useState } from 'react';
import type {
  PaymentRequestListResponse,
  RequestListEffectiveStatus,
  RequestListTab,
} from '@/lib/types/api';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export type RequestStatusFilterChoice = 'all' | RequestListEffectiveStatus;

export function useRequests(options: {
  tab: RequestListTab;
  status: RequestStatusFilterChoice;
  search: string;
  page: number;
}) {
  const debouncedSearch = useDebouncedValue(options.search.trim(), 350);
  const [data, setData] = useState<PaymentRequestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('tab', options.tab);
      if (options.status !== 'all') {
        params.set('status', options.status);
      }
      if (debouncedSearch.length > 0) {
        params.set('search', debouncedSearch);
      }
      params.set('page', String(options.page));

      try {
        const res = await fetch(`/api/requests?${params.toString()}`);
        if (res.status === 401) {
          if (!cancelled) {
            setError('You need to sign in again.');
            setData(null);
          }
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            setError(body?.error ?? 'Could not load requests.');
            setData(null);
          }
          return;
        }
        const json = (await res.json()) as PaymentRequestListResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load requests.');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [options.tab, options.status, debouncedSearch, options.page]);

  return {
    requests: data?.requests ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? options.page,
    limit: data?.limit ?? 0,
    pending_action_count: data?.pending_action_count,
    loading,
    error,
    debouncedSearch,
  };
}

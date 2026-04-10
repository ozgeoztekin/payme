'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BankAccountRow } from '@/lib/types/database';

export function useBank() {
  const [bankAccount, setBankAccount] = useState<BankAccountRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bank');
      if (res.status === 401) {
        setError('You need to sign in again.');
        setBankAccount(null);
        return;
      }
      if (!res.ok) {
        setError('Could not load bank account.');
        setBankAccount(null);
        return;
      }
      const json = (await res.json()) as { bankAccount: BankAccountRow | null };
      setBankAccount(json.bankAccount);
    } catch {
      setError('Could not load bank account.');
      setBankAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { bankAccount, loading, error, refetch: load, setBankAccount };
}

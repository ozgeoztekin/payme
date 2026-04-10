'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WalletRow, BankAccountRow } from '@/lib/types/database';

interface WalletData {
  wallet: WalletRow | null;
  bankAccount: BankAccountRow | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccountRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoaded.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/wallet');
      if (res.status === 401) {
        setError('You need to sign in again.');
        return;
      }
      if (!res.ok) {
        setError('Could not load wallet data.');
        return;
      }
      const json = (await res.json()) as WalletData;
      setWallet(json.wallet);
      setBankAccount(json.bankAccount);
    } catch {
      setError('Could not load wallet data.');
    } finally {
      setLoading(false);
      hasLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { wallet, bankAccount, loading, error, refetch: load };
}

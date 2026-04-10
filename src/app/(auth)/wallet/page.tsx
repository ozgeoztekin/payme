'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/use-wallet';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { TopUpForm } from '@/components/wallet/top-up-form';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/ui/error-message';

function BankIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M12 3l9 7H3l9-7z" />
      <path d="M5 10v8" />
      <path d="M9.5 10v8" />
      <path d="M14.5 10v8" />
      <path d="M19 10v8" />
    </svg>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { wallet, bankAccount, loading, error, refetch } = useWallet();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-slate-500">Manage your balance and top up from your bank.</p>
        </div>
        <div className="mt-8 flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-slate-500">Manage your balance and top up from your bank.</p>
        </div>
        <div className="mt-8">
          <ErrorMessage message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Wallet</h1>
        <p className="mt-1 text-slate-500">Manage your balance and top up from your bank.</p>
      </div>

      {wallet && (
        <section>
          <WalletBalance wallet={wallet} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Up</h2>
        {bankAccount ? (
          <TopUpForm
            bankAccount={bankAccount}
            onSuccess={() => {
              refetch();
            }}
          />
        ) : (
          <EmptyState
            icon={<BankIcon />}
            title="No Bank Account Connected"
            description="Connect a bank account in Settings to top up your wallet."
            action={{
              label: 'Go to Settings',
              onClick: () => router.push('/settings'),
            }}
          />
        )}
      </section>

      {bankAccount && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Connected Bank</h2>
          <BankAccountCard
            bankAccount={bankAccount}
            onDisconnected={() => {
              refetch();
            }}
          />
        </section>
      )}
    </div>
  );
}

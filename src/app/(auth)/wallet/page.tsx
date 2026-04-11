'use client';

import { useWallet } from '@/hooks/use-wallet';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { TopUpForm } from '@/components/wallet/top-up-form';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { BankConnectFlow } from '@/components/bank/bank-connect-flow';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/ui/error-message';

export default function WalletPage() {
  const { wallet, bankAccount, loading, error, refetch } = useWallet();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Wallet</h1>
          <p className="mt-1 text-slate-500">Manage your balance, bank account, and top-ups.</p>
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
          <p className="mt-1 text-slate-500">Manage your balance, bank account, and top-ups.</p>
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
        <p className="mt-1 text-slate-500">Manage your balance, bank account, and top-ups.</p>
      </div>

      {wallet && (
        <section>
          <WalletBalance wallet={wallet} />
        </section>
      )}

      {bankAccount ? (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Up</h2>
            <TopUpForm
              bankAccount={bankAccount}
              onSuccess={() => {
                refetch();
              }}
            />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Connected Bank</h2>
            <div className="space-y-6">
              <BankAccountCard
                bankAccount={bankAccount}
                onDisconnected={() => {
                  refetch();
                }}
              />
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Replace with a different bank
                </p>
                <BankConnectFlow onConnected={() => refetch()} />
              </div>
            </div>
          </section>
        </>
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Bank Account</h2>
          <BankConnectFlow onConnected={() => refetch()} />
        </section>
      )}
    </div>
  );
}

'use client';

import { useBank } from '@/hooks/use-bank';
import { BankConnectFlow } from '@/components/bank/bank-connect-flow';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/ui/error-message';

export default function SettingsPage() {
  const { bankAccount, loading, error, refetch, setBankAccount } = useBank();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your connected bank account.</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Bank Account</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : bankAccount ? (
          <div className="space-y-6">
            <BankAccountCard
              bankAccount={bankAccount}
              onDisconnected={() => {
                setBankAccount(null);
              }}
            />
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Replace with a different bank
              </p>
              <BankConnectFlow
                onConnected={(bank) => {
                  setBankAccount(bank);
                }}
              />
            </div>
          </div>
        ) : (
          <BankConnectFlow
            onConnected={(bank) => {
              setBankAccount(bank);
              refetch();
            }}
          />
        )}
      </section>
    </div>
  );
}

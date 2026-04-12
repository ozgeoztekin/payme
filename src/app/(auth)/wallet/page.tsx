'use client';

import { useWallet } from '@/hooks/use-wallet';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { TopUpForm } from '@/components/wallet/top-up-form';
import { BankAccountCard } from '@/components/bank/bank-account-card';
import { BankConnectFlow } from '@/components/bank/bank-connect-flow';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { PageContainer, PageHeader, SectionTitle } from '@/components/layout/page-layout';

export default function WalletPage() {
  const { wallet, bankAccount, loading, error, refetch } = useWallet();

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Wallet" subtitle="Manage your balance, bank account, and top-ups." />
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Wallet" subtitle="Manage your balance, bank account, and top-ups." />
        <ErrorMessage message={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Wallet" subtitle="Manage your balance, bank account, and top-ups." />

      {wallet && (
        <section>
          <WalletBalance wallet={wallet} />
        </section>
      )}

      {bankAccount ? (
        <>
          <section className="space-y-4">
            <SectionTitle>Top Up</SectionTitle>
            <TopUpForm
              bankAccount={bankAccount}
              onSuccess={() => {
                refetch();
              }}
            />
          </section>

          <section className="space-y-4">
            <SectionTitle>Connected Bank</SectionTitle>
            <div className="space-y-6">
              <BankAccountCard
                bankAccount={bankAccount}
                onDisconnected={() => {
                  refetch();
                }}
              />
              <div>
                <p className="mb-3 text-sm font-medium text-on-surface-variant">
                  Replace with a different bank
                </p>
                <BankConnectFlow onConnected={() => refetch()} />
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <SectionTitle>Bank Account</SectionTitle>
          <BankConnectFlow onConnected={() => refetch()} />
        </section>
      )}
    </PageContainer>
  );
}

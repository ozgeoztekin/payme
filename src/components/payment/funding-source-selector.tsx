'use client';

import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/utils';
import type { FundingSourceType } from '@/lib/types/domain';

interface FundingSource {
  type: FundingSourceType;
  label: string;
  detail: string;
  balanceCents: number;
  disabled: boolean;
  disabledReason?: string;
}

interface FundingSourceSelectorProps {
  walletBalanceCents: number;
  bankAccount: {
    id: string;
    bankName: string;
    accountNumberMasked: string;
    balanceCents: number;
  } | null;
  amountCents: number;
  selected: FundingSourceType | null;
  onSelect: (source: FundingSourceType) => void;
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="6" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 21h18M3 10h18M12 3l9 7H3l9-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 10v11M9 10v11M15 10v11M19 10v11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FundingSourceSelector({
  walletBalanceCents,
  bankAccount,
  amountCents,
  selected,
  onSelect,
}: FundingSourceSelectorProps) {
  const sources: FundingSource[] = [
    {
      type: 'wallet',
      label: 'Wallet',
      detail: `Balance: ${formatCents(walletBalanceCents)}`,
      balanceCents: walletBalanceCents,
      disabled: walletBalanceCents < amountCents,
      disabledReason: walletBalanceCents < amountCents ? 'Insufficient wallet balance' : undefined,
    },
  ];

  if (bankAccount) {
    sources.push({
      type: 'bank_account',
      label: bankAccount.bankName,
      detail: `${bankAccount.accountNumberMasked} \u2022 ${formatCents(bankAccount.balanceCents)}`,
      balanceCents: bankAccount.balanceCents,
      disabled: bankAccount.balanceCents < amountCents,
      disabledReason:
        bankAccount.balanceCents < amountCents ? 'Insufficient bank balance' : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700">Choose funding source</h3>
      {sources.map((source) => {
        const isSelected = selected === source.type;
        return (
          <button
            key={source.type}
            type="button"
            disabled={source.disabled}
            onClick={() => onSelect(source.type)}
            className={cn(
              'flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors',
              isSelected
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              source.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {source.type === 'wallet' ? (
                <WalletIcon className="h-5 w-5" />
              ) : (
                <BankIcon className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', isSelected ? 'text-indigo-900' : 'text-slate-900')}>
                {source.label}
              </p>
              <p className="text-sm text-slate-500">{source.detail}</p>
              {source.disabled && source.disabledReason && (
                <p className="mt-0.5 text-xs text-rose-500">{source.disabledReason}</p>
              )}
            </div>
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300',
              )}
            >
              {isSelected && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
      {!bankAccount && (
        <p className="text-center text-sm text-slate-500">
          Connect a bank account in{' '}
          <a href="/settings" className="font-medium text-indigo-600 hover:underline">
            Settings
          </a>{' '}
          for more options.
        </p>
      )}
    </div>
  );
}

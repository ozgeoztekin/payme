import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/client';
import type { PaymentRequestViewRow } from '@/lib/types/database';
import { RequestDetail } from '@/components/requests/request-detail';
import { GuestPaymentFlow } from '@/components/payment/guest-payment-flow';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PublicPaymentPage({ params }: Props) {
  const { token } = await params;

  const { data: request } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!request) {
    notFound();
  }

  const typedRequest = request as PaymentRequestViewRow;

  const { data: requester } = await supabaseAdmin
    .from('users')
    .select('display_name')
    .eq('id', typedRequest.requester_id)
    .single();

  const requesterName = requester?.display_name ?? 'Unknown';
  const isPending = typedRequest.effective_status === 'pending';

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900 sm:text-3xl">
          PayMe
        </h1>
        <p className="mt-1 text-sm text-slate-500">Payment Request</p>
      </div>

      <div className="space-y-6">
        <RequestDetail
          request={typedRequest}
          requesterName={requesterName}
          readOnly={!isPending}
        />

        {isPending && (
          <GuestPaymentFlow
            shareToken={typedRequest.share_token}
            amountCents={typedRequest.amount_cents}
            requesterName={requesterName}
          />
        )}
      </div>

      <footer className="mt-auto pt-8 text-center">
        <p className="text-xs text-slate-400">
          Powered by PayMe &middot; Secure peer-to-peer payments
        </p>
      </footer>
    </div>
  );
}

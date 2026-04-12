import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import type { PaymentRequestViewRow, WalletRow, BankAccountRow } from '@/lib/types/database';
import { PageContainer } from '@/components/layout/page-layout';
import { RequestPaymentFlow } from './request-payment-flow';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: request } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('id', id)
    .single();

  if (!request) {
    notFound();
  }

  const typedRequest = request as PaymentRequestViewRow;

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, display_name, email, phone, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    notFound();
  }

  const isRequester = typedRequest.requester_id === user.id;

  const isRecipientByEmail =
    typedRequest.recipient_type === 'email' &&
    profile.email &&
    profile.email.toLowerCase() === typedRequest.recipient_value.toLowerCase();

  const isRecipientByPhone =
    typedRequest.recipient_type === 'phone' &&
    profile.phone &&
    profile.phone === typedRequest.recipient_value;

  const isRecipient = isRecipientByEmail || isRecipientByPhone;

  if (!isRequester && !isRecipient) {
    notFound();
  }

  const { data: requesterProfile } = await supabaseAdmin
    .from('users')
    .select('display_name')
    .eq('id', typedRequest.requester_id)
    .single();

  let wallet: WalletRow | null = null;
  let bankAccount: BankAccountRow | null = null;

  if (isRecipient && typedRequest.effective_status === 'pending') {
    const { data: w } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();
    wallet = w as WalletRow | null;

    const { data: b } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_guest', false)
      .single();
    bankAccount = b as BankAccountRow | null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const shareUrl = `${appUrl}/pay/${typedRequest.share_token}`;

  return (
    <PageContainer>
      <RequestPaymentFlow
        request={typedRequest}
        requesterName={requesterProfile?.display_name ?? 'Unknown'}
        isRequester={isRequester}
        isRecipient={!!isRecipient}
        wallet={wallet}
        bankAccount={bankAccount}
        shareUrl={shareUrl}
      />
    </PageContainer>
  );
}

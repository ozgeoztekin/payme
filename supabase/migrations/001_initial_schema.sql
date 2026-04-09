CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_unique UNIQUE (phone)
);

CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_phone ON public.users (phone);

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallets_user_id ON public.wallets (user_id);

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number_masked text NOT NULL,
  balance_cents bigint NOT NULL CHECK (balance_cents >= 0),
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts (user_id);

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users (id),
  recipient_type text NOT NULL CHECK (recipient_type IN ('email', 'phone')),
  recipient_value text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000),
  note text CHECK (note IS NULL OR char_length(note) <= 250),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'declined', 'canceled', 'expired')
  ),
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  resolved_at timestamptz
);

CREATE INDEX idx_payment_requests_requester_id ON public.payment_requests (requester_id);
CREATE INDEX idx_payment_requests_recipient ON public.payment_requests (recipient_type, recipient_value);
CREATE INDEX idx_payment_requests_share_token ON public.payment_requests (share_token);
CREATE INDEX idx_payment_requests_status ON public.payment_requests (status);
CREATE INDEX idx_payment_requests_created_at ON public.payment_requests (created_at DESC);

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('payment', 'top_up')),
  request_id uuid REFERENCES public.payment_requests (id),
  payer_id uuid REFERENCES public.users (id),
  recipient_id uuid NOT NULL REFERENCES public.users (id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  funding_source_type text NOT NULL CHECK (funding_source_type IN ('wallet', 'bank_account')),
  funding_source_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (type <> 'payment' OR request_id IS NOT NULL)
);

CREATE INDEX idx_payment_transactions_request_id ON public.payment_transactions (request_id);
CREATE INDEX idx_payment_transactions_payer_id ON public.payment_transactions (payer_id);
CREATE INDEX idx_payment_transactions_recipient_id ON public.payment_transactions (recipient_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'guest', 'system')),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

CREATE VIEW public.payment_requests_view
WITH (security_invoker = true) AS
SELECT
  *,
  CASE
    WHEN status = 'pending' AND expires_at <= now() THEN 'expired'
    ELSE status
  END AS effective_status
FROM public.payment_requests;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY wallets_select_own ON public.wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY bank_accounts_select_own ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY payment_requests_select_visible ON public.payment_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR (
      recipient_type = 'email'
      AND recipient_value = (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
    )
    OR (
      recipient_type = 'phone'
      AND recipient_value = (SELECT u.phone FROM public.users u WHERE u.id = auth.uid())
    )
  );

CREATE POLICY payment_transactions_select_party ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY audit_logs_select_actor ON public.audit_logs
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

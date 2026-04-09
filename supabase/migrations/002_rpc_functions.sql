CREATE OR REPLACE FUNCTION public.process_payment(
  p_request_id uuid,
  p_payer_id uuid,
  p_funding_source_type text,
  p_funding_source_id uuid,
  p_is_guest boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.payment_requests%ROWTYPE;
  v_payer_wallet public.wallets%ROWTYPE;
  v_bank public.bank_accounts%ROWTYPE;
  v_requester_wallet public.wallets%ROWTYPE;
  v_tx_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_funding_source_type NOT IN ('wallet', 'bank_account') THEN
    RAISE EXCEPTION 'invalid funding_source_type';
  END IF;

  SELECT * INTO v_req
  FROM public.payment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment request not found';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'payment request is not pending';
  END IF;

  IF v_req.expires_at <= v_now THEN
    RAISE EXCEPTION 'payment request has expired';
  END IF;

  IF p_funding_source_type = 'wallet' THEN
    IF p_is_guest OR p_payer_id IS NULL THEN
      RAISE EXCEPTION 'guest cannot pay from wallet';
    END IF;

    SELECT * INTO v_payer_wallet
    FROM public.wallets
    WHERE id = p_funding_source_id AND user_id = p_payer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'payer wallet not found';
    END IF;

    IF v_payer_wallet.balance_cents < v_req.amount_cents THEN
      RAISE EXCEPTION 'insufficient wallet balance';
    END IF;

    UPDATE public.wallets
    SET balance_cents = balance_cents - v_req.amount_cents,
        updated_at = v_now
    WHERE id = v_payer_wallet.id;

    SELECT * INTO v_requester_wallet
    FROM public.wallets
    WHERE user_id = v_req.requester_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'requester wallet not found';
    END IF;

    UPDATE public.wallets
    SET balance_cents = balance_cents + v_req.amount_cents,
        updated_at = v_now
    WHERE id = v_requester_wallet.id;
  ELSE
    IF NOT p_is_guest THEN
      IF p_payer_id IS NULL THEN
        RAISE EXCEPTION 'payer_id required for bank payment';
      END IF;

      SELECT * INTO v_bank
      FROM public.bank_accounts
      WHERE id = p_funding_source_id AND user_id = p_payer_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'bank account not found';
      END IF;
    ELSE
      SELECT * INTO v_bank
      FROM public.bank_accounts
      WHERE id = p_funding_source_id AND is_guest = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'guest bank account not found';
      END IF;
    END IF;

    IF v_bank.balance_cents < v_req.amount_cents THEN
      RAISE EXCEPTION 'insufficient bank balance';
    END IF;

    UPDATE public.bank_accounts
    SET balance_cents = balance_cents - v_req.amount_cents,
        updated_at = v_now
    WHERE id = v_bank.id;

    SELECT * INTO v_requester_wallet
    FROM public.wallets
    WHERE user_id = v_req.requester_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'requester wallet not found';
    END IF;

    UPDATE public.wallets
    SET balance_cents = balance_cents + v_req.amount_cents,
        updated_at = v_now
    WHERE id = v_requester_wallet.id;
  END IF;

  UPDATE public.payment_requests
  SET status = 'paid',
      resolved_at = v_now
  WHERE id = p_request_id;

  INSERT INTO public.payment_transactions (
    type,
    request_id,
    payer_id,
    recipient_id,
    amount_cents,
    funding_source_type,
    funding_source_id,
    status
  ) VALUES (
    'payment',
    p_request_id,
    p_payer_id,
    v_req.requester_id,
    v_req.amount_cents,
    p_funding_source_type,
    p_funding_source_id,
    'completed'
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_type,
    action,
    target_type,
    target_id,
    metadata,
    outcome
  ) VALUES (
    p_payer_id,
    CASE
      WHEN p_is_guest THEN 'guest'::text
      ELSE 'user'::text
    END,
    'request.paid',
    'payment_transaction',
    v_tx_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'amount_cents', v_req.amount_cents,
      'funding_source_type', p_funding_source_type,
      'funding_source_id', p_funding_source_id
    ),
    'success'
  );

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_top_up(
  p_user_id uuid,
  p_bank_account_id uuid,
  p_amount_cents bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank public.bank_accounts%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_tx_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid amount_cents';
  END IF;

  SELECT * INTO v_bank
  FROM public.bank_accounts
  WHERE id = p_bank_account_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bank account not found';
  END IF;

  IF v_bank.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'insufficient bank balance';
  END IF;

  UPDATE public.bank_accounts
  SET balance_cents = balance_cents - p_amount_cents,
      updated_at = v_now
  WHERE id = v_bank.id;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  UPDATE public.wallets
  SET balance_cents = balance_cents + p_amount_cents,
      updated_at = v_now
  WHERE id = v_wallet.id;

  INSERT INTO public.payment_transactions (
    type,
    request_id,
    payer_id,
    recipient_id,
    amount_cents,
    funding_source_type,
    funding_source_id,
    status
  ) VALUES (
    'top_up',
    NULL,
    p_user_id,
    p_user_id,
    p_amount_cents,
    'bank_account',
    p_bank_account_id,
    'completed'
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_type,
    action,
    target_type,
    target_id,
    metadata,
    outcome
  ) VALUES (
    p_user_id,
    'user',
    'wallet.top_up',
    'payment_transaction',
    v_tx_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'bank_account_id', p_bank_account_id,
      'amount_cents', p_amount_cents
    ),
    'success'
  );

  RETURN v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment(uuid, uuid, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_payment(uuid, uuid, text, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_payment(uuid, uuid, text, uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.process_top_up(uuid, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_top_up(uuid, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_top_up(uuid, uuid, bigint) TO authenticated;

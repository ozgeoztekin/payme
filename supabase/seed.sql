INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alice@test.com',
  extensions.crypt('testpassword123', extensions.gen_salt('bf')),
  now(),
  '+15551234567',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'bob@test.com',
  extensions.crypt('testpassword123', extensions.gen_salt('bf')),
  now(),
  '+15559876543',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '10101010-1010-1010-1010-101010101010',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'email', 'alice@test.com',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
),
(
  '20202020-2020-2020-2020-202020202020',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object(
    'sub', '22222222-2222-2222-2222-222222222222',
    'email', 'bob@test.com',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
);

INSERT INTO public.users (
  id,
  display_name,
  email,
  phone,
  status,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Alice',
  'alice@test.com',
  '+15551234567',
  'active',
  now(),
  now()
),
(
  '22222222-2222-2222-2222-222222222222',
  'Bob',
  'bob@test.com',
  '+15559876543',
  'active',
  now(),
  now()
);

INSERT INTO public.wallets (id, user_id, balance_cents, created_at, updated_at) VALUES
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 10000, now(), now()),
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 5000, now(), now());

INSERT INTO public.bank_accounts (
  id,
  user_id,
  bank_name,
  account_number_masked,
  balance_cents,
  is_guest,
  created_at,
  updated_at
) VALUES (
  'd1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Test Bank',
  '••••1001',
  1000000,
  false,
  now(),
  now()
),
(
  'd2222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'Test Bank',
  '••••2002',
  1000000,
  false,
  now(),
  now()
);

INSERT INTO public.payment_requests (
  id,
  requester_id,
  recipient_type,
  recipient_value,
  amount_cents,
  note,
  status,
  share_token,
  created_at,
  expires_at,
  resolved_at
) VALUES (
  'f0101010-1010-1010-1010-101010101010',
  '11111111-1111-1111-1111-111111111111',
  'email',
  'bob@test.com',
  2500,
  'Coffee run',
  'pending',
  'a0101010-1010-1010-1010-101010101010',
  now(),
  now() + interval '7 days',
  NULL
),
(
  'f0202020-2020-2020-2020-202020202020',
  '11111111-1111-1111-1111-111111111111',
  'phone',
  '+15559876543',
  2000,
  'Dinner split',
  'paid',
  'a0202020-2020-2020-2020-202020202020',
  now() - interval '2 days',
  now() - interval '1 days',
  now() - interval '1 days'
),
(
  'f1212121-2121-2121-2121-212121212121',
  '22222222-2222-2222-2222-222222222222',
  'email',
  'alice@test.com',
  2000,
  'Concert tickets',
  'paid',
  'a1212121-2121-2121-2121-212121212121',
  now() - interval '3 days',
  now() + interval '4 days',
  now() - interval '2 days'
),
(
  'f0303030-3030-3030-3030-303030303030',
  '11111111-1111-1111-1111-111111111111',
  'email',
  'bob@test.com',
  500,
  NULL,
  'declined',
  'a0303030-3030-3030-3030-303030303030',
  now() - interval '1 days',
  now() + interval '6 days',
  now() - interval '12 hours'
),
(
  'f0404040-4040-4040-4040-404040404040',
  '22222222-2222-2222-2222-222222222222',
  'phone',
  '+15551234567',
  1500,
  NULL,
  'canceled',
  'a0404040-4040-4040-4040-404040404040',
  now() - interval '4 days',
  now() + interval '3 days',
  now() - interval '3 days'
),
(
  'f0505050-5050-5050-5050-505050505050',
  '22222222-2222-2222-2222-222222222222',
  'email',
  'alice@test.com',
  750,
  'Old tab',
  'pending',
  'a0505050-5050-5050-5050-505050505050',
  now() - interval '8 days',
  (now() - interval '8 days') + interval '7 days',
  NULL
);

INSERT INTO public.payment_transactions (
  id,
  type,
  request_id,
  payer_id,
  recipient_id,
  amount_cents,
  funding_source_type,
  funding_source_id,
  status,
  created_at
) VALUES (
  'e0202020-2020-2020-2020-202020202020',
  'payment',
  'f0202020-2020-2020-2020-202020202020',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  2000,
  'wallet',
  'c2222222-2222-2222-2222-222222222222',
  'completed',
  now() - interval '1 days'
),
(
  'e1212121-2121-2121-2121-212121212121',
  'payment',
  'f1212121-2121-2121-2121-212121212121',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  2000,
  'wallet',
  'c1111111-1111-1111-1111-111111111111',
  'completed',
  now() - interval '2 days'
);

INSERT INTO public.audit_logs (
  id,
  actor_id,
  actor_type,
  action,
  target_type,
  target_id,
  metadata,
  outcome,
  created_at
) VALUES
(
  'b0101010-1010-1010-1010-101010101010',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'request.created',
  'payment_request',
  'f0101010-1010-1010-1010-101010101010',
  '{"source":"seed"}',
  'success',
  now()
),
(
  'b0202020-2020-2020-2020-202020202020',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'request.created',
  'payment_request',
  'f0202020-2020-2020-2020-202020202020',
  '{"source":"seed"}',
  'success',
  now() - interval '2 days'
),
(
  'b0202021-2020-2020-2020-202020202021',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.paid',
  'payment_transaction',
  'e0202020-2020-2020-2020-202020202020',
  '{"source":"seed"}',
  'success',
  now() - interval '1 days'
),
(
  'b1212120-2121-2121-2121-212121212120',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.created',
  'payment_request',
  'f1212121-2121-2121-2121-212121212121',
  '{"source":"seed"}',
  'success',
  now() - interval '3 days'
),
(
  'b1212122-2121-2121-2121-212121212122',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'request.paid',
  'payment_transaction',
  'e1212121-2121-2121-2121-212121212121',
  '{"source":"seed"}',
  'success',
  now() - interval '2 days'
),
(
  'b0303030-3030-3030-3030-303030303030',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'request.created',
  'payment_request',
  'f0303030-3030-3030-3030-303030303030',
  '{"source":"seed"}',
  'success',
  now() - interval '1 days'
),
(
  'b0303031-3030-3030-3030-303030303031',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.declined',
  'payment_request',
  'f0303030-3030-3030-3030-303030303030',
  '{"source":"seed"}',
  'success',
  now() - interval '12 hours'
),
(
  'b0404040-4040-4040-4040-404040404040',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.created',
  'payment_request',
  'f0404040-4040-4040-4040-404040404040',
  '{"source":"seed"}',
  'success',
  now() - interval '4 days'
),
(
  'b0404041-4040-4040-4040-404040404041',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.canceled',
  'payment_request',
  'f0404040-4040-4040-4040-404040404040',
  '{"source":"seed"}',
  'success',
  now() - interval '3 days'
),
(
  'b0505050-5050-5050-5050-505050505050',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'request.created',
  'payment_request',
  'f0505050-5050-5050-5050-505050505050',
  '{"source":"seed"}',
  'success',
  now() - interval '8 days'
),
(
  'b0606060-6060-6060-6060-606060606060',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'seed.wallet_initialized',
  'wallet',
  'c1111111-1111-1111-1111-111111111111',
  '{"balance_cents":10000}',
  'success',
  now()
),
(
  'b0707070-7070-7070-7070-707070707070',
  '22222222-2222-2222-2222-222222222222',
  'user',
  'seed.wallet_initialized',
  'wallet',
  'c2222222-2222-2222-2222-222222222222',
  '{"balance_cents":5000}',
  'success',
  now()
);

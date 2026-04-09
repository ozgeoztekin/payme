-- Automatically create a public.users profile and wallet
-- when a new auth.users row is created (signup).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance_cents)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

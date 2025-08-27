-- Fix security warning by setting search_path for functions
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION delete_expired_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chats WHERE expires_at < now() OR is_terminated = true;
END;
$$;
CREATE OR REPLACE FUNCTION public.defer_email_for_break(message_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pgmq.set_vt('transactional_emails', message_id, 60);
END;
$$;
REVOKE ALL ON FUNCTION public.defer_email_for_break(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.defer_email_for_break(bigint) TO service_role;
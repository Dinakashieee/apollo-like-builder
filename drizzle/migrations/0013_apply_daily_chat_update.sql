ALTER TABLE public.daily_work_updates ADD COLUMN IF NOT EXISTS chat_message text, ADD COLUMN IF NOT EXISTS chat_result jsonb;
CREATE OR REPLACE FUNCTION public.apply_daily_chat_update(_workspace_id uuid, _work_date date, _timezone text, _message text, _completed text, _next_steps text, _blockers text, _changes jsonb, _notices jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _row public.daily_work_updates; _change jsonb; _lead public.leads; _results jsonb := '[]'::jsonb; _result jsonb;
BEGIN
 IF _user IS NULL OR NOT public.is_workspace_member(_workspace_id,_user) THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF length(btrim(_message)) NOT BETWEEN 1 AND 4000 OR _work_date IS NULL OR jsonb_typeof(_changes) <> 'array' THEN RAISE EXCEPTION 'invalid update'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user::text || _workspace_id::text || _work_date::text,0));
 SELECT * INTO _row FROM public.daily_work_updates WHERE user_id=_user AND workspace_id=_workspace_id AND work_date=_work_date FOR UPDATE;
 IF _row.chat_message = _message AND _row.chat_result IS NOT NULL THEN RETURN _row.chat_result; END IF;
 INSERT INTO public.daily_work_updates(user_id,workspace_id,work_date,timezone,completed,next_steps,blockers,chat_message)
 VALUES(_user,_workspace_id,_work_date,_timezone,_completed,_next_steps,_blockers,_message)
 ON CONFLICT(user_id,workspace_id,work_date) DO UPDATE SET completed=excluded.completed,next_steps=excluded.next_steps,blockers=excluded.blockers,chat_message=excluded.chat_message,timezone=excluded.timezone RETURNING * INTO _row;
 FOR _change IN SELECT value FROM jsonb_array_elements(_changes) LOOP
  IF _change->>'status' NOT IN ('new','contacted','qualified','won','lost') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO _lead FROM public.leads WHERE id=(_change->>'id')::uuid AND workspace_id=_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead not found'; END IF;
  IF _lead.status::text <> _change->>'status' THEN
   UPDATE public.leads SET status=(_change->>'status')::public.lead_status, updated_at=now() WHERE id=_lead.id AND workspace_id=_workspace_id;
   INSERT INTO public.activities(workspace_id,user_id,type,description,metadata) VALUES(_workspace_id,_user,'lead_status_changed','Status changed via daily update: ' || _lead.company_name || ' → ' || (_change->>'status'),jsonb_build_object('lead_id',_lead.id,'previous_status',_lead.status,'daily_update_id',_row.id));
  END IF;
  _results := _results || jsonb_build_array(jsonb_build_object('company_name',_lead.company_name,'status',_change->>'status'));
 END LOOP;
 _result := jsonb_build_object('update_id',_row.id,'changes',_results,'notices',_notices);
 UPDATE public.daily_work_updates SET chat_result=_result WHERE id=_row.id;
 RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_daily_chat_update(uuid,date,text,text,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_chat_update(uuid,date,text,text,text,text,text,jsonb,jsonb) TO service_role;
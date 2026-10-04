begin;

-- Explicitly requested public dashboard: only the three current workflows.
-- Preserve RLS, direct-table restrictions, old admin/sala permissions and data.
do $$
declare signature text; definition text;
  admin_check constant text := 'if not public.is_reservation_admin() then raise exception ''Admin access required'' using errcode=''42501''; end if;';
begin
  foreach signature in array array[
    'public.search_reservations(text,date,date,text,integer,boolean,text)',
    'public.reservation_overview(date,text)',
    'public.decide_reservation(uuid,text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if strpos(definition, admin_check) = 0 then
      raise exception 'Unexpected function definition: %', signature;
    end if;
    execute replace(definition, admin_check, '-- Public dashboard authorized by project owner.');
  end loop;
end $$;

revoke all on function public.search_reservations(text,date,date,text,integer,boolean,text),
  public.reservation_overview(date,text), public.decide_reservation(uuid,text) from public;
grant execute on function public.search_reservations(text,date,date,text,integer,boolean,text),
  public.reservation_overview(date,text), public.decide_reservation(uuid,text) to anon,authenticated;
commit;

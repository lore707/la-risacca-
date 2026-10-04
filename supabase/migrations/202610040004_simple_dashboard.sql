begin;

-- Evolve the admin API; retain all existing rows and applied schema history.
create or replace function public.decide_reservation(p_id uuid, p_status text)
returns public.reservations language plpgsql security definer set search_path = '' as $$
declare saved public.reservations;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_id is null or p_status is null or p_status not in ('confirmed','rejected') then raise exception 'Invalid decision' using errcode='22023'; end if;
  update public.reservations set status=p_status where id=p_id and status='pending' returning * into saved;
  if saved.id is null then raise exception 'Reservation no longer pending' using errcode='40001'; end if;
  return saved;
end $$;

create function public.search_reservations(p_status text default null, p_from date default null, p_to date default null, p_search text default '', p_offset integer default 0, p_oldest boolean default false, p_service text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if (p_status is not null and p_status not in ('pending','confirmed','rejected','cancelled')) or p_offset is null or p_offset<0 or (p_from is not null and p_to is not null and p_from>p_to) or (p_service is not null and p_service not in ('lunch','dinner')) or char_length(coalesce(p_search,''))>200 then raise exception 'Invalid filter' using errcode='22023'; end if;
  with filtered as (
    select r.* from public.reservations r where
    (p_status is null or r.status=p_status) and (p_from is null or r.reservation_date>=p_from) and (p_to is null or r.reservation_date<=p_to)
    and (p_service is null or (p_service='lunch' and r.reservation_time<time '17:00') or (p_service='dinner' and r.reservation_time>=time '17:00'))
    and (coalesce(btrim(p_search),'')='' or strpos(lower(r.first_name||' '||r.last_name),lower(btrim(p_search)))>0 or strpos(regexp_replace(r.phone,'[^0-9]','','g'),regexp_replace(p_search,'[^0-9]','','g'))>0 and p_search ~ '[0-9]')
  ), page as (
    select * from filtered order by case when p_oldest then created_at end, case when not p_oldest then reservation_date end, case when not p_oldest then reservation_time end, created_at,id limit 50 offset p_offset
  ) select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
  return result;
end $$;

create function public.reservation_overview(p_date date, p_service text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_date is null or p_service is null or p_service not in ('lunch','dinner') then raise exception 'Invalid filter' using errcode='22023'; end if;
  return jsonb_build_object(
    'pending_total',(select count(*) from public.reservations where status='pending'),
    'oldest_at',(select min(created_at) from public.reservations where status='pending'),
    'day',(select jsonb_build_object('total',count(*),'pending',count(*) filter(where status='pending'),'covers',coalesce(sum(party_size) filter(where status in ('pending','confirmed')),0),'cancelled',count(*) filter(where status='cancelled')) from public.reservations where reservation_date=p_date and ((p_service='lunch' and reservation_time<time '17:00') or (p_service='dinner' and reservation_time>=time '17:00')))
  );
end $$;
revoke all on function public.search_reservations(text,date,date,text,integer,boolean,text), public.reservation_overview(date,text) from public,anon,authenticated;
grant execute on function public.search_reservations(text,date,date,text,integer,boolean,text), public.reservation_overview(date,text) to authenticated;
-- The replaced floor workflows are no longer exposed to application clients.
revoke execute on function public.get_service_config(), public.save_service_settings(jsonb), public.save_dining_table(uuid,text,integer,boolean), public.get_service_day(date), public.get_available_tables(date,time,integer,uuid), public.assign_reservation(uuid,uuid), public.create_phone_reservation(uuid,date,time,integer,text,text,text,text,text,uuid), public.list_reservations(text,date,integer) from authenticated;
commit;

begin;

create table private.service_settings (
  id boolean primary key default true check(id),
  is_demo boolean not null default true,
  duration_minutes integer not null check(duration_minutes between 30 and 240),
  lunch_start time not null, lunch_end time not null,
  dinner_start time not null, dinner_end time not null,
  check(lunch_start < lunch_end and lunch_end <= dinner_start and dinner_start < dinner_end and dinner_end < time '24:00'),
  check(extract(epoch from lunch_end-lunch_start)/60 >= duration_minutes and extract(epoch from dinner_end-dinner_start)/60 >= duration_minutes)
);
create table private.dining_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(btrim(name)) between 1 and 40),
  seats integer not null check(seats between 1 and 20),
  active boolean not null default true,
  revision bigint not null default 0
);
create unique index dining_tables_name_idx on private.dining_tables(lower(name));
alter table private.service_settings enable row level security;
alter table private.dining_tables enable row level security;
revoke all on private.service_settings, private.dining_tables from public, anon, authenticated;
insert into private.service_settings(duration_minutes,lunch_start,lunch_end,dinner_start,dinner_end)
  values(120,'12:00','15:30','19:00','23:30');
insert into private.dining_tables(name,seats) values
  ('T1',2),('T2',2),('T3',4),('T4',4),('T5',4),('T6',4),('T7',6),('T8',6);

alter table public.reservations add column table_id uuid references private.dining_tables(id);
alter table public.reservations add column duration_minutes integer;
alter table public.reservations add constraint reservations_assignment_check check(
  (table_id is null and duration_minutes is null) or (table_id is not null and duration_minutes is not null and duration_minutes between 30 and 240)
);
create index reservations_table_date_idx on public.reservations(table_id,reservation_date) where status='confirmed';

create function public.get_service_config() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  return jsonb_build_object(
    'settings',(select to_jsonb(s)-'id' from private.service_settings s),
    'tables',(select coalesce(jsonb_agg(to_jsonb(t)-'revision' order by t.name),'[]'::jsonb) from private.dining_tables t)
  );
end $$;

create function public.save_service_settings(p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  update private.service_settings set is_demo=(p_settings->>'is_demo')::boolean,
    duration_minutes=(p_settings->>'duration_minutes')::integer,
    lunch_start=(p_settings->>'lunch_start')::time, lunch_end=(p_settings->>'lunch_end')::time,
    dinner_start=(p_settings->>'dinner_start')::time, dinner_end=(p_settings->>'dinner_end')::time where id;
  return public.get_service_config();
end $$;

create function public.save_dining_table(p_id uuid,p_name text,p_seats integer,p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_id is null then raise exception 'Invalid table' using errcode='22023'; end if;
  -- Serializza configurazione e assegnazioni sullo stesso tavolo.
  perform 1 from private.dining_tables where id=p_id for update;
  if exists(select 1 from public.reservations r where r.table_id=p_id and r.status='confirmed'
    and r.reservation_date+r.reservation_time+make_interval(mins=>r.duration_minutes) > timezone('Europe/Rome',now())
    and (not p_active or r.party_size > p_seats)) then
    raise exception 'Table has upcoming reservations' using errcode='23514';
  end if;
  insert into private.dining_tables(id,name,seats,active) values(p_id,btrim(p_name),p_seats,p_active)
    on conflict(id) do update set name=excluded.name,seats=excluded.seats,active=excluded.active,revision=private.dining_tables.revision+1;
  return public.get_service_config();
end $$;

create function public.get_service_day(p_date date) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_date is null then raise exception 'Invalid date' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.reservation_time,r.created_at,r.id),'[]'::jsonb)
    from public.reservations r where r.reservation_date=p_date);
end $$;

create function public.get_available_tables(p_date date,p_time time,p_party_size integer,p_ignore_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s private.service_settings; start_at timestamp; end_at timestamp;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into s from private.service_settings;
  start_at := p_date+p_time; end_at := start_at+make_interval(mins=>s.duration_minutes);
  if start_at is null or p_party_size is null or p_party_size < 1 or extract(second from p_time) <> 0
    or start_at <= timezone('Europe/Rome',now()) then raise exception 'Invalid slot' using errcode='22023'; end if;
  if not ((p_time >= s.lunch_start and end_at <= p_date+s.lunch_end)
    or (p_time >= s.dinner_start and end_at <= p_date+s.dinner_end)) then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'seats',t.seats) order by t.seats,t.name),'[]'::jsonb)
    from private.dining_tables t where t.active and t.seats >= p_party_size and not exists(
      select 1 from public.reservations r where r.table_id=t.id and r.status='confirmed'
        and (p_ignore_id is null or r.id <> p_ignore_id)
        and r.reservation_date+r.reservation_time < end_at
        and r.reservation_date+r.reservation_time+make_interval(mins=>r.duration_minutes) > start_at));
end $$;

create function public.assign_reservation(p_id uuid,p_table_id uuid) returns public.reservations
language plpgsql security definer set search_path = '' as $$
declare r public.reservations; t private.dining_tables; s private.service_settings;
  start_at timestamp; end_at timestamp;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  select * into r from public.reservations where id=p_id for update;
  if r.id is null or r.status not in ('pending','confirmed') or r.table_id is not null then
    raise exception 'Reservation already handled' using errcode='40001'; end if;
  select * into s from private.service_settings where id for share;
  -- L'aggiornamento serializza anche le transazioni Repeatable Read.
  update private.dining_tables set revision=revision+1 where id=p_table_id returning * into t;
  if t.id is null or not t.active or t.seats < r.party_size then raise exception 'Invalid table capacity' using errcode='22023'; end if;
  start_at := r.reservation_date+r.reservation_time; end_at := start_at+make_interval(mins=>s.duration_minutes);
  if start_at <= timezone('Europe/Rome',now()) or not (
    (r.reservation_time >= s.lunch_start and end_at <= r.reservation_date+s.lunch_end)
    or (r.reservation_time >= s.dinner_start and end_at <= r.reservation_date+s.dinner_end)) then
    raise exception 'Outside service hours' using errcode='22023'; end if;
  if exists(select 1 from public.reservations occupied where occupied.table_id=t.id and occupied.status='confirmed'
    and occupied.reservation_date+occupied.reservation_time < end_at
    and occupied.reservation_date+occupied.reservation_time+make_interval(mins=>occupied.duration_minutes) > start_at) then
    raise exception 'Table no longer available' using errcode='40001'; end if;
  update public.reservations set table_id=t.id,duration_minutes=s.duration_minutes,status='confirmed'
    where id=r.id returning * into r;
  return r;
end $$;

-- Sostituisce la conferma senza tavolo; la firma usata per rifiutare resta invariata.
create or replace function public.decide_reservation(p_id uuid,p_status text) returns public.reservations
language plpgsql security definer set search_path = '' as $$
declare saved public.reservations;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_id is null or p_status is distinct from 'rejected' then raise exception 'Use table assignment to confirm' using errcode='22023'; end if;
  update public.reservations set status='rejected' where id=p_id and status='pending' returning * into saved;
  if saved.id is null then raise exception 'Reservation no longer pending' using errcode='40001'; end if;
  return saved;
end $$;

create function public.create_phone_reservation(
  p_request_id uuid,p_reservation_date date,p_reservation_time time,p_party_size integer,
  p_first_name text,p_last_name text,p_phone text,p_email text,p_notes text,p_table_id uuid
) returns public.reservations language plpgsql security definer set search_path = '' as $$
declare saved public.reservations;
begin
  if not public.is_reservation_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_request_id is null or p_reservation_date is null or p_reservation_time is null
    or p_reservation_date+p_reservation_time <= timezone('Europe/Rome',now()) then
    raise exception 'Invalid reservation' using errcode='22023'; end if;
  insert into public.reservations(id,reservation_date,reservation_time,party_size,first_name,last_name,phone,email,notes,source)
    values(p_request_id,p_reservation_date,p_reservation_time,p_party_size,btrim(p_first_name),btrim(p_last_name),btrim(p_phone),nullif(btrim(p_email),''),nullif(btrim(p_notes),''),'phone')
    on conflict(id) do nothing;
  select * into saved from public.reservations where id=p_request_id for update;
  if saved.source <> 'phone' or saved.reservation_date is distinct from p_reservation_date
    or saved.reservation_time is distinct from p_reservation_time or saved.party_size is distinct from p_party_size
    or saved.first_name is distinct from btrim(p_first_name) or saved.last_name is distinct from btrim(p_last_name)
    or saved.phone is distinct from btrim(p_phone) or saved.email is distinct from nullif(btrim(p_email),'')
    or saved.notes is distinct from nullif(btrim(p_notes),'') then
    raise exception 'Request identifier conflict' using errcode='22023'; end if;
  if saved.table_id is null then return public.assign_reservation(saved.id,p_table_id); end if;
  if saved.table_id is distinct from p_table_id or saved.status <> 'confirmed' then raise exception 'Request identifier conflict' using errcode='22023'; end if;
  return saved;
end $$;

revoke all on function public.get_service_config(),public.save_service_settings(jsonb),public.save_dining_table(uuid,text,integer,boolean),
  public.get_service_day(date),public.get_available_tables(date,time,integer,uuid),public.assign_reservation(uuid,uuid),
  public.create_phone_reservation(uuid,date,time,integer,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.get_service_config(),public.save_service_settings(jsonb),public.save_dining_table(uuid,text,integer,boolean),
  public.get_service_day(date),public.get_available_tables(date,time,integer,uuid),public.assign_reservation(uuid,uuid),
  public.create_phone_reservation(uuid,date,time,integer,text,text,text,text,text,uuid) to authenticated;
commit;

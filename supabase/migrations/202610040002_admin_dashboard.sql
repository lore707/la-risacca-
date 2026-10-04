begin;

create schema private;
revoke all on schema private from public, anon, authenticated;
create table private.reservation_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.reservation_admins enable row level security;
revoke all on private.reservation_admins from public, anon, authenticated;

create function public.is_reservation_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.reservation_admins where user_id = auth.uid());
$$;
revoke all on function public.is_reservation_admin() from public, anon, authenticated;
grant execute on function public.is_reservation_admin() to authenticated;

create function public.list_reservations(
  p_status text default null, p_date date default null, p_offset integer default 0
)
returns setof public.reservations
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reservation_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_offset is null or p_offset < 0 or (p_status is not null and p_status not in ('pending','confirmed','rejected','cancelled')) then
    raise exception 'Invalid filters' using errcode = '22023';
  end if;
  return query select r.* from public.reservations r
    where (p_status is null or r.status = p_status) and (p_date is null or r.reservation_date = p_date)
    order by r.reservation_date, r.reservation_time, r.created_at, r.id
    limit 51 offset p_offset;
end;
$$;
revoke all on function public.list_reservations(text,date,integer) from public, anon, authenticated;
grant execute on function public.list_reservations(text,date,integer) to authenticated;

create function public.decide_reservation(p_id uuid, p_status text)
returns public.reservations
language plpgsql security definer set search_path = ''
as $$
declare saved public.reservations;
begin
  if not public.is_reservation_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_id is null or p_status is null or p_status not in ('confirmed','rejected') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  update public.reservations set status = p_status
    where id = p_id and status = 'pending' returning * into saved;
  if saved.id is null then
    raise exception 'Reservation no longer pending' using errcode = '40001';
  end if;
  return saved;
end;
$$;
revoke all on function public.decide_reservation(uuid,text) from public, anon, authenticated;
grant execute on function public.decide_reservation(uuid,text) to authenticated;

commit;

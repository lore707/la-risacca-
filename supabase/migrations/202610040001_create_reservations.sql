begin;

create table public.reservations (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  reservation_date date not null,
  reservation_time time without time zone not null check (reservation_time < time '24:00' and extract(second from reservation_time) = 0),
  party_size integer not null check (party_size >= 1),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  phone text not null check (
    phone ~ '^\+?[0-9[:space:]().-]+$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 6 and 15
  ),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  source text not null default 'website' check (source in ('website', 'google', 'instagram', 'whatsapp', 'phone', 'manual'))
);

create index reservations_date_time_idx on public.reservations (reservation_date, reservation_time);
create index reservations_pending_idx on public.reservations (reservation_date) where status = 'pending';

alter table public.reservations enable row level security;
revoke all on table public.reservations from public, anon, authenticated;
grant all on table public.reservations to service_role;

-- Le operazioni admin e le relative policy saranno aggiunte nella fase dashboard.
-- Nessun cliente, incluso un utente autenticato, può leggere o modificare la tabella.
create function public.track_reservation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.status_changed_at := case when new.status is distinct from old.status then now() else old.status_changed_at end;
  return new;
end;
$$;

revoke all on function public.track_reservation_update() from public, anon, authenticated;
create trigger reservations_track_update before update on public.reservations
for each row execute function public.track_reservation_update();

-- Unico punto di ingresso pubblico: controlla i dati e impone pending/website.
-- L'UUID rimane identico nei tentativi di reinvio per evitare richieste duplicate.
create function public.create_reservation(
  p_request_id uuid,
  p_reservation_date date,
  p_reservation_time time without time zone,
  p_party_size integer,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if p_request_id is null or p_reservation_date is null or p_reservation_time is null
     or p_party_size is null or p_first_name is null or p_last_name is null or p_phone is null
     or p_reservation_date + p_reservation_time <= timezone('Europe/Rome', now()) then
    raise exception 'Invalid reservation data' using errcode = '22023';
  end if;

  insert into public.reservations (
    id, reservation_date, reservation_time, party_size, first_name, last_name,
    phone, email, notes, status, source
  ) values (
    p_request_id, p_reservation_date, p_reservation_time, p_party_size,
    btrim(p_first_name), btrim(p_last_name), btrim(p_phone),
    nullif(btrim(p_email), ''), nullif(btrim(p_notes), ''), 'pending', 'website'
  ) on conflict (id) do nothing;

  -- Un conflitto è un reinvio solo se i dati coincidono; non restituisce dati privati.
  select id into saved_id from public.reservations
  where id = p_request_id
    and reservation_date = p_reservation_date
    and reservation_time = p_reservation_time
    and party_size = p_party_size
    and first_name = btrim(p_first_name)
    and last_name = btrim(p_last_name)
    and phone = btrim(p_phone)
    and email is not distinct from nullif(btrim(p_email), '')
    and notes is not distinct from nullif(btrim(p_notes), '')
    and source = 'website';

  if saved_id is null then
    raise exception 'Request identifier conflict' using errcode = '22023';
  end if;
  return saved_id;
end;
$$;

revoke all on function public.create_reservation(uuid, date, time without time zone, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_reservation(uuid, date, time without time zone, integer, text, text, text, text, text) to anon, authenticated;

commit;

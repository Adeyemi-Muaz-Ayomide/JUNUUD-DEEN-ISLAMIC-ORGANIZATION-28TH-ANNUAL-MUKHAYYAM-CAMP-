-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- One row per payment (a payer can register several participants at once).
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  reference text not null unique,
  payer_name text not null,
  payer_email text not null,
  payer_phone text not null,
  tier text not null check (tier in ('early', 'regular')),
  participant_count int not null,
  subtotal int not null,           -- camp fees in naira
  fee int not null,                -- Paystack charge added on top, in naira
  total int not null,              -- amount charged, in naira
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paystack_id bigint,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per camper.
create table if not exists public.participants (
  id bigint generated always as identity primary key,
  registration_id bigint not null references public.registrations (id) on delete cascade,
  reg_code text unique,            -- e.g. JDM26-0001, assigned once payment is confirmed
  full_name text not null,
  email text,
  phone text,
  gender text not null check (gender in ('male', 'female')),
  category text not null check (category in ('adult', 'others')),
  price int not null,
  emergency_name text not null,
  emergency_phone text not null,
  emergency_relationship text not null,
  medical_notes text,
  created_at timestamptz not null default now()
);

create index if not exists participants_registration_id_idx on public.participants (registration_id);

-- Only the website's server (using the service role key) can read or write.
alter table public.registrations enable row level security;
alter table public.participants enable row level security;

create sequence if not exists public.reg_code_seq;

-- Marks a registration as paid and gives each participant a registration ID.
-- Safe to call more than once: only the first call does anything.
create or replace function public.mark_paid(p_reference text, p_paystack_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  r record;
begin
  update registrations
     set status = 'paid', paid_at = now(), paystack_id = p_paystack_id
   where reference = p_reference and status <> 'paid'
   returning id into v_id;

  if v_id is null then
    return;
  end if;

  for r in select id from participants where registration_id = v_id order by id loop
    update participants
       set reg_code = 'JDM26-' || lpad(nextval('reg_code_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end;
$$;

revoke execute on function public.mark_paid(text, bigint) from public, anon, authenticated;
grant execute on function public.mark_paid(text, bigint) to service_role;

-- Handy list of everyone who has paid. Open it in Table Editor and export as CSV.
create or replace view public.paid_participants
with (security_invoker = true) as
select
  p.reg_code,
  p.full_name,
  p.gender,
  p.category,
  p.phone,
  p.email,
  p.emergency_name,
  p.emergency_phone,
  p.emergency_relationship,
  p.medical_notes,
  p.price,
  r.reference,
  r.payer_name,
  r.payer_phone,
  r.paid_at
from public.participants p
join public.registrations r on r.id = p.registration_id
where r.status = 'paid'
order by p.reg_code;

revoke all on public.paid_participants from anon, authenticated;

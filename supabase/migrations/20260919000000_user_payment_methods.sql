-- 20260919000000_user_payment_methods.sql
-- Saved Payment Methods (MTN MoMo + Orange Money) with single primary enforcement

create table if not exists user_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  rail text not null check (rail in ('mtn_momo', 'orange_money')),
  country text not null,
  phone_number text not null,
  dialing_code text not null,
  is_primary boolean default false,
  label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index user_id for fast queries
create index if not exists idx_user_payment_methods_user_id on user_payment_methods (user_id);

-- Enforce at most one primary payment method per user at the database level
create unique index if not exists idx_user_primary_payment_method 
  on user_payment_methods (user_id) 
  where (is_primary = true);

-- Enable RLS
alter table user_payment_methods enable row level security;

-- RLS policies: users can select/insert/update/delete only their own rows
create policy "Users can view own payment methods"
  on user_payment_methods for select
  using (auth.uid() = user_id);

create policy "Users can insert own payment methods"
  on user_payment_methods for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payment methods"
  on user_payment_methods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own payment methods"
  on user_payment_methods for delete
  using (auth.uid() = user_id);

-- Project Atomic initial schema. Execute in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', timezone text not null default 'UTC',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.habits (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 1 and 80),
 description text not null default '' check (char_length(description) <= 300),
 minimum_version text not null default '' check (char_length(minimum_version) <= 120),
 category text not null default 'Personal', identity_goal text not null default '',
 schedule_days smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint valid_schedule_days check (cardinality(schedule_days) between 1 and 7 and schedule_days <@ array[0,1,2,3,4,5,6]::smallint[])
);
create table if not exists public.habit_completions (
 id uuid primary key default gen_random_uuid(), habit_id uuid not null references public.habits(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, completed_on date not null,
 note text not null default '' check (char_length(note) <= 300), completed_at timestamptz not null default now(),
 constraint one_completion_per_habit_day unique (habit_id, completed_on)
);
create index if not exists habits_user_active_idx on public.habits(user_id, archived_at);
create index if not exists completions_user_date_idx on public.habit_completions(user_id, completed_on desc);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data ->> 'display_name','')) on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Users manage own habits" on public.habits for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users manage own completions" on public.habit_completions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists(select 1 from public.habits h where h.id=habit_id and h.user_id=(select auth.uid())));
grant usage on schema public to authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.habits to authenticated;
grant select,insert,update,delete on public.habit_completions to authenticated;
-- Browser clients use only the publishable/anon key. Never expose the service-role key.

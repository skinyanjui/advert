-- Persisted application RBAC. Server-side application code is the access boundary.
-- ADMIN_EMAILS may bootstrap initial role rows, but authorization reads this table.
create table if not exists public.board_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('member', 'admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_user_roles_role on public.board_user_roles(role);

alter table public.board_user_roles enable row level security;
revoke all on table public.board_user_roles from anon, authenticated;
grant select, insert, update, delete on table public.board_user_roles to service_role;

comment on table public.board_user_roles is
  'Authoritative persisted application role assignments. ADMIN_EMAILS is bootstrap-only.';

-- 파슉슉버디탁 골프동호회 DB 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요

create table if not exists members (
  id              text primary key,
  name            text not null,
  department      text not null default '',
  position        text not null default '',
  phone           text not null default '',
  email           text not null default '',
  handicap        real not null default 0,
  joined_at       text not null,
  status          text not null default 'active',
  avatar_initials text not null default '',
  created_at      timestamptz default now()
);

create table if not exists roundings (
  id               text primary key,
  title            text not null,
  course_id        text,
  course_name      text not null,
  date             text not null,
  tee_time         text not null,
  max_participants integer not null default 12,
  fee              integer not null default 0,
  status           text not null default 'scheduled',
  attendances      jsonb not null default '[]',
  groups           jsonb,
  created_at       timestamptz default now()
);

create table if not exists transactions (
  id          text primary key,
  date        text not null,
  description text not null,
  type        text not null,
  fee_type    text not null,
  amount      integer not null,
  member_id   text,
  rounding_id text,
  balance     integer not null,
  created_at  timestamptz default now()
);

create table if not exists round_scores (
  rounding_id text not null,
  member_id   text not null,
  gross       integer not null,
  net         real not null,
  created_at  timestamptz default now(),
  primary key (rounding_id, member_id)
);

create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- 내부 앱이므로 RLS 비활성화
alter table members      disable row level security;
alter table roundings    disable row level security;
alter table transactions disable row level security;
alter table round_scores disable row level security;
alter table settings     disable row level security;

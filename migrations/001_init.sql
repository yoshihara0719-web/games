create table games (
  id text primary key,
  title text not null,
  author text not null,
  description text not null,
  play_count integer not null default 0,
  created_at timestamptz not null default now(),
  entry_path text not null,
  sample boolean not null default false,
  thumb bytea,
  thumb_type text
);

create table game_files (
  game_id text not null references games (id) on delete cascade,
  path text not null,
  body bytea not null,
  primary key (game_id, path)
);

create index games_created_at on games (created_at desc);

-- КиаГид: схема БД (выполнить в SQL Editor нового проекта Supabase)
create table if not exists pages (
  id bigint generated always as identity primary key,
  url_path text unique not null,
  type text not null default 'article',      -- article | hub-model | hub-node
  title text,
  description text,
  h1 text,
  html text,
  model text,
  gen text,
  node text,
  published boolean not null default false,
  lastmod timestamptz not null default now()
);
create index if not exists pages_model_idx on pages (model) where type = 'article';
create index if not exists pages_node_idx on pages (node) where type = 'article';
create index if not exists pages_pub_idx on pages (published);

-- справочник фактуры (этап 4, заполняется вручную/скриптами)
create table if not exists entities (
  id bigint generated always as identity primary key,
  model text, gen text, node text,
  facts jsonb not null default '[]',         -- [{value, unit, note, source}]
  unique (model, gen, node)
);

alter table pages enable row level security;
alter table entities enable row level security;
create policy "public read pages" on pages for select using (published = true);
create policy "public read entities" on entities for select using (true);

-- Execute isso uma vez no SQL Editor do Supabase (depois do schema.sql original).

alter table listings add column if not exists region text not null default 'joao-pessoa';
alter table listings add column if not exists photos jsonb default '[]'::jsonb;

-- Imóveis já cadastrados continuam como "João Pessoa" por padrão.
-- Use o painel /admin para marcar novos imóveis como "Zona Sul" ou "Bananeiras".

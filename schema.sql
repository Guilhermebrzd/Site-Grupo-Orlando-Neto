-- Execute isso uma vez no SQL Editor do Supabase.

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('lancamento','aluguel','venda')),
  operation text,
  title text not null,
  location text not null,
  description text,
  badge text,
  building_type text,
  price numeric,
  old_price numeric,
  specs jsonb default '[]'::jsonb,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  neighborhood text,
  message text,
  contacted boolean default false,
  created_at timestamptz default now()
);

-- Imóveis que já existiam fixos no site, para o site não começar vazio.
insert into listings (category, badge, building_type, title, location, description) values
('lancamento','Lançamento','Edifício de Apartamento','VILLA MARINE','Altiplano Cabo Branco — João Pessoa/PB','Um novo conceito residencial no coração do Altiplano, com área de lazer completa e vista para o mar.'),
('lancamento','Pré Lançamento','Edifício de Flats','THE PALM','Tambaú — João Pessoa/PB','Flats compactos e funcionais a poucos passos da orla, pensados para quem busca praticidade.'),
('lancamento','Lançamento','Edifício de Apartamento','OCEANIA RESIDENCE','Jardim Oceania — João Pessoa/PB','Bem-estar e sofisticação em um dos bairros mais procurados da cidade, com plantas de 2 e 3 quartos.');

insert into listings (category, operation, title, location, description, price, specs) values
('aluguel','Alugar','Apartamento Mobiliado','Bessa — João Pessoa/PB','Excelente apartamento próximo à orla do Bessa, mobiliado e pronto para morar.',2700,'[{"value":"1","label":"Dorm."},{"value":"1","label":"Banho"},{"value":"1","label":"Garagem"},{"value":"45m²","label":"Const."}]'),
('aluguel','Alugar','Sala Comercial','Tambauzinho — João Pessoa/PB','Excelente sala comercial, bem localizada, ideal para clínicas e escritórios.',9000,'[{"value":"7","label":"Salas"},{"value":"2","label":"Banho"},{"value":"360m²","label":"Terreno"},{"value":"360m²","label":"Const."}]');

insert into listings (category, operation, title, location, description, price, old_price, specs) values
('aluguel','Alugar','Casa em Condomínio','Altiplano — João Pessoa/PB','Casa ampla em condomínio fechado, com área de lazer e segurança 24h.',3200,3500,'[{"value":"3","label":"Dorm."},{"value":"2","label":"Banho"},{"value":"2","label":"Garagem"},{"value":"140m²","label":"Const."}]');

insert into listings (category, operation, title, location, description, price, specs) values
('venda','Comprar','Apartamento Vista Mar','Cabo Branco — João Pessoa/PB','Amplo apartamento com vista para o mar, 3 quartos sendo 1 suíte, totalmente reformado.',620000,'[{"value":"3","label":"Dorm."},{"value":"1","label":"Suíte"},{"value":"2","label":"Garagem"},{"value":"98m²","label":"Const."}]'),
('venda','Comprar','Casa Alto Padrão','Altiplano Cabo Branco — João Pessoa/PB','Casa de alto padrão em condomínio, 4 suítes, piscina e área gourmet completa.',1350000,'[{"value":"4","label":"Suítes"},{"value":"5","label":"Banho"},{"value":"4","label":"Garagem"},{"value":"320m²","label":"Const."}]');

insert into listings (category, operation, title, location, description, price, old_price, specs) values
('venda','Comprar','Apartamento Compacto','Manaíra — João Pessoa/PB','Ótimo custo-benefício, próximo ao comércio e a poucos minutos da praia de Manaíra.',415000,450000,'[{"value":"2","label":"Dorm."},{"value":"1","label":"Banho"},{"value":"1","label":"Garagem"},{"value":"68m²","label":"Const."}]');

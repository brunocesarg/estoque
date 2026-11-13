-- Sistema de estoque: esquema do banco (Supabase / PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > colar este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem estragar nada (usa "if not exists" e recria as políticas).

-- ───────────────────────── Tabelas ─────────────────────────

create table if not exists categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cor        text not null default '#7a6bff',
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists canais (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  ordem      int  not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists faixas_taxa (
  id           uuid primary key default gen_random_uuid(),
  canal_id     uuid not null references canais(id) on delete cascade,
  preco_de     numeric(12,2) not null default 0,
  preco_ate    numeric(12,2),                       -- vazio = sem limite
  comissao_pct numeric(6,2)  not null default 0,
  taxa_fixa    numeric(12,2) not null default 0,    -- por item
  observacao   text,
  criado_em    timestamptz not null default now()
);

create table if not exists fornecedores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  site          text,
  contato       text,                               -- telefone/WhatsApp ou e-mail
  tipo          text not null default 'online' check (tipo in ('online','loja_fisica','ambos')),
  cidade        text,
  estado        text,
  regiao        text,                               -- polo: 25 de Março, Brás, online...
  pedido_minimo numeric(12,2),
  aceita_cpf    text not null default 'desconhecido' check (aceita_cpf in ('sim','nao','desconhecido')),
  emite_nota    text not null default 'desconhecido' check (emite_nota in ('sim','nao','desconhecido')),
  avaliacao     int check (avaliacao between 1 and 5),
  observacoes   text,
  criado_em     timestamptz not null default now()
);

create table if not exists produtos (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  codigo            text,
  categoria_id      uuid references categorias(id) on delete set null,
  fornecedor_id     uuid references fornecedores(id) on delete set null,
  foto              text,                           -- caminho no bucket "fotos"
  estoque_minimo    int,                            -- vazio = usa o padrão dos Ajustes
  preco_venda       numeric(12,2),                  -- preço de venda sugerido
  custo_estimado    numeric(12,4),                  -- usado até existir uma entrada de lote
  embalagem         numeric(12,2),                  -- vazio = usa o padrão dos Ajustes
  ativo             boolean not null default true,
  observacoes       text,
  criado_em         timestamptz not null default now()
);

create table if not exists fornecedor_produtos (
  id             uuid primary key default gen_random_uuid(),
  fornecedor_id  uuid not null references fornecedores(id) on delete cascade,
  produto_id     uuid references produtos(id) on delete set null,
  descricao      text not null,                     -- produto ou tipo de produto
  preco          numeric(12,2),
  qtd_minima     int,
  data_cotacao   date not null default current_date,
  observacao     text,
  criado_em      timestamptz not null default now()
);

create table if not exists etiquetas_fornecedor (
  id             uuid primary key default gen_random_uuid(),
  fornecedor_id  uuid not null references fornecedores(id) on delete cascade,
  etiqueta       text not null,
  criado_em      timestamptz not null default now(),
  unique (fornecedor_id, etiqueta)
);

-- Estoque atual não é campo: é a soma das movimentações do produto.
-- quantidade é sempre positiva (só "ajuste" pode ser negativa).
-- preco_venda e custo_unitario são por unidade; comissao, taxa_fixa, adicional_cpf, frete,
-- embalagem e imposto são totais da linha. Na entrada, frete é o frete do lote.
create table if not exists movimentacoes (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references produtos(id) on delete cascade,
  tipo           text not null check (tipo in ('entrada','venda','devolucao','perda','ajuste')),
  quantidade     int  not null check (quantidade <> 0),
  data           date not null default current_date,
  custo_unitario numeric(12,4),
  fornecedor_id  uuid references fornecedores(id) on delete set null,
  canal_id       uuid references canais(id) on delete set null,
  preco_venda    numeric(12,2),
  comissao       numeric(12,2) not null default 0,
  taxa_fixa      numeric(12,2) not null default 0,
  adicional_cpf  numeric(12,2) not null default 0,
  frete          numeric(12,2) not null default 0,
  embalagem      numeric(12,2) not null default 0,
  imposto        numeric(12,2) not null default 0,
  observacao     text,
  criado_por     uuid default auth.uid(),
  criado_em      timestamptz not null default now(),
  check (tipo = 'ajuste' or quantidade > 0)
);
create index if not exists movimentacoes_produto_idx on movimentacoes (produto_id, data);
create index if not exists movimentacoes_data_idx on movimentacoes (data);

create table if not exists custos_fixos (
  id         uuid primary key default gen_random_uuid(),
  descricao  text not null,                         -- MEI, anúncios, embalagens em lote...
  valor      numeric(12,2) not null default 0,
  mes        date not null,                         -- sempre o dia 1 do mês
  criado_em  timestamptz not null default now()
);

-- Uma única linha (id = 1)
create table if not exists configuracoes (
  id                    int primary key default 1 check (id = 1),
  embalagem_padrao      numeric(12,2) not null default 1.5,
  imposto_pct           numeric(6,2)  not null default 0,
  adicional_cpf         numeric(12,2) not null default 3,
  tipo_vendedor         text not null default 'CPF' check (tipo_vendedor in ('CPF','CNPJ')),
  margem_minima_pct     numeric(6,2)  not null default 20,
  estoque_minimo_padrao int not null default 3,
  dias_parado           int not null default 30,
  meta_lucro_mes        numeric(12,2) not null default 0,
  canal_padrao_id       uuid references canais(id) on delete set null,
  painel_cartoes        jsonb,
  criado_em             timestamptz not null default now()
);
insert into configuracoes (id) values (1) on conflict (id) do nothing;

-- ───────────────────────── Segurança por linha (RLS) ─────────────────────────
-- Só usuário logado lê e grava. Sem login, nada aparece.

do $$
declare t text;
begin
  foreach t in array array['categorias','canais','faixas_taxa','fornecedores','produtos',
    'fornecedor_produtos','etiquetas_fornecedor','movimentacoes','custos_fixos','configuracoes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "logado_tudo" on %I', t);
    execute format('create policy "logado_tudo" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ───────────────────────── Fotos (bucket privado) ─────────────────────────

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos_logado_ler"     on storage.objects;
drop policy if exists "fotos_logado_enviar"  on storage.objects;
drop policy if exists "fotos_logado_alterar" on storage.objects;
drop policy if exists "fotos_logado_apagar"  on storage.objects;

create policy "fotos_logado_ler"     on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy "fotos_logado_enviar"  on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy "fotos_logado_alterar" on storage.objects for update to authenticated using (bucket_id = 'fotos');
create policy "fotos_logado_apagar"  on storage.objects for delete to authenticated using (bucket_id = 'fotos');

-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Schema inicial (Star Schema)
-- Modelagem dimensional definida no CP3: 6 dimensões + 2 fatos.
-- Fase 5 (CP5) — banco em nuvem (Supabase / Postgres).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── DIMENSÕES ────────────────────────────────────────────────────────────────

-- Usuário: 1:1 com auth.users (Supabase Auth). O id É o id do usuário autenticado.
create table if not exists public.dim_usuario (
  id           uuid primary key references auth.users (id) on delete cascade,
  nome         text        not null,
  email        text        not null unique,
  tipo_imovel  text        not null check (tipo_imovel in ('apartamento', 'casa')),
  plano        text        not null default 'free' check (plano in ('free', 'pro')),
  criado_em    timestamptz not null default now()
);

-- Dispositivo físico (Amperê Node: ESP32 + SCT-013) instalado no quadro.
create table if not exists public.dim_dispositivo (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid        not null references public.dim_usuario (id) on delete cascade,
  apelido          text        not null,
  status_conexao   text        not null default 'offline'
                     check (status_conexao in ('online', 'offline', 'sem_sinal')),
  versao_firmware  text        not null default 'fw 1.4.2',
  sinal_wifi       integer,                       -- dBm (-30 ótimo … -90 ruim)
  ultimo_contato   timestamptz,
  -- coluna operacional (fora da modelagem do CP3): autentica o POST /ingest/readings
  chave_ingestao   text        not null unique default encode(gen_random_bytes(24), 'hex')
);

-- Aparelho identificado pelo NILM a partir da assinatura de carga.
create table if not exists public.dim_aparelho (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid        not null references public.dim_usuario (id) on delete cascade,
  nome               text        not null,
  categoria          text        not null,
  potencia_nominal_w integer     not null,
  identificado_em    timestamptz not null default now()
);

-- Tempo: grão horário. O instante exato de 15 min fica em fato.registrado_em.
create table if not exists public.dim_tempo (
  id                integer generated always as identity primary key,
  data              date    not null,
  ano               integer not null,
  mes               integer not null,
  dia               integer not null,
  hora              integer not null check (hora between 0 and 23),
  dia_semana        integer not null check (dia_semana between 0 and 6), -- 0 = domingo
  eh_fim_de_semana  boolean not null,
  unique (data, hora)
);

-- Tarifa vigente por concessionária, com bandeira tarifária.
create table if not exists public.dim_tarifa (
  id                 uuid primary key default gen_random_uuid(),
  concessionaria     text          not null,
  uf                 char(2)       not null,
  tarifa_kwh         numeric(10,5) not null,
  bandeira           text          not null
                       check (bandeira in ('verde', 'amarela', 'vermelha_1', 'vermelha_2')),
  adicional_bandeira numeric(10,5) not null default 0,
  vigencia_inicio    date          not null,
  vigencia_fim       date
);

-- Planos comerciais do Amperê.
create table if not exists public.dim_plano (
  id            uuid primary key default gen_random_uuid(),
  nome          text          not null unique,
  preco_mensal  numeric(10,2) not null,
  recursos      jsonb         not null default '[]'::jsonb
);

-- ── FATOS ────────────────────────────────────────────────────────────────────

-- Leitura agregada da casa inteira (o que o sensor mede de fato).
create table if not exists public.fato_leitura_agregada (
  id                     bigint generated always as identity primary key,
  dispositivo_id         uuid          not null references public.dim_dispositivo (id) on delete cascade,
  tempo_id               integer       not null references public.dim_tempo (id),
  tarifa_id              uuid          not null references public.dim_tarifa (id),
  potencia_instantanea_w numeric(10,2) not null,
  energia_kwh            numeric(12,6) not null,
  custo_estimado_brl     numeric(12,4) not null,
  registrado_em          timestamptz   not null,
  unique (dispositivo_id, registrado_em)
);

-- Evento de aparelho: degrau liga/desliga detectado pelo NILM sobre o agregado.
create table if not exists public.fato_evento_aparelho (
  id                  bigint generated always as identity primary key,
  aparelho_id         uuid          not null references public.dim_aparelho (id) on delete cascade,
  dispositivo_id      uuid          not null references public.dim_dispositivo (id) on delete cascade,
  tempo_id            integer       not null references public.dim_tempo (id),
  tipo_evento         text          not null check (tipo_evento in ('ligou', 'desligou')),
  potencia_w          numeric(10,2) not null,
  duracao_minutos     numeric(10,2) not null default 0,
  energia_kwh         numeric(12,6) not null default 0,
  custo_brl           numeric(12,4) not null default 0,
  confianca_deteccao  numeric(4,3)  not null default 0.8 check (confianca_deteccao between 0 and 1),
  registrado_em       timestamptz   not null
);

-- ── ÍNDICES (FKs + colunas temporais) ────────────────────────────────────────

create index if not exists idx_dispositivo_usuario     on public.dim_dispositivo (usuario_id);
create index if not exists idx_aparelho_usuario        on public.dim_aparelho (usuario_id);
create index if not exists idx_tempo_data              on public.dim_tempo (data);
create index if not exists idx_tarifa_vigencia         on public.dim_tarifa (vigencia_inicio, vigencia_fim);

create index if not exists idx_leitura_dispositivo     on public.fato_leitura_agregada (dispositivo_id);
create index if not exists idx_leitura_tempo           on public.fato_leitura_agregada (tempo_id);
create index if not exists idx_leitura_tarifa          on public.fato_leitura_agregada (tarifa_id);
create index if not exists idx_leitura_registrado_em   on public.fato_leitura_agregada (registrado_em desc);
create index if not exists idx_leitura_disp_registrado on public.fato_leitura_agregada (dispositivo_id, registrado_em desc);

create index if not exists idx_evento_aparelho         on public.fato_evento_aparelho (aparelho_id);
create index if not exists idx_evento_dispositivo      on public.fato_evento_aparelho (dispositivo_id);
create index if not exists idx_evento_tempo            on public.fato_evento_aparelho (tempo_id);
create index if not exists idx_evento_registrado_em    on public.fato_evento_aparelho (registrado_em desc);
create index if not exists idx_evento_apar_registrado  on public.fato_evento_aparelho (aparelho_id, registrado_em desc);

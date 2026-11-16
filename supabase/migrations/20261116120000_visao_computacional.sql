-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Visão computacional (GS2)
--
-- Acrescenta ao Star Schema do CP3 o que a leitura por foto produz:
--
--   • fato_fatura ............. a conta de luz lida por foto. É um FATO porque
--                               é medida (kWh, R$) com grão mês × residência.
--                               Dela sai a tarifa_efetiva que converte o kWh do
--                               NILM em reais.
--   • dim_aparelho (+colunas) . os dados da etiqueta/placa. Entram na DIMENSÃO
--                               que já existe, e não numa tabela nova, porque
--                               cada linha de dim_aparelho JÁ É uma assinatura
--                               NILM: rotular a assinatura é preencher marca,
--                               modelo e potência da etiqueta nessa linha.
--   • log_extracao_visao ...... extraído vs. confirmado, por campo. É a fonte
--                               do indicador "taxa de acerto da leitura".
--
-- LGPD: nenhuma destas tabelas guarda imagem nem dado pessoal. Não há coluna
-- de nome, CPF, endereço ou número de instalação/cliente — a foto existe só em
-- memória durante a requisição, e o prompt proíbe o modelo de extrair isso.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── FATO: fatura lida por foto ───────────────────────────────────────────────

create table if not exists public.fato_fatura (
  id                      uuid primary key default gen_random_uuid(),
  usuario_id              uuid          not null references public.dim_usuario (id) on delete cascade,

  distribuidora           text,
  -- Mês de referência como 'YYYY-MM'. Não aponta para dim_tempo de propósito:
  -- dim_tempo tem grão HORÁRIO, e a fatura é mensal — a junção não existiria.
  mes_referencia          text          not null check (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  consumo_kwh             numeric(12,2) not null check (consumo_kwh > 0),
  valor_total             numeric(12,2) not null check (valor_total > 0),
  tarifa_kwh_sem_tributos numeric(10,5),
  -- Derivada no back-end: valor_total / consumo_kwh. É a tarifa que a pessoa
  -- paga de fato (com ICMS, PIS/COFINS, bandeira e iluminação pública).
  tarifa_efetiva          numeric(10,5) not null check (tarifa_efetiva > 0),

  -- Inclui escassez_hidrica, que dim_tarifa não tem: dim_tarifa modela a
  -- bandeira vigente do sistema, esta coluna registra o que ESTAVA impresso
  -- na conta daquele mês.
  bandeira                text          check (bandeira in ('verde', 'amarela', 'vermelha_1',
                                                            'vermelha_2', 'escassez_hidrica')),
  leitura_anterior        numeric(12,2),
  leitura_atual           numeric(12,2),

  origem                  text          not null default 'visao_computacional'
                            check (origem in ('visao_computacional', 'manual')),
  -- true quando a pessoa corrigiu algum campo antes de confirmar.
  editado_pelo_usuario    boolean       not null default false,

  created_at              timestamptz   not null default now(),

  -- Reescanear o mesmo mês corrige a fatura, não cria uma segunda.
  unique (usuario_id, mes_referencia)
);

comment on table public.fato_fatura is
  'Fatura de energia lida por visão computacional. Grão: residência x mes_referencia. Sem imagem e sem dado pessoal (LGPD).';
comment on column public.fato_fatura.tarifa_efetiva is
  'R$/kWh efetivamente pago = valor_total / consumo_kwh. Calculada no back-end, nunca pelo modelo de visão.';

create index if not exists idx_fatura_usuario on public.fato_fatura (usuario_id);
create index if not exists idx_fatura_usuario_mes
  on public.fato_fatura (usuario_id, mes_referencia desc);

-- ── DIMENSÃO: dados de etiqueta no aparelho já identificado pelo NILM ────────

alter table public.dim_aparelho
  add column if not exists marca                  text,
  add column if not exists modelo                 text,
  -- Separada de potencia_nominal_w de propósito: aquela é o degrau que o
  -- sensor enxerga (calibrado em campo), esta é o que a etiqueta declara. Ver
  -- as duas lado a lado é o que valida a identificação da assinatura.
  add column if not exists potencia_etiqueta_w    integer check (potencia_etiqueta_w > 0),
  add column if not exists tensao_v               integer check (tensao_v > 0),
  add column if not exists classe_eficiencia      text check (classe_eficiencia in
                                                     ('A','B','C','D','E','F','G')),
  add column if not exists consumo_kwh_mes_procel numeric(10,2) check (consumo_kwh_mes_procel >= 0),
  add column if not exists tipo_aparelho_visao    text,
  -- Marca o vínculo: esta assinatura NILM recebeu rótulo de uma etiqueta lida.
  add column if not exists rotulado_por_visao_em  timestamptz;

comment on column public.dim_aparelho.potencia_etiqueta_w is
  'Potência declarada na etiqueta/placa, lida por visão computacional. Compare com potencia_nominal_w (degrau medido pelo NILM).';
comment on column public.dim_aparelho.rotulado_por_visao_em is
  'Quando esta assinatura NILM foi vinculada a uma etiqueta lida por foto.';

-- ── LOG: extraído vs. confirmado (indicador de acerto) ───────────────────────

create table if not exists public.log_extracao_visao (
  id                 bigint generated always as identity primary key,
  usuario_id         uuid        not null references public.dim_usuario (id) on delete cascade,

  tipo               text        not null check (tipo in ('bill', 'label')),
  etapa              text        not null check (etapa in ('extracao', 'confirmacao')),

  provider           text        not null,
  modelo             text        not null,
  latencia_ms        integer     not null check (latencia_ms >= 0),
  -- Quantas vezes o JSON precisou ser pedido de novo (0 = acertou de primeira).
  tentativas_extra   smallint    not null default 0 check (tentativas_extra >= 0),

  -- Os campos técnicos lidos e os confirmados pela pessoa. Nunca a imagem,
  -- nunca dado pessoal: o que entra aqui é o mesmo JSON validado pelo zod,
  -- cujo schema não tem campo de nome, CPF, endereço ou instalação.
  campos_extraidos   jsonb       not null default '{}'::jsonb,
  campos_confirmados jsonb,
  -- Nomes dos campos que a pessoa corrigiu — a base da taxa de acerto.
  campos_corrigidos  text[]      not null default '{}',
  campos_comparados  smallint    not null default 0 check (campos_comparados >= 0),

  created_at         timestamptz not null default now()
);

comment on table public.log_extracao_visao is
  'Telemetria da leitura por foto: extraído vs. confirmado, latência, provider e modelo. Sem imagem e sem dado pessoal (LGPD).';

create index if not exists idx_log_visao_usuario on public.log_extracao_visao (usuario_id);
create index if not exists idx_log_visao_tipo_data
  on public.log_extracao_visao (tipo, created_at desc);

-- ── FUNÇÕES ──────────────────────────────────────────────────────────────────

-- Tarifa efetiva da fatura mais recente confirmada. Sem fatura, devolve vazio
-- e o back-end cai no fallback marcando tarifa_estimada = true.
create or replace function public.tarifa_da_fatura(p_usuario uuid)
returns table (
  tarifa_efetiva numeric,
  mes_referencia text,
  distribuidora  text,
  bandeira       text,
  consumo_kwh    numeric,
  valor_total    numeric,
  confirmada_em  timestamptz
)
language sql stable as $$
  select
    f.tarifa_efetiva,
    f.mes_referencia,
    f.distribuidora,
    f.bandeira,
    f.consumo_kwh,
    f.valor_total,
    f.created_at as confirmada_em
  from public.fato_fatura f
  where f.usuario_id = p_usuario
  order by f.mes_referencia desc, f.created_at desc
  limit 1;
$$;

-- Indicador "taxa de acerto da leitura": dos campos que a pessoa reviu, qual
-- fração ela NÃO precisou corrigir. Só linhas de etapa='confirmacao' contam —
-- extração sem confirmação não tem gabarito contra o que comparar.
create or replace function public.taxa_acerto_visao(
  p_usuario uuid default null,
  p_tipo    text default null
)
returns table (
  tipo               text,
  leituras           bigint,
  campos_comparados  bigint,
  campos_corrigidos  bigint,
  taxa_acerto_pct    numeric,
  latencia_media_ms  numeric
)
language sql stable as $$
  select
    l.tipo,
    count(*)::bigint                                          as leituras,
    coalesce(sum(l.campos_comparados), 0)::bigint             as campos_comparados,
    coalesce(sum(array_length(l.campos_corrigidos, 1)), 0)::bigint as campos_corrigidos,
    case
      when coalesce(sum(l.campos_comparados), 0) = 0 then null
      else round(
        100.0 * (sum(l.campos_comparados) - coalesce(sum(array_length(l.campos_corrigidos, 1)), 0))
        / sum(l.campos_comparados), 1)
    end                                                       as taxa_acerto_pct,
    round(avg(l.latencia_ms), 0)                              as latencia_media_ms
  from public.log_extracao_visao l
  where l.etapa = 'confirmacao'
    and (p_usuario is null or l.usuario_id = p_usuario)
    and (p_tipo    is null or l.tipo = p_tipo)
  group by l.tipo
  order by l.tipo;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Mesmo padrão das demais tabelas: o back-end usa a service_role (que contorna
-- RLS) e filtra por usuario_id na query; estas políticas protegem o acesso
-- direto via anon key.

alter table public.fato_fatura        enable row level security;
alter table public.log_extracao_visao enable row level security;

drop policy if exists fatura_do_usuario on public.fato_fatura;
create policy fatura_do_usuario on public.fato_fatura
  for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists log_visao_do_usuario on public.log_extracao_visao;
create policy log_visao_do_usuario on public.log_extracao_visao
  for select to authenticated using (usuario_id = auth.uid());

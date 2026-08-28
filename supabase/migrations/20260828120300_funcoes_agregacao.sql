-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Funções de agregação
-- A agregação roda no Postgres: o back-end não puxa 8.640 leituras por consulta.
-- ─────────────────────────────────────────────────────────────────────────────

-- Total de energia e custo de um dispositivo em um intervalo.
create or replace function public.resumo_periodo(
  p_dispositivo uuid,
  p_inicio      timestamptz,
  p_fim         timestamptz
)
returns table (total_kwh numeric, total_brl numeric, amostras bigint)
language sql stable as $$
  select
    coalesce(sum(energia_kwh), 0)::numeric        as total_kwh,
    coalesce(sum(custo_estimado_brl), 0)::numeric as total_brl,
    count(*)::bigint                              as amostras
  from public.fato_leitura_agregada
  where dispositivo_id = p_dispositivo
    and registrado_em >= p_inicio
    and registrado_em <  p_fim;
$$;

-- Curva agregada da casa por hora dentro de um intervalo (média de potência).
create or replace function public.serie_por_hora(
  p_dispositivo uuid,
  p_inicio      timestamptz,
  p_fim         timestamptz
)
returns table (hora integer, potencia_media_w numeric)
language sql stable as $$
  select
    t.hora::integer                            as hora,
    round(avg(f.potencia_instantanea_w), 1)    as potencia_media_w
  from public.fato_leitura_agregada f
  join public.dim_tempo t on t.id = f.tempo_id
  where f.dispositivo_id = p_dispositivo
    and f.registrado_em >= p_inicio
    and f.registrado_em <  p_fim
  group by t.hora
  order by t.hora;
$$;

-- Custo e energia por aparelho no intervalo (soma dos ciclos concluídos).
create or replace function public.custo_por_aparelho(
  p_usuario uuid,
  p_inicio  timestamptz,
  p_fim     timestamptz
)
returns table (
  aparelho_id        uuid,
  nome               text,
  categoria          text,
  potencia_nominal_w integer,
  custo_brl          numeric,
  energia_kwh        numeric,
  horas_ativas       numeric,
  ciclos             bigint
)
language sql stable as $$
  select
    a.id                                            as aparelho_id,
    a.nome,
    a.categoria,
    a.potencia_nominal_w,
    coalesce(sum(e.custo_brl), 0)::numeric          as custo_brl,
    coalesce(sum(e.energia_kwh), 0)::numeric        as energia_kwh,
    round(coalesce(sum(e.duracao_minutos), 0) / 60.0, 2)::numeric as horas_ativas,
    count(e.id)::bigint                             as ciclos
  from public.dim_aparelho a
  left join public.fato_evento_aparelho e
    on e.aparelho_id = a.id
   and e.tipo_evento = 'desligou'
   and e.registrado_em >= p_inicio
   and e.registrado_em <  p_fim
  where a.usuario_id = p_usuario
  group by a.id, a.nome, a.categoria, a.potencia_nominal_w
  order by custo_brl desc;
$$;

-- Curva de 24h de um aparelho específico (potência média por hora).
create or replace function public.serie_aparelho_por_hora(
  p_aparelho uuid,
  p_inicio   timestamptz,
  p_fim      timestamptz
)
returns table (hora integer, potencia_media_w numeric)
language sql stable as $$
  select
    t.hora::integer                                            as hora,
    round(avg(e.potencia_w) * greatest(count(e.id), 1) / 4.0, 1) as potencia_media_w
  from public.fato_evento_aparelho e
  join public.dim_tempo t on t.id = e.tempo_id
  where e.aparelho_id = p_aparelho
    and e.tipo_evento = 'ligou'
    and e.registrado_em >= p_inicio
    and e.registrado_em <  p_fim
  group by t.hora
  order by t.hora;
$$;

-- Custo mensal consolidado dos últimos N meses (para tendência e economia).
create or replace function public.custo_mensal(
  p_dispositivo uuid,
  p_meses       integer default 6
)
returns table (ano integer, mes integer, total_brl numeric, total_kwh numeric)
language sql stable as $$
  select
    t.ano::integer,
    t.mes::integer,
    round(sum(f.custo_estimado_brl), 2)::numeric as total_brl,
    round(sum(f.energia_kwh), 2)::numeric        as total_kwh
  from public.fato_leitura_agregada f
  join public.dim_tempo t on t.id = f.tempo_id
  where f.dispositivo_id = p_dispositivo
    and f.registrado_em >= date_trunc('month', now()) - make_interval(months => p_meses)
  group by t.ano, t.mes
  order by t.ano, t.mes;
$$;

-- Estado atual de cada aparelho: ligado/desligado conforme o último evento.
create or replace function public.estado_aparelhos(p_usuario uuid)
returns table (
  aparelho_id     uuid,
  nome            text,
  ultimo_evento   text,
  potencia_w      numeric,
  registrado_em   timestamptz
)
language sql stable as $$
  select distinct on (a.id)
    a.id            as aparelho_id,
    a.nome,
    e.tipo_evento   as ultimo_evento,
    e.potencia_w,
    e.registrado_em
  from public.dim_aparelho a
  left join public.fato_evento_aparelho e on e.aparelho_id = a.id
  where a.usuario_id = p_usuario
  order by a.id, e.registrado_em desc nulls last;
$$;

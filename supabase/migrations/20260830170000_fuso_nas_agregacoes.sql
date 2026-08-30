-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Correção de fuso nas agregações
--
-- dim_tempo guarda a hora em UTC, mas o produto raciocina em horário de
-- Brasília: as janelas de "hoje" e "mês" no back-end são UTC-3, e o eixo do
-- gráfico de 24h é rotulado em hora local.
--
-- Agrupar por dim_tempo.hora devolvia a hora UTC com rótulo local, o que
-- deslocava a curva de consumo em 3 horas (o pico das 20h aparecia às 23h).
-- O mesmo desalinhamento fazia o total do mês no histórico divergir do total
-- do ciclo por algumas horas de leitura.
--
-- As agregações passam a derivar hora, ano e mês do próprio registrado_em
-- convertido para America/Sao_Paulo.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.serie_por_hora(
  p_dispositivo uuid,
  p_inicio      timestamptz,
  p_fim         timestamptz
)
returns table (hora integer, potencia_media_w numeric)
language sql stable as $$
  select
    extract(hour from f.registrado_em at time zone 'America/Sao_Paulo')::integer as hora,
    round(avg(f.potencia_instantanea_w), 1)                                      as potencia_media_w
  from public.fato_leitura_agregada f
  where f.dispositivo_id = p_dispositivo
    and f.registrado_em >= p_inicio
    and f.registrado_em <  p_fim
  group by 1
  order by 1;
$$;

create or replace function public.serie_aparelho_por_hora(
  p_aparelho uuid,
  p_inicio   timestamptz,
  p_fim      timestamptz
)
returns table (hora integer, potencia_media_w numeric)
language sql stable as $$
  select
    extract(hour from e.registrado_em at time zone 'America/Sao_Paulo')::integer as hora,
    round(avg(e.potencia_w) * greatest(count(e.id), 1) / 4.0, 1)                 as potencia_media_w
  from public.fato_evento_aparelho e
  where e.aparelho_id = p_aparelho
    and e.tipo_evento = 'ligou'
    and e.registrado_em >= p_inicio
    and e.registrado_em <  p_fim
  group by 1
  order by 1;
$$;

create or replace function public.custo_mensal(
  p_dispositivo uuid,
  p_meses       integer default 6
)
returns table (ano integer, mes integer, total_brl numeric, total_kwh numeric)
language sql stable as $$
  select
    extract(year  from f.registrado_em at time zone 'America/Sao_Paulo')::integer as ano,
    extract(month from f.registrado_em at time zone 'America/Sao_Paulo')::integer as mes,
    round(sum(f.custo_estimado_brl), 2)::numeric                                  as total_brl,
    round(sum(f.energia_kwh), 2)::numeric                                         as total_kwh
  from public.fato_leitura_agregada f
  where f.dispositivo_id = p_dispositivo
    and f.registrado_em >= date_trunc('month', now()) - make_interval(months => p_meses)
  group by 1, 2
  order by 1, 2;
$$;

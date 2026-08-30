-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Curva de 24h do aparelho por tempo ligado
--
-- A versão anterior calculava a potência média da hora como
--   avg(potencia_w) * count(eventos) / 4
-- o que não representa nada físico: os eventos 'ligou' são esparsos (o
-- ar-condicionado liga UMA vez às 20h), então um aparelho de 1.080 W aparecia
-- no gráfico com 270 W.
--
-- Agora a hora é preenchida pelo tempo em que o aparelho ficou de fato ligado:
-- cada ciclo ligou->desligou é intersectado com cada bucket de 1 hora, e a
-- energia da interseção dá a potência média daquela hora (bucket de 1 h, logo
-- Wh = W médio).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.serie_aparelho_por_hora(
  p_aparelho uuid,
  p_inicio   timestamptz,
  p_fim      timestamptz
)
returns table (hora integer, potencia_media_w numeric)
language sql stable as $$
  with eventos as (
    select
      e.tipo_evento,
      e.potencia_w,
      e.registrado_em,
      lead(e.registrado_em) over (order by e.registrado_em) as proximo
    from public.fato_evento_aparelho e
    where e.aparelho_id = p_aparelho
      -- um dia a mais para trás: um ciclo pode ter começado antes da janela
      and e.registrado_em >= p_inicio - interval '1 day'
      and e.registrado_em <  p_fim
  ),
  ligados as (
    select
      registrado_em            as inicio,
      coalesce(proximo, p_fim) as fim,
      potencia_w
    from eventos
    where tipo_evento = 'ligou'
  ),
  horas as (
    select generate_series(
      date_trunc('hour', p_inicio),
      date_trunc('hour', p_fim - interval '1 second'),
      interval '1 hour'
    ) as ini
  ),
  por_hora as (
    select
      h.ini,
      coalesce(sum(
        extract(epoch from (
          least(l.fim, h.ini + interval '1 hour') - greatest(l.inicio, h.ini)
        )) / 3600.0 * l.potencia_w
      ), 0) as wh
    from horas h
    left join ligados l
      on l.inicio < h.ini + interval '1 hour'
     and l.fim    > h.ini
    group by h.ini
  )
  select
    extract(hour from ini at time zone 'America/Sao_Paulo')::integer as hora,
    round(avg(wh), 1)                                                as potencia_media_w
  from por_hora
  group by 1
  order by 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Saúde de detecção por aparelho
--
-- Um limiar fixo de "sem leitura" gera alerta falso: a geladeira cicla a cada
-- ~40 min, o ar-condicionado só liga à noite e a máquina de lavar roda 4x por
-- semana. Um silêncio de 15 h é normal para um e crítico para outro.
--
-- Esta função devolve, por aparelho, o intervalo p90 entre eventos nos últimos
-- 14 dias. O back-end compara o silêncio atual contra o ritmo do próprio
-- aparelho, em vez de contra um número mágico.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.saude_aparelhos(p_usuario uuid)
returns table (
  aparelho_id      uuid,
  ultimo_evento_em timestamptz,
  gap_p90_min      numeric,
  eventos_14d      bigint
)
language sql stable as $$
  with eventos as (
    select
      e.aparelho_id,
      e.registrado_em,
      extract(epoch from (
        e.registrado_em - lag(e.registrado_em) over (
          partition by e.aparelho_id order by e.registrado_em
        )
      )) / 60.0 as gap_min
    from public.fato_evento_aparelho e
    join public.dim_aparelho a on a.id = e.aparelho_id
    where a.usuario_id = p_usuario
      and e.registrado_em >= now() - interval '14 days'
  )
  select
    a.id                                                    as aparelho_id,
    max(e.registrado_em)                                    as ultimo_evento_em,
    coalesce(
      percentile_cont(0.9) within group (order by e.gap_min),
      0
    )::numeric                                              as gap_p90_min,
    count(e.registrado_em)::bigint                          as eventos_14d
  from public.dim_aparelho a
  left join eventos e on e.aparelho_id = a.id
  where a.usuario_id = p_usuario
  group by a.id;
$$;

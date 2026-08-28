-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Carga das dimensões de referência (tarifa e plano).
-- Valores validados nas pesquisas de campo das fases anteriores:
--   tarifa de referência R$ 0,85/kWh · bandeira amarela.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.dim_tarifa
  (concessionaria, uf, tarifa_kwh, bandeira, adicional_bandeira, vigencia_inicio, vigencia_fim)
select 'Enel SP', 'SP', 0.85000, 'amarela', 0.01885, date '2026-01-01', null
where not exists (
  select 1 from public.dim_tarifa
  where concessionaria = 'Enel SP' and bandeira = 'amarela' and vigencia_fim is null
);

insert into public.dim_plano (nome, preco_mensal, recursos)
select 'Free', 0.00, '[
  "Identificação de aparelhos por NILM",
  "Custos em R$ (não em kWh)",
  "Dashboard e alertas em tempo real",
  "Relatório mensal básico"
]'::jsonb
where not exists (select 1 from public.dim_plano where nome = 'Free');

insert into public.dim_plano (nome, preco_mensal, recursos)
select 'Pro', 19.90, '[
  "Tudo do plano Free",
  "Recomendações de ROI por aparelho",
  "Detalhe individual de cada aparelho",
  "Histórico estendido e exportação"
]'::jsonb
where not exists (select 1 from public.dim_plano where nome = 'Pro');

-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Ingestão idempotente de eventos
--
-- fato_leitura_agregada já era idempotente por unique (dispositivo_id,
-- registrado_em): reenviar a mesma leitura não duplica linha.
--
-- fato_evento_aparelho não tinha essa proteção. Reprocessar uma janela
-- (simulador em modo batch rodado duas vezes, ou o ESP32 reenviando um buffer
-- após queda de rede) fazia o NILM redetectar os mesmos degraus e inserir os
-- eventos de novo — dobrando o custo apurado por aparelho.
--
-- O mesmo aparelho, no mesmo instante, com o mesmo tipo de transição É o mesmo
-- evento. A chave natural passa a ser única.
-- ─────────────────────────────────────────────────────────────────────────────

create unique index if not exists uq_evento_aparelho_instante
  on public.fato_evento_aparelho (aparelho_id, registrado_em, tipo_evento);

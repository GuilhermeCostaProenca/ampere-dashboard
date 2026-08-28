-- ─────────────────────────────────────────────────────────────────────────────
-- AMPERÊ — Row Level Security
-- Cada usuário só enxerga os próprios dados. dim_tempo, dim_tarifa e dim_plano
-- são tabelas de referência: leitura liberada para qualquer autenticado.
--
-- OBS: o back-end usa a service_role key, que por definição contorna RLS.
-- O escopo por usuário no back-end é feito na query (usuario_id = req.user.id).
-- Estas políticas protegem o acesso direto ao Postgres/PostgREST com anon key.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.dim_usuario            enable row level security;
alter table public.dim_dispositivo        enable row level security;
alter table public.dim_aparelho           enable row level security;
alter table public.dim_tempo              enable row level security;
alter table public.dim_tarifa             enable row level security;
alter table public.dim_plano              enable row level security;
alter table public.fato_leitura_agregada  enable row level security;
alter table public.fato_evento_aparelho   enable row level security;

-- ── dim_usuario ──────────────────────────────────────────────────────────────
drop policy if exists usuario_le_proprio on public.dim_usuario;
create policy usuario_le_proprio on public.dim_usuario
  for select to authenticated using (id = auth.uid());

drop policy if exists usuario_atualiza_proprio on public.dim_usuario;
create policy usuario_atualiza_proprio on public.dim_usuario
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── dim_dispositivo ──────────────────────────────────────────────────────────
drop policy if exists dispositivo_do_usuario on public.dim_dispositivo;
create policy dispositivo_do_usuario on public.dim_dispositivo
  for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── dim_aparelho ─────────────────────────────────────────────────────────────
drop policy if exists aparelho_do_usuario on public.dim_aparelho;
create policy aparelho_do_usuario on public.dim_aparelho
  for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── Tabelas de referência (somente leitura) ──────────────────────────────────
drop policy if exists tempo_leitura_publica on public.dim_tempo;
create policy tempo_leitura_publica on public.dim_tempo
  for select to authenticated using (true);

drop policy if exists tarifa_leitura_publica on public.dim_tarifa;
create policy tarifa_leitura_publica on public.dim_tarifa
  for select to authenticated using (true);

drop policy if exists plano_leitura_publica on public.dim_plano;
create policy plano_leitura_publica on public.dim_plano
  for select to authenticated using (true);

-- ── fato_leitura_agregada ────────────────────────────────────────────────────
drop policy if exists leitura_do_usuario on public.fato_leitura_agregada;
create policy leitura_do_usuario on public.fato_leitura_agregada
  for select to authenticated using (
    exists (
      select 1 from public.dim_dispositivo d
      where d.id = fato_leitura_agregada.dispositivo_id
        and d.usuario_id = auth.uid()
    )
  );

-- ── fato_evento_aparelho ─────────────────────────────────────────────────────
drop policy if exists evento_do_usuario on public.fato_evento_aparelho;
create policy evento_do_usuario on public.fato_evento_aparelho
  for select to authenticated using (
    exists (
      select 1 from public.dim_aparelho a
      where a.id = fato_evento_aparelho.aparelho_id
        and a.usuario_id = auth.uid()
    )
  );

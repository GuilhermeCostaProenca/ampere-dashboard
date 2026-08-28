import { db } from '../lib/supabase.js'
import { naoEncontrado } from '../lib/errors.js'

export interface Dispositivo {
  id: string
  usuario_id: string
  apelido: string
  status_conexao: 'online' | 'offline' | 'sem_sinal'
  versao_firmware: string
  sinal_wifi: number | null
  ultimo_contato: string | null
}

/** Dispositivo principal do usuario (o protótipo assume 1 sensor por conta). */
export async function dispositivoDoUsuario(usuarioId: string): Promise<Dispositivo> {
  const { data, error } = await db
    .from('dim_dispositivo')
    .select('id, usuario_id, apelido, status_conexao, versao_firmware, sinal_wifi, ultimo_contato')
    .eq('usuario_id', usuarioId)
    .order('id')
    .limit(1)
    .maybeSingle()

  if (error || !data) throw naoEncontrado('Nenhum sensor vinculado a esta conta')
  return data as Dispositivo
}

/** Ultima leitura agregada: o "consumo agora" do dashboard. */
export async function ultimaLeitura(dispositivoId: string) {
  const { data } = await db
    .from('fato_leitura_agregada')
    .select('potencia_instantanea_w, registrado_em')
    .eq('dispositivo_id', dispositivoId)
    .order('registrado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { potencia_w: 0, registrado_em: null as string | null }
  return {
    potencia_w: Number(data.potencia_instantanea_w),
    registrado_em: data.registrado_em as string,
  }
}

/** Estado atual (ligado/desligado) de cada aparelho, pelo ultimo evento. */
export async function estadoAparelhos(usuarioId: string) {
  const { data } = await db.rpc('estado_aparelhos', { p_usuario: usuarioId })
  const mapa = new Map<
    string,
    { status: 'on' | 'off' | 'no-signal'; potencia_w: number; registrado_em: string | null }
  >()

  for (const linha of (data ?? []) as any[]) {
    const semEventos = !linha.ultimo_evento
    const status: 'on' | 'off' | 'no-signal' = semEventos
      ? 'no-signal'
      : linha.ultimo_evento === 'ligou'
        ? 'on'
        : 'off'
    mapa.set(linha.aparelho_id, {
      status,
      potencia_w: status === 'on' ? Number(linha.potencia_w ?? 0) : 0,
      registrado_em: linha.registrado_em ?? null,
    })
  }
  return mapa
}

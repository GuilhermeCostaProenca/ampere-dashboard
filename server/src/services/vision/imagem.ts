// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Pré-processamento da foto
//
// Uma foto de celular chega com 4 MB, 4000 px e orientação só no EXIF. Mandar
// isso direto para o modelo custa token, custa latência e, pior, costuma vir
// de lado — o que derruba a leitura de números. As três etapas aqui resolvem
// isso e são medidas uma a uma, porque a latência do pipeline é o número que
// mais aparece na demo.
//
// A imagem NUNCA toca o disco e NUNCA vai para o banco: existe como Buffer
// durante a requisição e é coletada pelo GC quando ela termina.
// ─────────────────────────────────────────────────────────────────────────────

import sharp from 'sharp'
import { ErroVisao } from './types.js'
import type { ImagemProcessada } from './types.js'

/** Qualidade do JPEG de saída: 85 mantém dígito pequeno legível. */
const QUALIDADE_JPEG = 85

export interface OpcoesPreparo {
  /** Lado maior da imagem de saída, em px. */
  maxLadoPx?: number
  /** Nome do rótulo nos logs de duração (ex.: "fatura"). */
  rotulo?: string
}

/**
 * Normaliza a foto para o modelo: corrige rotação pelo EXIF, reduz o lado
 * maior e converte para JPEG.
 *
 * `rotate()` sem argumento é o que lê o EXIF — com argumento ele gira um
 * ângulo fixo, que é justamente o que não queremos.
 */
export async function prepararImagem(
  original: Buffer,
  { maxLadoPx = 1600, rotulo = 'imagem' }: OpcoesPreparo = {},
): Promise<ImagemProcessada> {
  const t0 = performance.now()

  let metadados: sharp.Metadata
  try {
    metadados = await sharp(original).metadata()
  } catch (e) {
    throw erroDeDecodificacao(e)
  }
  const leituraMs = performance.now() - t0

  const t1 = performance.now()
  let buffer: Buffer
  let info: sharp.OutputInfo
  try {
    const resultado = await sharp(original)
      .rotate() // corrige a orientação a partir do EXIF
      .resize({
        width: maxLadoPx,
        height: maxLadoPx,
        fit: 'inside',
        withoutEnlargement: true, // foto pequena não é esticada
      })
      .jpeg({ quality: QUALIDADE_JPEG, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
    buffer = resultado.data
    info = resultado.info
  } catch (e) {
    throw erroDeDecodificacao(e)
  }
  const preparoMs = performance.now() - t1

  const img: ImagemProcessada = {
    buffer,
    mime: 'image/jpeg',
    largura: info.width,
    altura: info.height,
    bytes: buffer.byteLength,
    duracoes: {
      leitura_ms: Number(leituraMs.toFixed(1)),
      preparo_ms: Number(preparoMs.toFixed(1)),
    },
  }

  console.log(
    `[amperê/visão] preparo ${rotulo}: ${metadados.format ?? '?'} ` +
      `${metadados.width ?? '?'}x${metadados.height ?? '?'} ` +
      `(${(original.byteLength / 1024).toFixed(0)} kB) → jpeg ${img.largura}x${img.altura} ` +
      `(${(img.bytes / 1024).toFixed(0)} kB) · leitura ${img.duracoes.leitura_ms}ms · ` +
      `preparo ${img.duracoes.preparo_ms}ms`,
  )

  return img
}

/**
 * HEIC é o caso real: o binário pré-compilado do sharp não traz o decodificador
 * (licenciamento do libheif), então foto tirada em iPhone com "Alta eficiência"
 * falha aqui. A mensagem precisa dizer o que fazer, não só que falhou.
 */
function erroDeDecodificacao(causa: unknown): ErroVisao {
  const detalhe = causa instanceof Error ? causa.message : String(causa)
  const ehHeic = /heif|heic|unsupported image format/i.test(detalhe)

  return new ErroVisao(
    415,
    'imagem_nao_suportada',
    ehHeic
      ? 'Este servidor não decodifica HEIC. No iPhone, troque Ajustes › Câmera › Formatos para "Mais compatível", ou envie a foto como JPEG.'
      : 'Não foi possível ler esta imagem. Tente novamente com uma foto em JPEG ou PNG.',
    detalhe,
  )
}

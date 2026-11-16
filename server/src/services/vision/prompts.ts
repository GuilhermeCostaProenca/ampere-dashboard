// ─────────────────────────────────────────────────────────────────────────────
// AMPERÊ — Prompts da extração
//
// A instrução de LGPD é a primeira coisa que o modelo lê, e é imperativa: ele
// é proibido de extrair nome, CPF, endereço e número de instalação. Isso vale
// como primeira barreira (o modelo não devolve), somada à segunda (o zod faz
// strip dos campos extras) e à terceira (a imagem nunca é persistida).
//
// O JSON é pedido com "só o objeto, sem texto antes ou depois" porque é mais
// barato tratar um modelo que obedece do que escrever um parser tolerante.
// ─────────────────────────────────────────────────────────────────────────────

const LGPD = `REGRA OBRIGATÓRIA DE PRIVACIDADE (LGPD):
NÃO extraia, NÃO transcreva e NÃO mencione nenhum dado pessoal. Em especial:
nome do titular, CPF/CNPJ, endereço, CEP, número de instalação, número do
cliente, número do medidor, código de barras, linha digitável ou telefone.
Se um desses dados aparecer na imagem, ignore-o por completo. Devolva APENAS
os campos técnicos pedidos no JSON abaixo.`

const FORMATO = `Responda SOMENTE com o objeto JSON, sem texto antes ou depois,
sem cercas de código (\`\`\`) e sem comentários. Campo que você não conseguir
ler com segurança deve vir como null — nunca invente, nunca estime.`

export const PROMPT_FATURA = `Você analisa a foto de uma fatura de energia elétrica residencial brasileira.

${LGPD}

Extraia os campos abaixo e devolva neste formato exato:

{
  "distribuidora": string | null,            // nome da concessionária (ex.: "Enel SP", "CPFL Paulista", "Light")
  "mes_referencia": string | null,           // mês de referência no formato "YYYY-MM"
  "consumo_kwh": number | null,              // consumo faturado do mês, em kWh
  "valor_total": number | null,              // TOTAL A PAGAR da fatura, em reais
  "tarifa_kwh_sem_tributos": number | null,  // tarifa unitária impressa na conta, em R$/kWh
  "bandeira": string | null,                 // "verde" | "amarela" | "vermelha_1" | "vermelha_2" | "escassez_hidrica"
  "leitura_anterior": number | null,         // leitura anterior do medidor, em kWh
  "leitura_atual": number | null,            // leitura atual do medidor, em kWh
  "confianca": {                             // 0 a 1, quanto você confia em CADA campo que leu
    "distribuidora": number,
    "mes_referencia": number,
    "consumo_kwh": number,
    "valor_total": number,
    "tarifa_kwh_sem_tributos": number,
    "bandeira": number,
    "leitura_anterior": number,
    "leitura_atual": number
  }
}

Orientações:
- "valor_total" é o valor final a pagar, não o subtotal de um item.
- Números em formato brasileiro ("1.234,56") podem ser devolvidos como string;
  não arredonde e não converta de moeda.
- NÃO calcule a tarifa efetiva: isso é feito fora daqui.
- Dê confiança baixa (< 0.5) em campo lido de área borrada, cortada ou com reflexo.

${FORMATO}`

export const PROMPT_ETIQUETA = `Você analisa a foto da etiqueta/placa de identificação de um eletrodoméstico
(pode ser a placa do fabricante ou a Etiqueta Nacional de Conservação de
Energia — ENCE/Procel/INMETRO).

${LGPD}

Extraia os campos abaixo e devolva neste formato exato:

{
  "tipo_aparelho": string,                     // "geladeira" | "chuveiro" | "ar_condicionado" | "micro_ondas" | "maquina_lavar" | "tv" | "airfryer" | "ferro" | "outro"
  "marca": string | null,                      // fabricante (ex.: "Brastemp", "Electrolux")
  "modelo": string | null,                     // código do modelo (ex.: "BRM54HK")
  "potencia_w": number | null,                 // potência nominal em WATTS (converta de kW se preciso)
  "tensao_v": number | null,                   // tensão em volts (110, 127, 220 ou 240)
  "consumo_kwh_mes_procel": number | null,     // consumo mensal declarado na etiqueta ENCE/Procel, em kWh/mês
  "classe_eficiencia": string | null,          // letra de "A" a "G" da etiqueta ENCE
  "confianca": {                               // 0 a 1, quanto você confia em CADA campo que leu
    "tipo_aparelho": number,
    "marca": number,
    "modelo": number,
    "potencia_w": number,
    "tensao_v": number,
    "consumo_kwh_mes_procel": number,
    "classe_eficiencia": number
  }
}

Orientações:
- Potência: se a etiqueta trouxer só "1,5 kW", devolva 1500. Se trouxer faixa
  ("4400/5500 W" em chuveiro), devolva o maior valor (posição inverno).
- Se só houver corrente (A) e tensão (V), multiplique: potencia_w = A × V.
- "consumo_kwh_mes_procel" só existe em etiqueta ENCE/Procel. Sem ela, null.
- "tipo_aparelho" nunca é null: quando não der para saber, use "outro".
- Dê confiança baixa (< 0.5) em campo lido de área borrada, cortada ou com reflexo.

${FORMATO}`

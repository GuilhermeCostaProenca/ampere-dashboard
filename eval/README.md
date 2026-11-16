# Avaliação da visão computacional

Este diretório guarda os casos de teste usados por `scripts/eval-vision.ts` para
medir a **taxa de acerto da leitura** — o indicador do módulo de visão.

```bash
cd server
npm run eval:vision                              # fatura + etiqueta
npm run eval:vision -- --tipo=bill               # só faturas
npm run eval:vision -- --repeticoes=3            # 3 leituras por imagem
```

> O script chama o modelo de visão de verdade. Cada execução consome créditos
> da chave em `server/.env`.

## O que NÃO entra no repositório

**Fotos reais de contas de luz não são versionadas.** `.gitignore` bloqueia as
imagens deste diretório: uma fatura traz nome, CPF, endereço e número de
instalação, e isso não pode ir para o Git mesmo em repositório privado.

Os arquivos `.json` de gabarito **são** versionados — eles só têm os campos
técnicos, que é exatamente o que o módulo extrai.

Para avaliar com contas reais, copie as fotos para `eval/bills/` na sua máquina
e escreva o gabarito ao lado. Elas ficam só aí.

## Formato

Cada caso são **dois arquivos de mesmo nome**: a imagem e o gabarito.

```
eval/
  bills/
    enel-sp-2026-10.jpg      ← a foto (não versionada)
    enel-sp-2026-10.json     ← o gabarito (versionado)
  labels/
    electrolux-vi12f.jpg
    electrolux-vi12f.json
```

Extensões aceitas para a imagem: `.jpg`, `.jpeg`, `.png`, `.webp`.
Imagem sem gabarito ao lado é ignorada, com aviso.

### Gabarito de fatura — `eval/bills/*.json`

Todos os campos são opcionais: o que você não preencher (ou deixar `null`) e o
módulo também não ler **não conta** nem como acerto nem como erro. Preencha só
o que está legível na foto.

```json
{
  "distribuidora": "Enel SP",
  "mes_referencia": "2026-10",
  "consumo_kwh": 312,
  "valor_total": 287.43,
  "tarifa_kwh_sem_tributos": 0.62,
  "bandeira": "vermelha_1",
  "leitura_anterior": 15230,
  "leitura_atual": 15542
}
```

| campo | tipo | observação |
| --- | --- | --- |
| `distribuidora` | texto \| null | nome da concessionária |
| `mes_referencia` | `"YYYY-MM"` \| null | `"11/2026"` também é aceito e normalizado |
| `consumo_kwh` | número \| null | consumo faturado do mês |
| `valor_total` | número \| null | **total a pagar**, não o subtotal de um item |
| `tarifa_kwh_sem_tributos` | número \| null | a tarifa impressa na conta |
| `bandeira` | `verde` · `amarela` · `vermelha_1` · `vermelha_2` · `escassez_hidrica` \| null | |
| `leitura_anterior` | número \| null | leitura do medidor |
| `leitura_atual` | número \| null | leitura do medidor |

Números podem ser escritos como texto em formato brasileiro (`"287,43"`): o
gabarito passa pelo mesmo normalizador da extração antes de ser comparado.

`tarifa_efetiva` **não** vai no gabarito — ela é derivada
(`valor_total / consumo_kwh`), não extraída, então não há o que avaliar ali.

### Gabarito de etiqueta — `eval/labels/*.json`

```json
{
  "tipo_aparelho": "ar_condicionado",
  "marca": "Electrolux",
  "modelo": "VI12F",
  "potencia_w": 1050,
  "tensao_v": 220,
  "consumo_kwh_mes_procel": 39.5,
  "classe_eficiencia": "A"
}
```

| campo | tipo | observação |
| --- | --- | --- |
| `tipo_aparelho` | `geladeira` · `chuveiro` · `ar_condicionado` · `micro_ondas` · `maquina_lavar` · `tv` · `airfryer` · `ferro` · `outro` | |
| `marca` | texto \| null | |
| `modelo` | texto \| null | |
| `potencia_w` | número \| null | em **watts**; converta de kW |
| `tensao_v` | número \| null | |
| `consumo_kwh_mes_procel` | número \| null | só existe em etiqueta ENCE/Procel |
| `classe_eficiencia` | `A`–`G` \| null | |

## Como o acerto é medido

O mesmo critério de `server/src/services/vision/comparacao.ts`, para o número do
vídeo e o número do banco medirem a mesma coisa:

- **texto** → match exato depois de normalizar caixa, acento e espaço
  (`"Enel SP"` = `"enel sp"`);
- **número** → tolerância de **±1%** (`312` bate com `314`, não com `330`);
- **nulo dos dois lados** → não conta;
- **nulo de um lado só** → erro (na prática, alguém teve de digitar).

A saída traz acurácia por campo, latência média e p95, quantas leituras
precisaram de uma segunda tentativa, e a taxa de acerto geral.

## Montando um conjunto sem conta real

Para testar o pipeline sem foto de fatura de verdade, serve qualquer conta de
luz de exemplo publicada pelas distribuidoras (elas publicam modelos de fatura
com dados fictícios em seus sites de atendimento). Fotografe ou salve a imagem,
escreva o gabarito e rode o eval normalmente.

# Fontes do TCC — números de mercado e concorrentes

Material de apoio, não entra no PDF. Cada número aqui foi lido na fonte primária,
não em notícia de segunda mão, e é o que sustenta as seções 5 (Mercado-alvo) e
6 (Análise de mercado) do documento.

---

## 1. Mercado residencial de energia elétrica no Brasil

**Fonte:** EMPRESA DE PESQUISA ENERGÉTICA (EPE). *Mercado de energia elétrica:
resultados de 2025, 2º trimestre*. Rio de Janeiro: EPE, Superintendência de
Estudos Econômicos e Energéticos, set. 2025.

Lido do PDF da apresentação, com `pdftotext -layout`. A própria publicação cita
como origem dos dados a série "Consumo mensal de energia elétrica por classe,
regiões e subsistemas" da EPE.

### Número de consumidores residenciais (junho de cada ano)

| Região | jun/2024 | jun/2025 | Δ abs. | Δ % |
| --- | ---: | ---: | ---: | ---: |
| Norte | 5.334.350 | 5.476.536 | +142.186 | +2,7 |
| Nordeste | 22.311.428 | 22.872.318 | +560.890 | +2,5 |
| Sudeste | 36.367.424 | 36.801.294 | +433.870 | +1,2 |
| Sul | 11.468.866 | 11.771.344 | +302.478 | +2,6 |
| Centro-Oeste | 6.361.663 | 6.549.028 | +187.365 | +2,9 |
| **Brasil** | **81.843.731** | **83.470.520** | **+1.626.789** | **+2,0** |

A soma das cinco regiões fecha exatamente com o total do Brasil — conferido.

Crescimento do número de consumidores: 3,3% a.a. no período 2010–2014 e
2,2% a.a. em 2015–2025.

### Consumo Residencial Médio (CRM), em kWh/mês — mês base junho

| Região | 2024 | 2025 | Δ % |
| --- | ---: | ---: | ---: |
| Norte | 216,8 | 217,1 | +0,2 |
| Nordeste | 135,7 | 134,9 | −0,6 |
| Sudeste | 183,9 | 182,8 | −0,6 |
| Sul | 205,9 | 209,8 | +1,9 |
| Centro-Oeste | 215,6 | 214,4 | −0,5 |
| **Brasil** | **178,6** | **178,2** | **−0,2** |

A publicação atribui a leve retração a clima mais ameno, que reduziu a
necessidade de climatização.

### Consumo da classe residencial (GWh)

| Período | 2024 | 2025 | Δ % |
| --- | ---: | ---: | ---: |
| 1º trimestre | 46.265 | 47.822 | +3,4 |
| 2º trimestre | 43.760 | 43.039 | −1,6 |
| **1º semestre** | **90.024** | **90.861** | **+0,9** |

Participação da classe residencial no consumo total do país: **31,0%**
(consumo total do 1º semestre de 2025: 282.983 GWh).

### Derivações nossas (não são números da EPE — marcar como cálculo próprio)

- Conta média nacional implícita: 178,2 kWh/mês × R$ 0,86885/kWh ≈ **R$ 154,80/mês**.
  A tarifa é a do nosso projeto (R$ 0,85 + bandeira amarela), não uma tarifa média
  da EPE. Serve para mostrar que a âncora de R$ 187 das nossas pesquisas de campo
  corresponde a um consumo acima da média nacional — coerente com o perfil-alvo
  (conta entre R$ 150 e R$ 400).
- Mercado residencial anualizado: 90.861 GWh × 2 ≈ 181.700 GWh/ano; a
  R$ 0,86885/kWh dá ordem de **R$ 158 bilhões/ano**. É estimativa de ordem de
  grandeza, com a mesma ressalva da tarifa.
- Sudeste + Sul + Centro-Oeste somam **55.121.666** consumidores residenciais
  (jun/2025) e são as três regiões com CRM acima da média nacional — base
  defensável para o recorte geográfico do mercado endereçável.

---

## 2. Concorrentes e substitutos

Levantamento por consulta a varejo e a material de fabricante em **novembro de
2026**. Preços de listagem mudam; no documento vão com a data da consulta.

| Categoria | Exemplo | Preço consultado | Como mede | Limite |
| --- | --- | --- | --- | --- |
| Monitor de quadro, total | Shelly 3EM (trifásico) | R$ 945 a R$ 985 | 1 sensor no quadro | Só o total da casa, sem separar aparelho |
| Monitor de quadro, total | Shelly EM + pinça 120 A | ~R$ 650 | 1 sensor no quadro | Idem |
| Monitor de quadro, total | IE Tecnologia SM-3W Lite | ~R$ 580 (menção em fórum, ~2 anos) | 1 sensor | Idem |
| Módulo genérico | Tuya / Smartlife Wi-Fi | R$ 94 a R$ 105 | 1 sensor | Idem, e sem suporte de marca |
| Monitor por circuito | Emporia Vue 3 | US$ 99,99 (só mains) a US$ 199,99 (mains + 16 sensores); no Brasil, importado via Amazon/Ubuy | **Uma pinça por circuito** | Exige abrir o quadro e um sensor por circuito; é por circuito, não por aparelho |
| NILM por software | Sense (EUA) | — | 1 sensor + desagregação em software | **Sem evidência de venda no Brasil** |
| Tomada inteligente | diversas | dezenas de reais cada | 1 por tomada | Cobertura parcial; não mede chuveiro nem ar-condicionado embutido |
| App da distribuidora | — | gratuito | leitura do medidor | Só o total, uma vez por mês |

**O que isso sustenta no documento:**

1. O concorrente mais próximo em método (Emporia) resolve por *hardware* — uma
   pinça por circuito — e não por software. Pela descrição do próprio fabricante,
   identifica aparelhos "através de sensores em nível de circuito", que é método
   diferente de NILM. Vale manter a formulação com essa ressalva.
2. Produto de NILM por software para consumidor final não aparece sendo vendido
   no Brasil. É a lacuna que o Amperê ocupa — e também o sinal de que o mercado
   não está validado aqui, o que entra na SWOT como ameaça, não só como
   oportunidade.
3. Os monitores de quadro vendidos aqui entregam o total, que é exatamente o dado
   que o cliente já tem na conta. O problema que a nossa pesquisa de campo mediu
   (89% não conseguem quantificar por aparelho) não é resolvido por eles.
4. Faixa de preço do substituto direto (R$ 580 a R$ 985) fica acima do nosso
   Amperê Node (R$ 199), o que é argumento de posicionamento e não só de custo.

---

## 3. O que ainda falta buscar

- Tarifa média residencial oficial em R$/kWh (ANEEL ou EPE). Hoje o documento usa
  a tarifa do projeto, R$ 0,86885/kWh, declarada como premissa.
- Tamanho do mercado de casa inteligente no Brasil, se for citado na seção 5.
- Dados de domicílios por faixa de renda (IBGE/PNAD), se o recorte do mercado
  endereçável precisar de mais sustentação que o CRM regional.

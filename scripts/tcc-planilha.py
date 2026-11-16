# Preenche a planilha financeira da FIAP (Apêndice A) com os números do Amperê
# e imprime a análise que sustenta a seção 8 do documento.
#
#   python scripts/tcc-planilha.py
#
# O template vem do material da disciplina e é copiado para
# entregas/tcc/apendice-a-planilha-financeira.xlsx. Este script escreve apenas
# valores de entrada; todas as fórmulas do template são preservadas e o Excel
# recalcula ao abrir. Como o openpyxl não avalia fórmulas, a demonstração de
# resultado é recalculada aqui, replicando as mesmas fórmulas, para que o
# documento cite números conferidos.
#
# Dois cenários são avaliados:
#   base     — preço e mix de aquisição como definidos no CP5
#   ajustado — preço do hardware elevado e mídia paga reduzida, conforme a
#              disposição de pagamento medida na pesquisa de campo
# A planilha é preenchida com o cenário ajustado, que é o plano proposto.
import openpyxl

ARQ = 'entregas/tcc/apendice-a-planilha-financeira.xlsx'

CUSTO_NODE, PRECO_PRO, CUSTO_PRO = 118.00, 19.90, 2.38
CAC_PAGO, CHURN, CONVERSAO_PRO = 145.00, 0.04, 0.12
VIDA = round(1 / CHURN)

NOVOS = [15, 25, 40, 60, 85, 120, 150, 180, 205, 225, 240, 250]

base_pro, ASSINANTES = 0.0, []
for n in NOVOS:
    base_pro = base_pro * (1 - CHURN) + n * CONVERSAO_PRO
    ASSINANTES.append(round(base_pro))

HOSPEDAGEM = [150] * 3 + [450] * 3 + [600] * 6
SALARIOS = [0] * 3 + [1000] * 3 + [2000] * 6
PROLABORE = [0] * 6 + [3000] * 6
CONTABIL = [200] * 12
OUTRAS = [115] * 3 + [200] * 3 + [300] * 6
FIXAS = sum(HOSPEDAGEM) + sum(SALARIOS) + sum(PROLABORE) + sum(CONTABIL) + sum(OUTRAS)
PRE_DOCUMENTACAO, PRE_EQUIPAMENTOS = 1500, 2500

CRESC = [1.00, 0.65, 0.25, 0.05]
INFLA_CUSTO = 0.11
INFLA_FIXA = [0.30, 0.15, 0.05, 0.00]


def brl(v):
    return f"R$ {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


class Cenario:
    def __init__(self, nome, preco_node, fracao_paga):
        self.nome, self.preco_node, self.fracao_paga = nome, preco_node, fracao_paga
        self.mc_hw = preco_node - CUSTO_NODE
        self.mc_pro = PRECO_PRO - CUSTO_PRO
        self.cac = CAC_PAGO * fracao_paga          # misto: parte vem do orgânico
        self.ltv = self.mc_hw + CONVERSAO_PRO * self.mc_pro * VIDA
        self.marketing = [CAC_PAGO * fracao_paga * n for n in NOVOS]
        self.receita = sum(NOVOS) * preco_node + sum(ASSINANTES) * PRECO_PRO
        self.cmv = sum(NOVOS) * CUSTO_NODE + sum(ASSINANTES) * CUSTO_PRO
        self.despesas = sum(self.marketing) + FIXAS
        self.peso_var = sum(self.marketing) / self.despesas

    def dre(self):
        r, c, d, linhas = self.receita, self.cmv, self.despesas, []
        for ano in range(1, 6):
            if ano > 1:
                g = CRESC[ano - 2]
                r *= 1 + g
                c *= (1 + g) * (1 + INFLA_CUSTO)
                d *= self.peso_var * (1 + g) + (1 - self.peso_var) * (1 + INFLA_FIXA[ano - 2])
            res = r - r * 0.05 - c - d
            linhas.append((ano, r, c, d, res, res - (res * 0.25 if res > 0 else 0)))
        return linhas

    def imprime(self):
        print(f"\n═══ {self.nome} ═══")
        print(f"  preço do Node R$ {self.preco_node:.2f} · margem R$ {self.mc_hw:.2f} · "
              f"mídia paga {self.fracao_paga*100:.0f}% · CAC misto {brl(self.cac)}")
        print(f"  LTV {brl(self.ltv)} · LTV/CAC {self.ltv/self.cac:.2f}x")
        print("  ANO         receita           CMV      despesas     resultado")
        for ano, r, c, d, res, _ in self.dre():
            print(f"  Ano {ano}  {brl(r):>14} {brl(c):>13} {brl(d):>13} {brl(res):>14}")


base = Cenario('CENÁRIO BASE — preço do CP5', 199.00, 0.70)
ajustado = Cenario('CENÁRIO AJUSTADO — preço conforme pesquisa', 299.00, 0.50)
base.imprime()
ajustado.imprime()

print("\n═══ Sensibilidade ═══")
for alvo in (1.0, 3.0):
    c = (alvo * base.cac - base.mc_hw) / (base.mc_pro * VIDA)
    print(f"  conversão para Pro necessária, no cenário base, para LTV/CAC = {alvo:.0f}x: {c*100:.1f}%")
print(f"  CAC máximo no cenário base para LTV/CAC = 3x: {brl(base.ltv/3)}")
print(f"  ponto de equilíbrio do cenário ajustado: "
      f"{FIXAS/12/(ajustado.mc_hw):.1f} unidades por mês para cobrir as despesas fixas médias")

# ── Preenchimento da planilha com o cenário ajustado ─────────────────────────
wb = openpyxl.load_workbook(ARQ)
ib = wb['InformacoesBasicas']
ib['B9'] = 'Amperê'
ib['B10'] = 2                      # Serviços — alíquota de 5% no template
ib['B16'] = 'Amperê Node (sensor, venda única)'
ib['B17'] = 'Plano Pro (assinatura mensal)'
for linha in range(18, 26):
    ib[f'B{linha}'] = None

for i, g in enumerate(CRESC):
    ib[f'D{29 + i}'] = g
    ib[f'D{43 + i}'] = (1 + g) * (1 + INFLA_CUSTO) - 1
    ib[f'D{36 + i}'] = (ajustado.peso_var * (1 + g) +
                        (1 - ajustado.peso_var) * (1 + INFLA_FIXA[i])) - 1

ent = wb['Entrada de $']
for i in range(12):
    col = chr(ord('B') + i)
    ent[f'{col}8'] = NOVOS[i]
    ent[f'{col}9'] = ajustado.preco_node
    ent[f'{col}12'] = ASSINANTES[i]
    ent[f'{col}13'] = PRECO_PRO

cu = wb['Custo Unitário']
cu['B4'], cu['B6'] = CUSTO_NODE, CUSTO_PRO

sai = wb['Saídas de $']
sai['B9'], sai['B10'] = PRE_DOCUMENTACAO, PRE_EQUIPAMENTOS
for i in range(12):
    col = chr(ord('D') + i)
    sai[f'{col}23'] = SALARIOS[i]
    sai[f'{col}24'] = PROLABORE[i]
    sai[f'{col}26'] = round(ajustado.marketing[i], 2)
    sai[f'{col}28'] = HOSPEDAGEM[i]
    sai[f'{col}29'] = CONTABIL[i]
    sai[f'{col}34'] = OUTRAS[i]

wb.save(ARQ)
print(f"\n{ARQ} — preenchida com o cenário ajustado")
print(f"  assinantes Pro por mês: {ASSINANTES}")

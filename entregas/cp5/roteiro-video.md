# Roteiro do vídeo — Amperê CP5

**Duração alvo:** 4min50 (o limite é 5min — a folga é proposital)
**Formato:** 1920×1080 · YouTube não listado

---

## Antes de apertar REC

```bash
# 1. Reposiciona os 90 dias para terminarem agora (os números voltam a bater)
cd server && npm run seed

# 2. API                                    → deixa rodando
cd server && npm run dev

# 3. Front                                  → deixa rodando
npm run dev -- --port 5180

# 4. Telemetria ao vivo                     → deixa rodando
cd server && npm run simulate
```

Depois:

- [ ] Abrir `entregas/cp5/slides/apresentar.html` → tecla **F** (tela cheia)
- [ ] Abrir `http://localhost:5180` em outra aba, **já logado** (`demo@ampere.app` / `ampere2026`)
- [ ] Fechar Slack, Discord, e-mail — qualquer coisa que gere notificação
- [ ] Fechar abas extras do navegador
- [ ] Testar o microfone gravando 10 segundos e ouvindo
- [ ] Gravar entre **20h e 22h**: é quando o perfil bate o pico de ~1.340 W

> Alternar entre slides e sistema: deixe as duas janelas prontas e use **Alt+Tab**.
> Ensaie a troca uma vez antes de gravar — é o único ponto onde dá para travar.

---

## Roteiro

### 0:00 — Capa · slide 01
> Oi, eu sou o Guilherme. Esse é o **Amperê**: um sistema que mostra quanto
> cada aparelho da sua casa custa na conta de luz. Em cinco minutos eu mostro
> o problema, a solução, e o sistema rodando.

`→` próximo slide

---

### 0:12 — O problema · slide 02
> A conta de luz de uma casa de classe média fica em torno de **cento e oitenta
> e sete reais** por mês. Só que ela chega assim: fechada, uma vez por mês, com
> um número só.
>
> Você não sabe quanto foi o chuveiro, quanto foi o ar-condicionado. E quando
> ela chega, o consumo já aconteceu — não dá mais para mudar nada.

`→`

---

### 0:47 — A solução · slide 03
> O Amperê resolve com **NILM** — monitoramento não-intrusivo de cargas.
>
> É **um sensor só**, no quadro elétrico. Ele mede o total da casa. Quando um
> aparelho liga, a potência dá um salto do tamanho dele; quando desliga, cai o
> mesmo tanto. É esse **degrau** que identifica quem ligou.
>
> Sem obra, sem trocar tomada. E tudo aparece **em reais**, não em
> quilowatt-hora.

`→`

---

### 1:17 — Arquitetura · slide 04
> Quatro camadas. O sensor publica leituras a cada quinze minutos. Uma API em
> Node e TypeScript recebe, roda o NILM e grava num **Postgres na nuvem**, com
> modelagem dimensional: seis dimensões e dois fatos. O front em React consome
> essa API.
>
> O hardware ainda não foi montado — mas o simulador publica **no mesmo
> endpoint, com a mesma autenticação**. Quando a placa existir, ela entra no
> lugar dele sem mudar uma linha do back-end.

**Alt+Tab** → navegador com o sistema

---

### 1:45 — DEMONSTRAÇÃO AO VIVO *(90 segundos — é o coração do vídeo)*

**Tela: Dashboard**
> Esse é o sistema rodando agora, contra o banco na nuvem.
>
> A primeira coisa é o **ranking de aparelhos** — ele abre a tela porque o teste
> de usabilidade da fase anterior mostrou que os usuários ignoravam esse bloco
> no rodapé. O maior gasto em âmbar: ar-condicionado, oitenta e oito reais.

*(aponte o cursor para o card)*

> Aqui, gasto estimado do mês: cento e oitenta e sete. E o **consumo agora** —
> repare que ele muda sozinho. É o simulador publicando leitura nova.

*(espere 3 segundos mostrando o número mudar)*

**Clique em APARELHOS**
> Seis cargas identificadas pelo NILM a partir de um sensor só. Status,
> potência e custo de cada uma.

**Clique no Ar-condicionado**
> A curva de vinte e quatro horas e a comparação com a média da categoria. A
> recomendação de ROI é do plano Pro, e o **preço fica visível** — dezenove e
> noventa. Outro ajuste do teste: antes o cadeado aparecia sem preço.

**Clique em RELATÓRIO**
> E o relatório mensal: distribuição de custo por aparelho e a **economia
> acumulada**, comparando o ciclo com a média dos anteriores. Terceiro ajuste
> do teste.

**Alt+Tab** → slides

---

### 3:15 — O NILM funciona · slide 06
> O detector foi medido: **noventa e três vírgula seis por cento de recall**,
> noventa e nove de precisão, sobre trinta dias e quase três mil amostras.
>
> Chuveiro e ar-condicionado em cem por cento. TV e iluminação em oitenta —
> elas se perdem quando ligam junto com o ar. Está documentado como limite
> conhecido, e a troca por um modelo treinado já está isolada atrás de uma
> interface, para a Fase 6.

`→`

---

### 3:45 — Modelo de negócio · slide 07
> O modelo é híbrido: o Amperê Node por cento e noventa e nove, receita única,
> e o software em assinatura.
>
> O plano **Free** entrega o diagnóstico completo — é o que cria o hábito de
> abrir o app. O **Pro**, dezenove e noventa por mês, entrega a prescrição:
> quanto cada troca economiza e em quantos meses se paga.

`→`

---

### 4:07 — Viabilidade · slide 08
> A unidade econômica fecha: **LTV sobre CAC de três vírgula seis**, acima da
> referência de três, e payback de três meses e meio, porque o hardware paga
> mais da metade da aquisição no ato. O caixa vira positivo no sexto mês.
>
> Sendo transparente: custo de hardware, CAC e churn são **premissas
> declaradas**, ainda não validadas.

`→`

---

### 4:30 — Onde estamos · slide 09
> Entregue: banco na nuvem, back-end com onze rotas, front com seis telas,
> autenticação, ingestão e o NILM identificando cargas. Para a Fase 6 ficam o
> hardware físico, o modelo de machine learning e a cobrança.

`→`

---

### 4:47 — Fechamento · slide 10
> O código está no GitHub, com a conta de demonstração no repositório para
> quem quiser entrar e navegar. Obrigado.

**FIM**

---

## Se passar de 5 minutos

Corte nesta ordem:

1. A tela de Relatório na demonstração — **−20s**
2. O segundo parágrafo do slide 04 (o simulador) — **−15s**
3. O segundo parágrafo do slide 08 (as premissas) — **−10s**

O corte 3 é o menos recomendado: essa frase é o que protege você se o
professor perguntar de onde vieram os números.

## O que não fazer

- Não leia o slide em voz alta. O slide é apoio; você conta a história.
- Não peça desculpa por nada estar incompleto — o slide 09 já declara o escopo.
- Não corra na demonstração. É o único momento em que o professor vê o sistema
  funcionando, e é o que a atividade cobra explicitamente.
- Se errar uma frase, **não recomece o vídeo**: pare, respire, repita a frase.
  Corta depois.

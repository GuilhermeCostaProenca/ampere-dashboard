# Roteiro — vídeo Fase 7 (até 5 minutos)

Duas vozes, como nas fases anteriores: **Duda** abre e leva narrativa, transmídia, inbound e
influenciadores; **Hugo** leva a demonstração, o plano de mídia e a parte de segurança em
redes sociais.

A atividade exige demonstração do sistema rodando. Ela vem cedo, no bloco 2, para não
sobrar como promessa no fim.

**Sobre o tempo.** As janelas abaixo não são estimativa: o texto falado foi contado e
convertido a 155 palavras por minuto, que é um ritmo de leitura clara em português. São
cerca de 275 segundos de fala, mais uns 13 segundos de ação de tela na demonstração — fecha
perto de 4min50, com folga para respiro. Se a sua leitura for mais lenta, a ordem de corte
está nas Regras, no fim. Se for mais rápida, não acelere: use a folga.

Antes de gravar:

- Supabase restaurado (o plano gratuito pausa o banco por inatividade — conferir antes).
- Front logado com a conta de demonstração, no dashboard.
- Terminal na pasta `server`, com o simulador pronto para rodar.
- Aba Network do navegador aberta, para mostrar a chamada saindo.
- `entregas/fase7/slides-fase7.pdf` aberto em tela cheia, ou o HTML no navegador.
  O deck tem 11 slides em 1920x1080 (16:9), já no formato do vídeo.
- Link do vídeo já trocado nos dois HTML e os PDFs regerados com `npm run fase7`.

---

## [0:00–0:15] Abertura — Duda · slide 1

> "Olá! Somos o grupo SenseForge. O Amperê identifica quanto cada aparelho da casa pesa na
> conta de luz, a partir de um único sensor no quadro elétrico. Nesta fase o projeto ganha um
> plano de lançamento."

---

## [0:15–0:50] Demonstração do sistema rodando — Hugo · tela

Quatro passos. Deixe a tela respirar: um terço deste bloco é ação, não fala.

**Gravando sem terminal?** Há uma versão deste bloco só com o navegador, mesma duração e
mesma fala, em [guia-demo-dashboard.md](guia-demo-dashboard.md). A prova de que o sistema
está vivo passa a ser a aba Network em vez do simulador.

1. **Dashboard logado:** gasto do mês, consumo agora e o ranking de aparelhos por custo.
2. **Terminal:** `npm run simulate` — as leituras saindo.
3. **Supabase:** `fato_leitura_agregada` com a contagem subindo.
4. **Aba Network:** `GET /api/dashboard/summary` saindo do navegador, e o valor na tela.

> "O ciclo completo está no ar: o dispositivo publica, o NILM separa os aparelhos, o banco em
> nuvem guarda e o dashboard lê — tudo autenticado.
>
> *(no ranking)* E esse ranking é o que a campanha vende: numa conta de cento e oitenta e
> sete reais, oitenta e nove são de ar-condicionado."

---

## [0:50–1:08] Onde o produto está no lançamento — Hugo · slide 2

> "Lançamos com o sistema no ar e com o que falta escrito. O hardware está em montagem, então
> o Node abre em pré-venda. A limitação de taxa e a trilha de auditoria entram antes de a
> campanha paga escalar. E nenhuma peça promete economia garantida."

---

## [1:08–1:32] Narrativa central — Duda · slide 3

> "A narrativa cabe em uma frase: a sua conta de luz é um número sem nomes, e o Amperê
> devolve os nomes.
>
> O vilão não é a energia nem a distribuidora: é a opacidade — o número chega fechado, uma
> vez por mês. E não é chute: setenta e oito por cento da nossa pesquisa não sabe quais
> aparelhos consomem mais."

---

## [1:32–1:55] Campanha transmídia — Duda · slide 4

> "Republicar o mesmo post em cinco redes é crossmedia. Transmídia é cada meio contar um
> capítulo diferente.
>
> O susto vai para o Reels, com o valor subindo enquanto o chuveiro liga. A revelação é a
> calculadora, porque o visitante precisa ver o número dele. O coletivo vai para o LinkedIn.
> Seis das nove peças já existem no repositório."

---

## [1:55–2:17] Inbound Marketing — Duda · slide 5

> "A isca entrega de graça uma versão pequena do produto: a resposta para 'quanto isso me
> custa'.
>
> Por isso a calculadora não tem cadastro, e o e-mail só é pedido depois, com consentimento
> separado dos termos de uso. O Pro não é vendido por e-mail: é vendido dentro do produto,
> com o diagnóstico já na tela."

---

## [2:17–2:38] Influenciadores — Duda · slide 6

> "O produto pede para instalar um sensor dentro da casa da pessoa, então confiança vale mais
> que alcance. Os quatro perfis são simulados.
>
> Nos meses um a três publicam os dois pequenos; os dois de cachê entram no mês quatro.
> Perfil de alcance antes de haver prova é dinheiro gasto cedo."

---

## [2:38–3:37] Mídia digital, funil e ROI — Hugo · slides 7, 8 e 9

> "O orçamento não foi arbitrado: ele já existia. É a linha de aquisição da projeção do CP5 —
> cento e quarenta e cinco reais de custo de aquisição sobre setenta por cento da curva de
> trezentos e quarenta e cinco clientes. Trinta e cinco mil reais em seis meses.
>
> Meta leva quarenta e dois por cento: a peça de maior potencial é um vídeo curto com um
> número surpreendente. Busca leva vinte e seis, porque quem digita 'preço monitor de
> consumo' já decidiu comprar. E o LinkedIn só entra no mês quatro, porque o B2B exige prova.
>
> O funil fecha em vinte e cinco mil cliques, mil e quinhentos leads e duzentos e quarenta e
> um clientes.
>
> E o que não escondemos: duzentos e cinquenta e sete por cento de retorno no ciclo de vida,
> com o caixa do semestre negativo em dois mil e oitocentos reais. As duas são verdade,
> porque o payback é de três meses e meio."

---

## [3:37–4:31] Segurança e reputação em redes sociais — Hugo · slide 10

> "Uma conta oficial tomada vale mais para o atacante do que o nosso banco de dados — e somos
> a empresa que pede para instalar um sensor dentro da casa do cliente. Perfil invadido
> publicando phishing custa a premissa do produto.
>
> Então dois fatores por aplicativo, nunca por SMS, porque troca de chip é o vetor; dois
> administradores, nunca um só. E vazamento, numa startup pequena, raramente é ataque — é
> captura de tela.
>
> Para reputação, a resposta é classificada antes. Crítica justa tem vinte e quatro horas.
> Desinformação sobre privacidade tem doze, porque é a única acusação que ataca a premissa do
> produto — e essa resposta já estava escrita desde a Fase 6. Com dado pessoal envolvido,
> vale o prazo da LGPD: três dias úteis."

---

## [4:31–4:53] Fechamento — Duda · slide 11

> "Fase cinco: funciona. Fase seis: é confiável. Fase sete: tem caminho até o primeiro
> cliente.
>
> E três limites ficam no documento, não no rodapé: a curva de clientes é a premissa mais
> frágil, o caixa do semestre é negativo, e a mídia orgânica só parece gratuita porque o
> modelo não paga os fundadores. Obrigada!"

---

### Regras

- Não dizer que o hardware está pronto, nem que o NILM é machine learning, nem prometer
  percentual de economia. Vale para o vídeo como vale para a campanha.
- Deixar claro, ao falar dos influenciadores, que os perfis são **simulados**. Dizer a
  palavra.
- Não apresentar o ROI de 257% sem dizer, na mesma frase, que o caixa do semestre é
  negativo. É o mesmo cuidado que o documento tem.
- O orçamento de mídia é consequência da projeção do CP5, não um número novo. Dizer isso
  evita a pergunta óbvia do professor.
- **Se estourar 5:00**, a ordem de corte é: primeiro o bloco de influenciadores (slide 6),
  depois o segundo parágrafo da transmídia, depois o parágrafo do vazamento na segurança.
  Os três são fáceis de recuperar na leitura do documento.
- **Nunca** cortar a demonstração do sistema nem o contrapeso do caixa negativo: a primeira é
  exigência da atividade, o segundo é o que dá credibilidade ao resto.

# Roteiro — vídeo Fase 7 (até 5 minutos)

Duas vozes, como nas fases anteriores: **Duda** abre e leva narrativa, transmídia, inbound e
influenciadores; **Hugo** leva a demonstração, o plano de mídia e a parte de segurança em
redes sociais.

A atividade exige demonstração do sistema rodando. Ela vem cedo, no bloco 2, para não
sobrar como promessa no fim.

Antes de gravar:

- Supabase restaurado (o plano gratuito pausa o banco por inatividade — conferir antes).
- Front logado com a conta de demonstração, no dashboard.
- Terminal na pasta `server`, com o simulador pronto para rodar.
- Aba Network do navegador aberta, para mostrar a chamada saindo.
- `entregas/fase7/slides-fase7.pdf` aberto em tela cheia, ou o HTML no navegador.
  O deck tem 11 slides em 1920x1080 (16:9), já no formato do vídeo.
- Link do vídeo já trocado nos dois HTML e os PDFs regerados com `npm run fase7`.

---

## [0:00–0:20] Abertura — Duda · slide 1

> "Olá! Somos o grupo SenseForge. O Amperê identifica quanto cada aparelho da casa pesa na
> conta de luz, a partir de um único sensor no quadro elétrico.
> Nas fases anteriores o sistema passou a funcionar e depois a ser auditável. Nesta fase ele
> ganha um plano de lançamento: narrativa, campanha transmídia e mídia digital."

---

## [0:20–1:05] Demonstração do sistema rodando — Hugo · tela

Sequência enxuta, quatro passos:

1. **Dashboard logado:** gasto do mês, consumo agora e o ranking de aparelhos por custo —
   com o ar-condicionado em destaque como maior gasto do ciclo.
2. **Terminal:** `npm run simulate` — as leituras saindo.
3. **Supabase:** `fato_leitura_agregada` com a contagem subindo.
4. **Aba Network:** `GET /api/dashboard/summary` saindo do navegador, e o valor mudando na
   tela.

> "O ciclo completo está no ar: o dispositivo publica, o NILM separa os aparelhos, o banco
> em nuvem guarda e o dashboard lê — tudo autenticado. Esse ranking aqui é o que a campanha
> inteira vende: numa conta de cento e oitenta e sete reais, oitenta e nove são de
> ar-condicionado."

---

## [1:05–1:30] Onde o produto está no lançamento — Hugo · slide 2

> "Lançamos com o sistema no ar e com o que falta escrito. O hardware está em montagem,
> então o Node abre em pré-venda, com prazo declarado. E a limitação de taxa e a trilha de
> auditoria, que a Fase 6 apontou, entram antes de a campanha paga escalar — tráfego pago
> apontando para cadastro sem limitação de taxa é convite a abuso.
>
> Daí a regra de honestidade da campanha: nenhuma peça diz que o hardware está em produção,
> que o NILM é machine learning, nem que a economia é garantida."

---

## [1:30–2:00] Narrativa central — Duda · slide 3

> "A narrativa cabe em uma frase: a sua conta de luz é um número sem nomes, e o Amperê
> devolve os nomes.
>
> O herói é o morador, não o produto. E o vilão não é a energia nem a distribuidora: é a
> opacidade. Uma vez por mês chega um número fechado e não há o que fazer com ele.
>
> A virada é o instante em que esse número vira lista. A transformação que vendemos é sair
> do 'levei um susto com a conta' para 'eu já sabia que ia dar isso'.
>
> Isso não é chute: na nossa pesquisa de campo, setenta e oito por cento não sabem quais
> aparelhos mais consomem e oitenta e três já se surpreenderam com a conta."

---

## [2:00–2:30] Campanha transmídia — Duda · slide 4

> "Republicar o mesmo post em cinco redes é crossmedia. Transmídia é cada meio contar um
> capítulo diferente da mesma história.
>
> O susto vai para o Reels: 'quanto custa seu banho', vinte segundos com o valor em reais
> subindo enquanto o chuveiro liga. A revelação é a calculadora na landing, porque precisa
> ser interativo — o visitante vê o número dele. O método vai para o YouTube e para as
> comunidades técnicas. A prova é o carrossel com o ranking real. E o coletivo, síndico e
> administradora, vai para o LinkedIn.
>
> Seis das nove peças usam material que já existe no repositório. A campanha não depende de
> orçamento de produção."

---

## [2:30–3:00] Inbound Marketing — Duda · slide 5

> "A isca precisa entregar de graça uma versão pequena do que o produto entrega: a resposta
> para 'quanto isso me custa'.
>
> Por isso a calculadora não tem cadastro. O e-mail só é pedido depois do valor entregue, e
> com consentimento específico, separado dos termos de uso — como a Fase 6 exige.
>
> Dali vem uma sequência de quatro e-mails, do cálculo pedido até o convite para o plano
> gratuito. E o plano Pro não é vendido por e-mail: é vendido dentro do produto, quando o
> usuário já tem o diagnóstico na tela e o que falta é a prescrição."

---

## [3:00–3:25] Influenciadores — Duda · slide 6

> "Nosso produto pede para instalar um sensor dentro da casa da pessoa. Então confiança vale
> mais que alcance: micro-perfis, de cinco a duzentos mil seguidores, que possam demonstrar
> de verdade.
>
> Os quatro perfis do documento são simulados, construídos como arquétipos para dimensionar
> o orçamento. Um de orçamento doméstico para alcance, um de automação para o primeiro
> adotante técnico, um de condomínio no LinkedIn para o B2B, e uma engenheira eletricista
> para derrubar a objeção que mais trava a compra: 'vou mexer no meu quadro elétrico?'.
>
> Cada um com cupom próprio, e renova quem entregar custo de aquisição abaixo de cento e
> quarenta e cinco reais. O briefing pede, por escrito, que o erro do detector apareça no
> vídeo."

---

## [3:25–4:05] Mídia digital, funil e ROI — Hugo · slides 7, 8 e 9

> "O orçamento de mídia não foi arbitrado nesta fase: ele já existia. É a linha de aquisição
> da projeção financeira do CP5 — o custo de aquisição de cento e quarenta e cinco reais
> aplicado sobre setenta por cento da curva de trezentos e quarenta e cinco clientes. Dá
> trinta e cinco mil reais em seis meses, e o trabalho aqui foi distribuir entre canais.
>
> Meta leva quarenta e dois por cento, porque a peça de maior potencial é um vídeo curto com
> um número surpreendente. Busca leva vinte e seis, porque quem digita 'preço monitor de
> consumo' já decidiu comprar. E o LinkedIn só entra no mês quatro, porque sem um piloto em
> condomínio o anúncio não tem o que dizer ao síndico.
>
> O funil fecha: vinte e cinco mil cliques, seis mil usos da calculadora, mil e quinhentos
> leads a vinte e três reais cada, e duzentos e quarenta e um clientes.
>
> E aqui está o ponto que não escondemos: o retorno sobre o investimento é de duzentos e
> cinquenta e sete por cento no ciclo de vida do cliente, mas o caixa do semestre fecha
> negativo em dois mil e oitocentos reais. As duas coisas são verdade ao mesmo tempo, porque
> o payback é de três meses e meio. O lançamento não pede lucro: pede três mil e duzentos
> reais de capital de giro."

---

## [4:05–4:40] Segurança e reputação em redes sociais — Hugo · slide 10

> "Uma conta oficial tomada vale mais para o atacante do que o nosso banco de dados — e para
> nós o dano é específico: somos a empresa que pede para instalar um sensor dentro da casa do
> cliente. Perfil invadido publicando phishing não custa alcance, custa a premissa do
> produto.
>
> Então: dois fatores por aplicativo em todas as contas, nunca por SMS, porque troca de chip
> é o vetor; dois administradores, nunca um só; nada de login compartilhado; e revisão
> trimestral de aplicativos conectados.
>
> Vazamento, numa startup pequena, raramente é ataque — é captura de tela. Todo material de
> campanha sai da conta de demonstração, com base sintética, e suporte não trafega dado
> pessoal em mensagem direta.
>
> Para reputação, a resposta é classificada antes. Crítica justa tem vinte e quatro horas e
> resposta pública. Mas desinformação sobre privacidade — 'esse sensor grava o que acontece
> na sua casa' — tem doze horas, porque é a única acusação que ataca a premissa do produto.
> E a resposta já está escrita desde a Fase 6: agregação em quinze minutos, vedação expressa
> de venda de dados, política publicada. Se houver dado pessoal envolvido, vale o prazo da
> LGPD: ANPD e titulares em três dias úteis."

---

## [4:40–5:00] Fechamento — Duda · slide 11

> "Fase cinco: funciona. Fase seis: é confiável. Fase sete: tem caminho até o primeiro
> cliente.
>
> E três limites ficam registrados no documento, não no rodapé: a curva de clientes é a
> premissa mais frágil do modelo, o retorno é de ciclo de vida enquanto o caixa do semestre
> é negativo, e a mídia orgânica só parece gratuita porque o modelo não paga os fundadores.
> Obrigada!"

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
- Se estourar 5:00, cortar primeiro o bloco de influenciadores (slide 6), que é o mais fácil
  de recuperar na leitura do documento. **Nunca** cortar a demonstração do sistema: ela é
  exigência da atividade.

# Guia da demonstração do dashboard — para gravar sem terminal

Para quem vai gravar a parte do sistema rodando usando **só o navegador**. É a versão
alternativa do bloco `[0:15–0:50]` do [roteiro](roteiro-video.md): mesma duração, mesma
narração, sem precisar abrir terminal nem o painel do Supabase.

Este arquivo é material de apoio da gravação. Ele **não** entra no .ZIP da entrega.

---

## Antes de abrir o gravador

**Link:** <https://ampere-dashboard-six.vercel.app>
**Conta de demonstração:** `demo@ampere.app` · senha `ampere2026`

Conferido em 03/11/2026: o site responde e o banco está acordado.

**Se a tela de acesso der "Erro interno"**, não é erro seu — o banco fica num plano gratuito
que pausa sozinho depois de uns 7 dias sem uso. Nesse caso avisa o Guilherme antes de
gravar: são dois minutos para reativar, mas tem que ser ele.

**Gravação:** grave em **1920x1080** (Full HD, 16:9). É a mesma proporção do deck de slides,
então a troca entre slide e tela não muda o enquadramento.

Deixe aberto antes de começar a gravar, para não aparecer você procurando as coisas:

- Uma aba só, já na página inicial do site, **sem** estar logada ainda.
- Nada de notificação na tela. Fecha o resto.

---

## O caminho na tela — 6 passos

Faça devagar. O bloco tem 35 segundos e só uns 19 são de fala: o resto é a tela respirando.
Não precisa narrar cada clique.

**1. A landing** (uns 3s)
Começa em <https://ampere-dashboard-six.vercel.app>. Mostra que é um produto publicado de
verdade, não uma tela solta. Dá uma rolada curta e para.

**2. Entrar** (uns 5s)
Clica em acessar, digita `demo@ampere.app` e a senha, e entra. **Deixa o login aparecer na
gravação** — é o que prova que tem autenticação real, não é tela estática.

**3. O painel** (uns 8s — é aqui que a história acontece)
Você cai em **Painel de controle**. Três coisas para mostrar, nessa ordem:

- **Gasto estimado do mês** e **Consumo agora**, no alto.
- **Top aparelhos / gasto** — o bloco do ranking. O ar-condicionado vem com destaque em
  âmbar e o rótulo **"▲ maior gasto do ciclo"**. É o número que a campanha inteira vende.
- Passa o mouse no gráfico, para mostrar que é dado de verdade e não imagem.

**4. O detalhe do aparelho** (uns 6s)
Clica no ar-condicionado. Abre **Detalhe da carga**, com **Custo estimado no mês**, **Horas
ativas no mês** e a curva daquele aparelho. Aparece também o bloco
**"Recomendação de ROI disponível no plano Pro"**, com o preço — é o nosso ponto de venda,
vale meio segundo de pausa nele.

**5. O relatório** (uns 5s)
Menu **Relatório**. Mostra o **Acumulado até agora** e o **Custo por kWh no ciclo**.

**6. A prova de que está vivo** (uns 8s) — *o passo que substitui o terminal*
Aperta **F12**, vai na aba **Network** (ou "Rede"), e aperta **F5** para recarregar a página.
Vai aparecer uma lista de chamadas. Clica na que se chama **`summary`** e mostra a resposta
em JSON do lado.

> É isso que prova que o dashboard está lendo de uma API e de um banco em nuvem, e não de
> dado chumbado na página. Era o que o terminal mostrava no roteiro original.

---

## O que dizer

A fala é a mesma do roteiro. São uns 19 segundos:

> "O ciclo completo está no ar: o dispositivo publica, o NILM separa os aparelhos, o banco em
> nuvem guarda e o dashboard lê — tudo autenticado.
>
> *(quando o ranking estiver na tela)* E esse ranking é o que a campanha vende: numa conta de
> cento e oitenta e sete reais, oitenta e nove são de ar-condicionado."

Se quiser dizer uma frase no passo 6, enquanto o JSON está na tela:

> "E aqui é a chamada saindo do navegador para a nossa API — o dado vem do banco, ao vivo."

---

## Três coisas para não dizer

Valem para o vídeo inteiro, não só para a demonstração:

1. **Não dizer que o sensor físico está pronto.** O hardware está em montagem; quem publica
   as leituras hoje é um simulador, no mesmo endpoint previsto para o aparelho. Se alguém
   perguntar, essa é a resposta — e ela está no documento.
2. **Não dizer que o NILM é inteligência artificial** nem machine learning. É um detector de
   degraus de potência. O número honesto é 93,6% de acerto.
3. **Não prometer economia.** O produto mostra onde está o gasto; quem economiza é o morador.

---

## Se você for gravar o vídeo inteiro, não só esta parte

O roteiro divide as falas entre duas vozes (Duda e Hugo). Se for tudo você, **ignore a
divisão** — o texto é o mesmo, só lê tudo. A ordem dos blocos e as janelas de tempo
continuam valendo: são 11 slides e fecha perto de 4min46, com folga para os 5 minutos.

Ordem de corte, se estourar: primeiro o bloco de influenciadores (slide 6), depois o segundo
parágrafo da transmídia, depois o parágrafo do vazamento na segurança. **Nunca** cortar esta
demonstração — ela é exigência da atividade.

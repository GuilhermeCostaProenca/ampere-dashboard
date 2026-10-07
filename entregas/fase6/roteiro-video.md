# Roteiro — vídeo Fase 6 (até 5 minutos)

Duas vozes, como no TCC (B): **Duda** abre e leva governança e divulgação, **Hugo** leva
a demonstração e a parte de segurança.

Antes de gravar: Supabase restaurado, front logado com a conta de demonstração,
Postman com o POST e o GET montados, terminal na pasta `server`.

---

## [0:00–0:25] Abertura — Duda · slide 1

> "Olá! Somos o grupo SenseForge. O Amperê identifica quanto cada aparelho da casa
> pesa na conta de luz, a partir de um único sensor no quadro elétrico.
> Nesta fase o projeto saiu do 'funciona' para o 'é confiável e pode ser auditado':
> adequação à LGPD, governança de TI e uma análise de segurança do nosso próprio código."

---

## [0:25–1:10] Revisão do MVP — Duda · slide 2

> "Na fase anterior o sistema rodava só na nossa máquina. Agora está publicado:
> front e API na mesma origem, como função serverless, e banco PostgreSQL gerenciado
> com oito migrations aplicadas.
>
> No caminho corrigimos três defeitos reais: o roteamento de produção, que matava as
> rotas aninhadas; o CORS, que recusava o próprio front; e o README, que descrevia uma
> arquitetura que nunca existiu.
>
> Também criamos a landing pública, que é a base da estratégia de aquisição.
> E o simulador continua publicando no mesmo endpoint previsto para o firmware:
> quando o hardware entrar, nada muda do backend para frente."

---

## [1:10–2:00] Demonstração — Hugo · tela

Sequência enxuta (o vídeo é de 5 minutos, não repete o TCC B):

1. Dashboard logado: gasto do mês, consumo agora, ranking de aparelhos por custo.
2. `npm run simulate` no terminal — leituras saindo.
3. Supabase: `fato_leitura_agregada` com a contagem subindo.
4. Aba Network: `GET /api/dashboard/summary` saindo do navegador, e o valor mudando na tela.

> "O ciclo completo está no ar: o dispositivo publica, o NILM separa os aparelhos,
> o banco em nuvem guarda e o dashboard lê. Tudo autenticado."

---

## [2:00–2:40] LGPD — Duda · slide 3

> "Coletamos nome, e-mail, tipo de imóvel e plano, os dados do dispositivo e a curva
> de consumo a cada quinze minutos.
>
> A base legal da conta e da telemetria é execução de contrato; segurança é legítimo
> interesse; marketing só com consentimento separado.
>
> O encarregado é o Guilherme, com canal público de privacidade, e a decisão sobre
> incidente é colegiada, justamente porque ele acumula a função técnica.
>
> Um ponto que tratamos com cuidado: consumo elétrico não é dado sensível na lei, mas
> revela rotina de sono, horário de banho e se tem gente em casa. Então tratamos como
> se fosse: agregação em quinze minutos, nada de venda de dados, e comunicação de
> incidente à ANPD e aos titulares em três dias úteis."

---

## [2:40–3:10] Governança — Duda · slide 4

> "Aplicamos a ISO/IEC 38500 ao nosso tamanho real: três pessoas acumulando papéis.
> Escrevemos quem decide o quê, critério de escolha de fornecedor e indicadores de
> desempenho.
>
> O ciclo avaliar, dirigir e monitorar não é enfeite: o nosso banco foi pausado
> automaticamente por inatividade do plano gratuito, e é exatamente o tipo de coisa
> que a etapa de monitoramento pega antes do usuário."

---

## [3:10–4:10] Segurança — Hugo · slides 5 e 6

> "A análise de segurança foi feita lendo o nosso próprio código, e por isso os riscos
> são concretos. Dez riscos mapeados, cada um apontando o arquivo.
>
> Os quatro mais graves: o backend acessa o banco com a chave de serviço, que contorna
> o controle de acesso por linha — o escopo depende de cada consulta lembrar do filtro,
> e isso é o A01 do OWASP. Não existe limitação de taxa no login nem na ingestão, A07.
> A chave do dispositivo está em texto puro, sem rotação, A02. E não existe trilha de
> auditoria: um incidente hoje não pode ser reconstruído, A09.
>
> Também avaliamos injeção e SSRF, e nesses dois o risco é baixo: consulta parametrizada
> e validação de esquema em toda entrada.
>
> Os controles estão priorizados: acesso ao banco só por função que exige o id do usuário,
> com teste automatizado que tenta ler dado alheio e tem que falhar; limitação de taxa;
> e registro estruturado de autenticação, ingestão e exclusão.
>
> A auditoria tem rotina: contínua para dependências e saúde, mensal para advisors e
> trilha, semestral para acessos e restauração de backup. Tudo mapeado na ISO 27001,
> 27002, 27005, 27017, 27018 e 27701."

---

## [4:10–4:45] Divulgação — Duda · slide 7

> "Quem tem o problema não busca por NILM: busca por 'conta de luz alta' e 'quanto gasta
> um chuveiro elétrico'. A estratégia é responder exatamente isso, com uma página por
> aparelho e uma calculadora gratuita de custo.
>
> A calculadora é a isca porque entrega de graça uma versão pequena do produto. Dali o
> visitante vira cadastro, o cadastro vira dispositivo conectado, e o canal de maior
> valor por contato são os síndicos e administradoras.
>
> Medimos por etapa: sessões orgânicas, conversão de três a cinco por cento, ativação de
> sessenta por cento dos cadastros, e custo de aquisição abaixo da margem do CP5."

---

## [4:45–5:00] Fechamento — Duda · slide 8

> "O MVP está no ar, o plano de LGPD está escrito e os riscos de segurança estão
> mapeados e priorizados — inclusive os que ainda não resolvemos. Obrigada!"

---

### Regras

- Não dizer que o hardware está pronto, nem que o NILM é machine learning.
- Não dizer que os controles pendentes já estão implementados: o documento lista o que falta, e o vídeo precisa bater com ele.
- Se estourar 5:00, cortar primeiro o bloco de governança (slide 4), que é o mais curto de recuperar na leitura do documento.

# Decisões

Tudo o que foi decidido, e por quê. O que não está aqui não foi decidido: pergunte. Cada decisão tem número, data e de onde veio.

Modelo de uma decisão:

```
## Dn. Título curto

- **Contexto (DD/MM/AAAA):** o pedido, nas palavras de quem pediu.
- **Decisão:** o que fica.
- **Interpretações que precisaram ser feitas:** o que o pedido não dizia.
- **Não sei:** o que ficou sem verificar.
```

## Linha do tempo

1. Começo a partir do modelo de arquitetura (D1).
2. O app vira o jogo Stalin Secreto (D2).
3. Os nomes passam a ser os do Secret Hitler (D3).
4. Visual no clima do jogo original (D4).
5. Baralho do jogo original (11 fascistas e 6 liberais), vitória com 6 leis para os dois lados (D5).
6. Regras iguais às do original, em tudo (D6).
7. Telas mais claras, modo escuro revisado, animações, estilo art déco e desenhos de animais (D7).
8. Endereço de produção (D8).
9. Mais animações e melhorias: carta virando, distribuição, descarte, carimbo, poderes, confete, vibração, sons, resumo, esconder sozinho, ajuda e desfazer (D9).
10. Jogar sozinho contra a IA, em quatro níveis, com um juiz que só mostra a cada IA o que o lugar dela saberia (D10).
11. Treino com papel escolhido, nomes históricos para as IAs, ata com quem aprovou cada lei e o anúncio da lei aprovada (D11).
12. Tema liberais x comunistas, nomes mais conhecidos, anotações da pessoa e votos variados (D12).
13. As IAs conversam, dicas do treinador, o que as IAs pensavam de você e velocidade da IA (D13).
14. Anotações num painel lateral, desconfiança ao vivo e o "undefined" na vez da IA (D14).
15. O ponto crucial para quem é do lado escondido (D15).

## D1. Página estática, núcleo puro e deploy na Vercel

- **Contexto:** o app começa do modelo de arquitetura do Oito Lados.
- **Decisão:** uma página estática em TypeScript, montada pelo Vite num arquivo só, sem backend, sem login e sem banco. A lógica fica em `src/core/`, pura e testada sozinha; a página em `src/app/`. Publicação pela integração da Vercel com o GitHub, a cada merge na `main`.
- **Por quê:** uma página estática não tem servidor para manter, abre do disco nos testes e cabe no plano gratuito de hospedagem estática.

## D2. Stalin Secreto: as regras

- **Contexto (12/10/2026):** "crie um jogo de cartas, tem 2 grupos: liberais e comunistas. vao ter 17 cartas num baralho, onde comunistas tem 9 cartas e liberais tem 8. um dos comunistas eh stalin. o objetivo eh ter 6 leis aprovadas para vencer (cada lei eh uma carta). a cada rodada tem um presidente, o presidente escolhe o chanceler (votado por todos), o presidente pega 3 cartas descarta 1 e manda pro chanceler que descarta 1 e publica a lei. os comunistas se conhecem no inicio do jogo e conhecem stalin, stalin n conhece os comunista, os liberais n se conhecem. na 2 carta comunista na mesa o presidente da vez pode pedir a algum jogador q diga se eh comunista, na 3 carta comunista na mesa o presidente da vez olha as prox 3 cartas, e na 4 e 5 carta comunista o presidente pode eliminar algum jogador". Depois: "entao faca igual ao secret hitler".
- **Perguntado e respondido (12/10/2026):** um celular passando de mão (não placar de apoio para cartas físicas); Stalin com as regras de vitória do Secret Hitler; 3 rejeições seguidas aprovam a lei do topo.
- **Decisão:** as regras pedidas valem como foram ditas; o que o pedido não cobria segue o Secret Hitler. Os requisitos 1 a 12 do `CLAUDE.md` são a regra completa.
- **Interpretações que precisaram ser feitas:**
  - "17 cartas, 9 comunistas e 8 liberais" é o baralho de leis, não o número de jogadores.
  - "6 leis para vencer" vale para os dois lados (no Secret Hitler os liberais vencem com 5).
  - O Stalin nunca conhece os comunistas, em qualquer tamanho de mesa (no Secret Hitler, com 5 ou 6, o Hitler conhece o fascista). Pedido explícito.
  - Os poderes são os pedidos, iguais em toda mesa (no Secret Hitler mudam com o tamanho e há eleição especial, que ficou de fora).
  - "Pedir a algum jogador que diga se é comunista": o app mostra o partido verdadeiro só ao presidente, que conta o que quiser. O Stalin aparece como comunista.
  - Do Secret Hitler: número de comunistas por mesa, limite de mandato, veto a partir da 5ª lei comunista, ninguém investigado duas vezes, caos sem poder e zerando o limite de mandato, lixo reembaralhado com menos de 3 leis.
  - A votação é em voz alta e o celular só registra o resultado (pedido em 12/10/2026: "aqui fica mais facil dizer se foi eleito ou nao em vez de apurar votacao") (no Secret Hitler os votos também são revelados juntos). O primeiro presidente é sorteado.
- **Não sei:** se a mesa vai querer voto secreto no celular, ou os poderes variando com o tamanho da mesa.

## D3. Nomenclatura do Secret Hitler

- **Contexto (12/10/2026):** "muda os nomes e toda nomenclatura pra virar o secret hitler".
- **Decisão:** o app se chama Secret Hitler; comunistas viram fascistas, Stalin vira Hitler, a lei comunista (`C`) vira fascista (`F`), os votos são Ja! e Nein!. Slug `secret-hitler`, chave `secrethitler.v1`, endereço https://secret-hitler.vercel.app. As regras da D2 não mudam.
- **Interpretações que precisaram ser feitas:** só os nomes mudaram. Os números continuam os pedidos na D2 (9 fascistas e 8 liberais no baralho, 6 leis para os dois lados, Hitler sem conhecer os fascistas), que não são os do jogo original (11 e 6, liberais vencem com 5).
- **Licença:** Secret Hitler é CC BY-NC-SA 4.0. O crédito está na tela inicial e no README; o app não pode ser vendido nem ter anúncios.
- **Não sei:** se o nome "Secret Hitler" pode ser usado num endereço público sem falar com os autores; a licença cobre o conteúdo, não marca.

## D4. Visual

- **Contexto (13/10/2026):** "pode usar a identidade visual do jogo original, ou seja, estilizar da forma melhor possivel".
- **Decisão:** um visual próprio no mesmo clima de época: pôster político dos anos 30, papel creme com textura, faixa preta no topo, azul liberal e vermelho-alaranjado fascista, títulos em capitulares condensadas, bordas grossas, sombras duras, cartas de lei com selo (balança e caveira) e o papel secreto num cartaz com raios.
- **Interpretações que precisaram ser feitas:** nada do material gráfico original foi copiado (logo, ilustrações, cartas, tabuleiros). Fontes só do sistema, para o app continuar abrindo sem internet.
- **Consequência nos testes:** o `tests/e2e.py` passou a ler o texto com `textContent` em vez de `innerText`, porque o CSS agora mostra botões e títulos em maiúsculas; o teste confere as palavras, não a caixa.

## D5. Baralho do jogo original, vitória com 6

- **Contexto (13/10/2026):** "São 11 fascistas e 6 liberais". Depois, perguntado se a vitória liberal ficava em 5 como no original: "Deixe igual o jogo original". Em seguida: "É com 6 leis mesmo pra vencer".
- **Decisão:** baralho de 17 leis, 11 fascistas e 6 liberais (substitui o 9/8 da D2). A vitória fica em 6 leis para os dois lados, como na D2; o tabuleiro liberal tem 6 casas. A troca para 5 liberais chegou a ser feita e foi desfeita no mesmo PR.
- **Interpretações que precisaram ser feitas:** "6 leis mesmo" foi lido como valendo para os dois lados. O resto que difere do original continua como está na D2 (Hitler sem conhecer os fascistas, poderes iguais em toda mesa, sem eleição especial).
- **Não sei:** como fica o equilíbrio. Com só 6 cartas liberais e vitória em 6, os liberais só vencem por leis se as 6 forem aprovadas (as descartadas voltam quando o baralho é reembaralhado).

## D6. Regras iguais às do original

- **Contexto (13/10/2026):** "Deixa td igual no original inclusive o visual", depois de receber a lista das diferenças.
- **Decisão:** valem as regras do Secret Hitler original. Substitui o que a D2 e a D5 tinham de diferente:
  - os liberais vencem com 5 leis e os fascistas com 6; o tabuleiro liberal tem 5 casas;
  - com 5 ou 6 jogadores o Hitler sabe quem é o fascista;
  - os poderes seguem o tabuleiro da mesa: 5–6, 7–8 e 9–10 jogadores;
  - existe a eleição especial: o presidente escolhe o próximo presidente, que pode ser alguém barrado pelo limite de mandato, e depois dessa rodada a ordem segue de quem convocou.
- **Interpretações que precisaram ser feitas:**
  - O tabuleiro é escolhido pelo número de jogadores que começaram, não pelos que estão vivos.
  - A votação continua em voz alta, e o celular só registra se o governo foi eleito. No original os votos são cartas Ja!/Nein! viradas juntas; o resultado é o mesmo, só muda o meio (pedido de 12/10).
  - Visual: continua o próprio, no clima de época (D4). Reproduzir o logo, as cartas, os tabuleiros e as ilustrações do jogo original não foi feito.
- **Não sei:** as regras foram escritas a partir do que se sabe do livro de regras do original, sem conferir o texto oficial nesta data.

## D7. Visual: clareza, animações, art déco e animais

- **Contexto (13/10/2026):** pedido para deixar o visual "o mais parecido possível" com o original, recusado (copiaria logo, cartas, tabuleiros e personagens). Oferecidos telas mais claras, modo escuro melhor, animações e outra linha de estilo: "Quero todas". Depois: "Coloca uma carta diferente pro hitler. Pode estilizar com animais pro liberais e pros facistas. Facistas como cobras de uniforme e liberais como pássaros". Sugerido em seguida usar lagartos como no original: recusado pelo mesmo motivo; ficaram as cobras e os pássaros pedidos.
- **Decisão:**
  - faixa sempre visível com presidente, chanceler (ou indicado) e rejeições; tela de passar o celular com o nome grande; histórico recolhível (aberto no fim do jogo);
  - modo escuro com sombra própria (preta) e contraste revisado;
  - animações: fase nova, segredo aberto e lei aprovada; nada com "reduzir movimento";
  - estilo art déco como opção, o pôster continua o padrão;
  - desenhos próprios em SVG (os fascistas trocaram de cobra para jacaré em seguida: "e se o fascista for um jacare? a arte da cobra ficou mt ruim, a do liberal ficou boa"; o jacaré segue o traço do pássaro, de perfil, de pé): pássaro de uniforme (quepe, gola e botões; pedido em seguida: "Os pássaros pode ter uniforme tbm e a cobra Hitler ter um design p diferenciar"), jacaré de uniforme (quepe, cinto, botões) e uma carta do Hitler com outro contorno (fundo preto, faixa vermelha; jacaré de casaco longo, quepe alto, braçadeira vermelha lisa, olho vermelho, sobrancelha franzida e boca aberta, com o punho batendo no púlpito). Depois, mais acabamento a pedido ("faz entao"): sombras, escamas, dentes, expressão nos olhos e medalha no pássaro. Nada de braço estendido no Hitler, para não ler como saudação. Pedidos para se aproximar de cartas oficiais e de uma expansão da Steam foram recusados. Por fim ("tem q mudar totalmente o estilo da ilustracao, faca mais caricatura", com uma ilustração de banco de imagens como exemplo do tipo de traço): tudo redesenhado em caricatura, com contorno preto grosso, cores chapadas, cabeça grande e expressão exagerada. Perguntado e respondido: fascista jacaré, Hitler naja. Nada foi copiado da imagem de exemplo. As leis e o tabuleiro voltaram para os símbolos (balança e caveira): "a ilustracao das leis nao deveria ter mudado, só a dos personagens"., também nos selos das leis e do tabuleiro.
- **Interpretações que precisaram ser feitas:** "outra linha de estilo" virou um segundo estilo escolhível, não uma troca do pôster. O partido investigado mostra o desenho do partido, nunca a carta do Hitler.
- **Não sei:** como as animações e a Didot ficam no iPhone de verdade (os testes rodam no Chromium).

## D8. Endereço de produção

- **Contexto (13/10/2026):** o job "produção" falhou depois do merge do #4. O script conferia `https://secret-hitler.vercel.app`, um endereço suposto no começo que é de outro projeto ("Secwet Hitwew UwU", sem carimbo de commit). O deploy da Vercel tinha dado certo. Endereço informado pelo Lucas: https://secret-game-gamma.vercel.app/ (conferido no mesmo dia: serve o commit `6e6e539`).
- **Decisão:** esse é o padrão do script e do `CLAUDE.md`. A variável `APP_PROD_URL` do repositório, se existir, manda. O script passa a dizer quando o endereço é de outro site ou pede login da Vercel.
- **Não sei:** se o domínio vai mudar (domínio próprio). Se mudar, basta a variável `APP_PROD_URL`.

## D9. Mais animações e melhorias

- **Contexto (13/10/2026):** 12 propostas (6 animações, 6 melhorias), "faca todas animacoes e melhorias".
- **Decisão:** todas, como estão nos requisitos 13 a 17 e na seção Interface do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - Som e vibração ficam ligados por padrão e saem juntos num botão só ("Som e vibração" em Aparência).
  - Nenhum som em ação secreta (o descarte toca papel, mas o descarte não diz qual lei foi).
  - O desfazer vale só para escolhas públicas (indicação e votação) e some ao abrir um segredo, para ninguém refazer depois de ver cartas.
  - "Quem mentiu na investigação": o app não sabe o que o presidente disse; o resumo mostra o que a investigação mostrou de verdade, e a mesa compara.
  - Virado para baixo é o celular com mais de 150° de inclinação; o iPhone só informa isso depois de a pessoa permitir, pedido no primeiro toque em "mostrar".
  - Com "reduzir movimento", nada anima e nada espera (o descarte segue na hora); os testes ponta a ponta rodam assim, mais uma rodada com movimento.
- **Não sei:** como os sons soam no alto-falante de um celular, e se a permissão de movimento do iPhone aparece como esperado.

## D10. Jogar sozinho contra a IA

- **Contexto (26/10/2026):** "eu quero conseguir jogar sozinho … com e contra jogadores controlados pela IA". Depois: "pode ter níveis de dificuldade … baseado no quanto eles compram um blefe, o quanto eles vão contando as cartas", com o truco (D3 e requisito 9 do truco) de referência: "a IA, no modo extremo, ela já começa a contar as cartas. Ela não faz metajogo"; e "as IAs não podem extrapolar o comando delas … uma IA mestre e outras IAs … para garantir que nenhuma extrapole a sua função".
- **Decisão:** lugares da IA na mesa, quatro níveis como no truco (fácil, médio, difícil, extremo), e um juiz (`src/core/judge.ts`) no papel da "IA mestre": é o único código que segura a partida inteira; a cada vez, monta a visão de um lugar (o que aquela pessoa saberia sentada ali), faz uma pergunta com as respostas permitidas e joga a resposta pelas regras. O código que decide (`src/core/ai.ts`) só recebe essa visão. Requisitos 18 a 21 do `CLAUDE.md`.
- **Como a IA pensa:** pesa todas as divisões de papéis que cabem no que ela sabe pelo quanto cada uma explica o que aconteceu (leis de cada governo, o que presidente e chanceler disseram, investigações, quem foi eleito chanceler na zona do Hitler sem a partida acabar, quem foi eliminado sem a partida acabar). Os níveis mudam o descuido, a memória, quanto acredita no que ouve (comprar blefe) e, no extremo, a conta do baralho (a chance de cada mão pelas leis que ainda podem sair). Como fascista, mente quando a verdade entrega, coordena a história com o aliado e, do difícil para cima, deixa o Hitler limpo antes da 3ª lei fascista e elimina quem pegou um aliado mentindo; no extremo, só conta "tirei 3 fascistas" quando a conta do baralho deixa isso crível.
- **Interpretações que precisaram ser feitas:**
  - "IA" aqui é regra e conta no próprio aparelho, sem servidor nem modelo de linguagem: o app continua uma página estática, sem custo e sem internet.
  - "Jogar sozinho" e "com poucos": a IA completa qualquer mesa que tenha pelo menos uma pessoa. Com mais de uma pessoa, o celular continua passando de mão para os segredos.
  - Com IA na mesa, o voto deixa de ser em voz alta: cada pessoa toca no próprio voto e as IAs votam junto (a IA não ouve a sala). Todos os votos ficam no registro, como na mesa de verdade.
  - A IA precisa ouvir o que as pessoas dizem: depois de governar, investigar ou espiar, a pessoa escolhe o que diz (pode mentir ou ficar calada) até a próxima eleição. As IAs falam sempre; as liberais dizem a verdade.
  - O nível vale para todas as IAs da mesa, dos dois lados.
  - "Não faz metajogo": nenhuma IA muda o jeito de jogar pelo jeito que as outras jogam nem pelo histórico de partidas anteriores.
- **Balanceamento (26/10/2026, pedido do Lucas):** "os fascistas da IA têm que melhorar também … o jogo tem que ficar o mais balanceado possível … não pode ficar um jogo tendencioso para nenhum dos lados". A primeira versão deixava os liberais vencerem 28% no fácil e 65% no extremo, e o nível dos fascistas quase não pesava. A medição também tinha um erro: a mesa inteira votava no nível do presidente; agora cada lugar decide no próprio nível (`Player.level`, só usado pelas medições). O que mudou:
  - Fascistas do difícil para cima pensam em como a mesa vai ver cada jogada (`image`): para cada jeito de jogar a mão, calculam, com o mesmo raciocínio da mesa, quanto mais desconfiariam deles e do Hitler, contra o valor de uma lei fascista. O Hitler que não conhece o time faz o mesmo com a própria imagem.
  - Fascistas do difícil para cima indicam o Hitler sempre que podem a partir da 3ª lei fascista, e investigam o Hitler para abonar ("é liberal").
  - Descuido em dois: `noise` (escolher e votar sem pensar) e `slip` (descartar a lei errada). No fácil, errar a lei 30% das vezes entregava o jogo aos fascistas, porque o baralho é quase só fascista.
  - Calibrados por medição, mantendo a ordem dos níveis: memória do fácil 2 → 4 governos; `lie` (quanto desconfia do que ouve) 0 / 0,3 / 0,35 / 0,4, antes 0 / 0,4 / 0,7 / 0,85. Acreditar que o fascista mente quase sempre deixava o liberal certeiro demais.
- **Medido (26/10/2026, `node scripts/ai_bench.mjs 400`, 6.400 partidas só de IA, mesas de 5 a 10):** vitórias liberais, liberais no nível da linha e fascistas no da coluna:

  | liberais \ fascistas | fácil | médio | difícil | extremo |
  |---|---|---|---|---|
  | fácil | 48% | 39% | 22% | 21% |
  | médio | 69% | 51% | 39% | 37% |
  | difícil | 81% | 69% | 47% | 44% |
  | extremo | 85% | 72% | 52% | 47% |

  Com a mesa toda no mesmo nível (a diagonal, que é o jogo do app), os liberais vencem entre 47% e 51%. Fora da diagonal, quem tem o nível maior vence mais, dos dois lados. Erro da medida: cerca de 2,5 pontos para cada lado. Todas as partidas terminaram.
- **Medido também (mesmo comando, 1.200 partidas por nível, uma IA média no lugar de "você"):** como liberal, você vence 51% no fácil, 53% no médio, 45% no difícil e 45% no extremo; como fascista, 57%, 48%, 43% e 38%. O nível agora é dificuldade dos dois lados.
- **Corrigido junto:** depois de um veto aceito o baralho não era reabastecido, e o presidente seguinte podia tirar menos de 3 leis (achado por uma partida só de IA que travou; agora há um caso para isso).
- **Não sei:** como a IA se sai contra gente de verdade (só foi medida contra ela mesma); se os textos das falas soam naturais; quanto tempo de "pensando" é confortável num celular.

## D11. Treino, nomes históricos, ata e anúncio da lei

- **Contexto (27/10/2026):** "quero uma opção de treino onde posso escolher meu papel quando jogo contra IAs, quero nomes reais de liberais e fascistas no jogo, quero uma opção de assistência que mostra na ata quem aprovou cada lei"; e logo depois: "precisa ter uma animação ali pra na hora da aprovação da lei, exemplo A aprovou lei B". Sobre os nomes, perguntei e o Lucas escolheu "históricos, misturados": nomes de políticos reais dos anos 30, sem ligação com o papel sorteado.
- **Decisão:** requisitos 22 a 25 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - Nomes: Churchill, Roosevelt, Blum, Azaña, Beneš e Matteotti (liberais e democratas da época); Mussolini, Franco, Mosley, Goebbels, Plínio Salgado e Quisling (fascistas). O Hitler fica de fora porque é papel. O nome nunca segue o papel: se seguisse, entregaria o jogo. Como no truco (D6 de lá), das figuras reais só se usa o nome; o que elas "dizem" são as falas do jogo ("disse que tirou 2 fascistas").
  - Treino: só vale com uma pessoa na mesa. Com mais de uma, a escolha de uma entregaria algo às outras. O papel escolhido entra por troca com o lugar que o tirou, então o resto da mesa continua sorteado. As IAs não ficam sabendo.
  - "Na ata quem aprovou cada lei": a ata é um cartão novo, com cada lei, o presidente e o chanceler, e quem votou Ja! no governo que a aprovou, mais a soma por jogador. É só informação pública, a mesma que daria para anotar num papel; não mostra mão, partido nem papel. Sem IA na mesa, o celular não guarda os votos (são em voz alta), e a ata diz isso.
  - A animação vale em toda mesa, com IA ou sem: a lei aprovada entra no alto da tela com os nomes do presidente e do chanceler ("O caos aprovou" quando entra pelo caos). Com "reduzir movimento", o aviso aparece parado pelo mesmo tempo.
- **Não sei:** se os nomes históricos incomodam alguém na mesa; se a ata deixa o jogo fácil demais (por isso ela é desligável e vem desligada).

## D12. Tema liberais x comunistas, nomes conhecidos, anotações e votos

- **Contexto (27/10/2026):**
  - "quero nomes mais conhecidos de fascistas e liberais, e faz o seguinte, inclui uma versão onde são fascistas x comunistas … um novo modo de temas e nomes". Perguntei quem é a maioria e quem é o time escondido, e o Lucas respondeu "liberais x comunistas"; para o desenho, "comunistas é lobo branco e o stalin é um urso".
  - "avaliar se as votações estão balanceadas".
  - "quero tbm um bloco de anotações do jogador humano marcando quem é liberal e quem é fascista, se eu conheço os papéis eles já vêm marcados, senão eu vou marcando"; "Libs, Nazis and Coms pode ser abreviação".
- **Decisão:** requisitos 22, 26 e 27 do `CLAUDE.md`; temperamento das IAs no 18.
- **Interpretações que precisaram ser feitas:**
  - O tema novo troca os fascistas pelos comunistas, e o Hitler pelo Stalin, como time escondido. Regras, poderes, IAs e balanceamento são os mesmos: por dentro o lado escondido continua sendo `F`. Os votos viram Da!/Niet!, e o alto da tela diz "Secret Stalin".
  - Nomes "mais conhecidos":
    - Liberais x Fascistas: Churchill, Roosevelt, De Gaulle, Truman, Eisenhower e Kennedy; Mussolini, Franco, Goebbels, Göring, Himmler e Salazar.
    - Liberais x Comunistas: Kennedy, Reagan, Thatcher, Churchill, Truman e Roosevelt; Lenin, Mao, Fidel, Che, Trotsky e Ho Chi Minh.
    - Não ficam presos aos anos 30, para serem conhecidos.
  - Anotações: só com uma pessoa na mesa (com mais gente, as outras veriam). Vem marcado o que a pessoa sabe de certeza pelas regras: o time (fascista vê fascistas e Hitler; Hitler na mesa de 5 ou 6 vê o fascista) e o resultado das próprias investigações.
- **Votações (medido em 27/10/2026, 800 partidas só de IA por nível):** os lados estavam equilibrados, mas a votação era monótona.
  - 82% dos governos eram eleitos, e no difícil e no extremo 55% das votações eram unânimes: as IAs liberais com a mesma informação votavam em bloco.
  - Cada IA ganhou um temperamento sorteado (`mood`, de -1 a 1, que move em até 0,2 o risco que ela aceita num governo).
  - Depois: unânimes 13% a 31% conforme o nível; eleitos cerca de 82%, porque os presidentes indicam quem parece mais limpo.
  - O sinal continua lá: um liberal vota Ja! em cerca de 80% dos governos limpos e em cerca de 53% dos que têm fascista. Os fascistas votam Ja! em cerca de 92% dos governos com aliado e 76% dos sem.
  - O fácil foi recalibrado depois disso: memória de 5 governos e `lie` 0,1.
- **Balanceamento depois disso (27/10/2026, `node scripts/ai_bench.mjs 400`):** com a mesa no mesmo nível, os liberais vencem 49% no fácil, 53% no médio, 47% no difícil e 47% no extremo (erro de cerca de 2,5 pontos). "Você" (uma IA média num lugar): como liberal, 52%, 49%, 44% e 44%; como fascista, 61%, 56%, 45% e 43%. O tema não entra na conta, porque por dentro o jogo é o mesmo.
- **Não sei:** se os nomes e o tema incomodam alguém na mesa; se o caderno deixa o jogo fácil demais (ele só anota o que a pessoa já sabe ou acha).

## D13. Conversa, treinador, o que pensavam de você, velocidade

- **Contexto (27/10/2026):** propus melhorias e o Lucas pediu "faz o 1-4":
  1. as IAs conversam (acusam e defendem);
  2. dicas do treinador com as contas;
  3. no fim, o que as IAs pensavam de você;
  4. a velocidade da IA.
- **Decisão:** requisitos 28 a 31 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - Conversa: até 2 IAs por rodada, no começo da rodada, cada uma uma frase ("Desconfio de X", "Confio em Y") ou calada. A pessoa não fala por enquanto (só diz o que viu, como já fazia).
  - As IAs não levam a conversa em conta nas contas delas. Se levassem, os fascistas aprenderiam a usá-la e o balanceamento da D10 mudaria; do jeito que está, a conversa é informação para as pessoas. O liberal fala o que acha de verdade, e isso é tão confiável quanto ele.
  - Treinador: separado do treino de papel (D11), porque serve em qualquer partida contra a IA com uma pessoa só. As contas são as do nível extremo, com só o que o lugar da pessoa sabe; nada de papel alheio.
  - O que pensavam de você: só das IAs que não sabiam o seu papel (as do seu time sabiam, e a conta delas seria 0 ou 100%). Uma linha pequena por IA, do começo ao fim, em vez de um gráfico com 9 cores.
  - Velocidade: lenta 2,4 s, normal 1,2 s (como antes), rápida 0,5 s. Ver o próprio papel continua na hora.
  - Anotações no lugar certo (27/10/2026, "as anotações têm que aparecer do lado da mesa de jogo, senão fica muito perdido … eu tenho que scrollar a tela toda hora"): o caderno passou para dentro da lista de jogadores, cada anotação na linha do jogador, e a lista subiu para logo abaixo da fase da vez, acima do tabuleiro. Depois ("não daria pra anotação ser uma tab collapsable?"): o caderno abre e fecha num botão "Anotar"; fechado, cada jogador marcado mostra só a etiqueta (Libs, Nazis, Coms) e o que se sabe de certeza; o app lembra se ficou aberto.
- **Balanceamento conferido (27/10/2026, `node scripts/ai_bench.mjs 300`):** com a conversa, a mesa no mesmo nível dá vitórias liberais de 47%, 46%, 46% e 47% (erro de cerca de 3 pontos); "você" (uma IA média num lugar) vence como liberal 49%, 51%, 47% e 47%, e como fascista 57%, 51%, 46% e 42%.
- **Não sei:** se as falas soam naturais numa partida inteira; se as dicas deixam o treino fácil demais (por isso vêm desligadas).

## D14. Painel lateral de anotações, desconfiança ao vivo, "undefined"

- **Contexto (27/10/2026):** "ainda fica aparecendo uns undefined nas ações dos jogadores"; "quero também um ao vivo do desconfiança rate que possa ser ligado e desligado, e a aba de anotações não ficou lateral como eu pedi".
- **Decisão:** requisitos 27 e 32 do `CLAUDE.md`.
- **O "undefined":** reproduzido em 7 de 12 partidas jogadas pela tela. Era a tela "Vez da IA" na hora em que uma IA ia falar (conversa da D13): não havia texto para essa ação. A conversa e as falas sobre a mão agora acontecem ao lado da fase, sem trocar a tela, e o e2e confere a cada passo da partida contra a IA que nada na tela diz "undefined" ou "NaN".
- **Interpretações que precisaram ser feitas:**
  - "Lateral": uma aba vertical na borda direita da tela que abre um painel deslizante por cima do jogo, e fecha pela mesma aba. Num celular não cabe um painel fixo ao lado de uma coluna de 393 px; em tela de 1400 px ou mais, o painel fica aberto ao lado do jogo.
  - Desconfiança ao vivo: uma barra por IA na lista de jogadores, ligada e desligada por um botão na própria lista, e desligada de início. A IA que sabe o seu papel mostra a conta que faria se não soubesse. Mostrar 0% ou 100%, ou esconder a barra só das que sabem, entregaria os fascistas para um liberal.
- **Não sei:** se a barra ao vivo deixa o jogo fácil demais (ela vem desligada); como fica o painel no Safari do iPhone.

## D15. O ponto crucial

- **Contexto (27/10/2026):** "no caso de eu ser hitler/stalin ou fascista mostre o ponto crucial da decisão que fez desconfiança subir".
- **Decisão:** requisito 33 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - "Ponto crucial" é o acontecimento (lei, veto, caos, investigação, eliminação) depois do qual a desconfiança média das IAs sobre a pessoa mais subiu. As falas sobre a mão contam junto com o governo delas.
  - Aparece no fim (com as IAs que não sabiam o papel, como o gráfico) e ao vivo, junto da desconfiança ao vivo. A versão ao vivo usa a mesma conta das barras, em que quem sabe o papel conta como se não soubesse, para não entregar ninguém.
  - Às vezes o ponto crucial não é uma jogada da pessoa: um governo dos outros que sai limpo faz a desconfiança sobrar para quem não se mostrou. O cartão diz isso.
  - Só para quem é do lado escondido, como foi pedido.
- **Não sei:** se uma frase por momento basta, ou se a pessoa vai querer ver os três maiores.

## D16. O raciocínio das IAs

- **Contexto (27/10/2026):** "Preciso que detalhe mais, entendeu? Como cada IA está pensando para a gente encontrar bugs. Por que que ele estava com mais dúvida de mim? Qual ação que eu fiz que levou ele a fazer isso?"
- **Decisão:** requisito 34 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - É uma ferramenta para achar bug, não uma dica: mostra os papéis, as mãos e as mentiras. Por isso, durante a partida, só abre depois de um aviso, e a escolha fica guardada (`S.debug`) para não perguntar toda partida. No fim, abre sem aviso.
  - O motivo é escrito por quem decide, no momento da decisão (`decideWhy` em `src/core/ai.ts`), com as contas que ela de fato usou, em vez de ser adivinhado depois. Escrever não muda a decisão: 120 partidas só de IA com as mesmas sementes saíram iguais antes e depois.
  - "Qual ação levou a isso" é a trilha (`trail`): a conta da IA sobre um jogador no começo e depois de cada lei, veto, caos, investigação, espiada e eliminação, com antes e depois. As IAs não usam os votos nem a conversa nas contas, então esses não aparecem como momento.
  - O que a IA pensa de verdade, não a conta "como se não soubesse" da desconfiança ao vivo: um fascista mostra 0% e 100% para quem conhece.
  - Numa mesa com IA, com uma pessoa ou mais, a aba fica na borda esquerda (as anotações ficam na direita), e nunca fica aberta sozinha em tela larga.
- **Não sei:** se o painel em tela de celular, com textos longos, fica legível o bastante para caçar bug; e se alguém vai querer exportar isso em arquivo.

## D17. A tela da partida não esconde a jogada

- **Contexto (27/10/2026):** "dá pra melhorar a usabilidade? UI/UX?". Joguei uma partida contra a IA em 393 px e propus 9 pontos; o pedido foi "quero que priorize os de 1 a 4".
- **Decisão:** requisito 35 do `CLAUDE.md`. Os quatro: as abas laterais cobriam o texto e os botões; a fase da vez ficava abaixo das dicas; o Ja! parecia desativado (texto creme sobre azul-claro no tema escuro, contraste perto de 1,5:1); as animações caíam em cima do que se lia.
- **Interpretações que precisaram ser feitas:**
  - As duas abas viraram uma barra fixa embaixo, com espaço reservado no fim da página. Qualquer aba presa na borda cobriria alguma coisa numa tela de 393 px.
  - Só um painel aberto por vez, porque no celular um cobriria o outro. Em tela larga as anotações continuam fixas ao lado, como antes.
  - O carimbo da votação e o anúncio da lei ficaram menores e vão para a faixa de quem governa, logo abaixo do topo. É o que menos atrapalha por 1 ou 2 segundos.
  - Os avisos curtos ("Franco indicou Lu") ficam no espaço da barra de baixo, por cima dos botões dela, e deixam o toque passar.
  - O texto sobre as cores cheias de partido (votos, papéis, tabuleiro) passou a seguir o tema: escuro no tema escuro, claro no claro.
- **Não sei:** se cobrir os botões da barra por 3,5 s com o aviso incomoda no uso real. Os itens 5 a 9 da lista (mesa no topo, tela inicial mais curta, botão de começar, "?" maior, fim de jogo em abas) ficaram para depois.

## D18. Menos rolagem

- **Contexto (27/10/2026):** "faz os itens de 5 a 9", os pontos que ficaram de fora da D17: a mesa no topo, a tela inicial mais curta, o botão de começar, o "?" maior e o fim de jogo em abas.
- **Decisão:** requisito 36 do `CLAUDE.md`, e os requisitos 15 e 16 ajustados.
- **Interpretações que precisaram ser feitas:**
  - "Mesa no topo" é uma faixa compacta, sem toque, com os nomes na ordem de assento. A lista completa (marcas, barras da desconfiança ao vivo) continua mais abaixo, porque é ali que se mexe.
  - Na faixa, a cor vem do que a pessoa sabe (com borda) ou marcou no caderno (só a barra lateral): as duas coisas que ela consultaria rolando.
  - "Mais opções" e "Como joga" abrem por botão do próprio app, e não por `<details>`: a tela é repintada a cada jogada e um `<details>` fecharia sozinho. Não ficam guardados, e o app abre sempre com os dois fechados.
  - Botão desativado (começar sem gente bastante, descartar sem escolher a carta) passou a ser tracejado e apagado, em vez do vermelho apagado que parecia erro.
  - Abas do fim: Resultado, Resumo, Registro. O raciocínio das IAs continua na barra de baixo.
- **Não sei:** se a faixa de lugares, com 9 ou 10 pessoas, ocupa linhas demais no celular; com 7 são três linhas.

## D19. Jogadas boas e ruins no fim

- **Contexto (27/10/2026):** "no final quero que me sugira quais jogadas foram boas e ruins dependendo se o modo assist tiver on".
- **Decisão:** requisito 37 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - "Dependendo se o modo assist tiver on" quer dizer que aparece só com a assistência ligada. Com ela desligada, a aba Resultado mostra um botão que a liga.
  - Vale para cada pessoa na mesa, não só quando se joga sozinho. No fim os papéis já estão abertos para todos.
  - Uma jogada é julgada de dois jeitos juntos: pelo que deu e pelo que dava para saber na hora. Para "o que dava para saber", uso as contas do nível extremo, feitas só com o que aquele lugar sabia. Uma indicação, um voto, uma eliminação ou uma eleição especial que deu errado só conta como ruim se, pelas contas, havia opção claramente melhor (10 pontos de diferença na indicação, eliminação e eleição especial; 3 pontos acima do risco de um par qualquer no voto). Assim o primeiro voto, às cegas, nunca é chamado de ruim.
  - O liberal é julgado pelas leis (jogar fora uma liberal pesa 3), pelas mentiras e por onde pôs a confiança. O lado escondido é julgado por empurrar lei do time sem a mesa perceber: se a desconfiança da mesa sobre ele subiu 15 pontos ou mais, a lei sai como jogada ruim. Também conta a história que não fechou e cobrir ou entregar aliado.
  - Peso para ordenar: eliminar o Hitler ou eleger o Hitler na zona vale 5, jogar fora uma liberal vale 3, e os votos certos valem 0,5 ou 1. Aparecem 4 de cada lado, e "Ver todas" mostra o resto.
- **Não sei:** se os pesos batem com o que um jogador experiente chamaria de jogada boa ou ruim. Também não sei se o lado escondido deveria ser julgado pelo voto.

## D20. Mesa menor num toque; virar o celular não fecha mais o segredo sozinho

- **Contexto (27/10/2026):** "Não tem como diminuir a quantidade de pessoas da mesa de uma forma rápida. E deveria ter como. Tirar essa regra que o celular tem que estar virado para baixo para ele mostrar a carta. Isso às vezes é muito chato quando eu estou deitado e ele não pega bem esse sensor. Ou isso pode ser simplesmente desativado."
- **Decisão:** requisitos 13 e 18 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - "Completar a mesa até" virou "Lugares na mesa". Escolher um número menor tira as últimas IAs da lista. Pessoa nunca sai por esse caminho: se houver mais pessoas que o número escolhido, a mensagem pede para tirar alguém pelo ×. O número atual aparece marcado. "Limpar a mesa" tira todo mundo, com dois toques.
  - O sensor fecha o segredo quando o celular fica de tela para baixo. Deitado, segurando o celular acima do rosto, ele fica nessa mesma posição. Das duas opções do pedido, escolhi deixar desligado de início, com um botão para ligar no cartão "Aparência". Sair do app continua fechando o segredo, porque isso não engana.
- **Não sei:** se alguém vai querer o sensor ligado. Se ninguém quiser, dá para tirar de vez.

## D21. Dá tempo de ler o que o governo disse

- **Contexto (27/10/2026):** "a animacao do claim de votacao ta mt rapida, mal dá tempo de ler o que o presidente e o chaceler disseram que receberam".
- **Decisão:** requisito 31 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:** fiz duas coisas. Depois que uma IA diz à mesa o que recebeu, investigou ou espiou, a próxima jogada espera mais (`CLAIM_HOLD`). E o que o último governo, ou a última investigação, disse fica escrito numa linha abaixo da faixa da mesa até o próximo. Assim não depende de pegar o aviso passando.
- **Dois bugs no mesmo assunto (27/10/2026):** "aparece pra ver a carta de um jogador IA, fora que a telinha de acao fica tremendo pq toda hora eh sobrescrita por eventos enquanto o presidas vota".
  - Enquanto uma IA falava da própria mão, a tela mostrava a fase pelo lado de quem joga, e quando a fase era de um segredo da IA aparecia o portão "Sou X, mostrar". Agora a fase de uma IA mostra sempre a IA decidindo.
  - A cada fala ou conversa de IA, a fase entrava de novo, deslizando, e um segredo aberto ou um voto meio contado se perdia. A tela só considera que a fase mudou quando o jogo anda de verdade (governo, rejeição, poder, eleição), não com o que se diz ao lado.
- **Não sei:** se os 2,5 s a mais no normal bastam para quem lê devagar. A velocidade "lenta" dá 4 s.

## D22. IA sem metajogo, mas não ingênua

- **Contexto (27/10/2026):** um liberal que testou o chanceler (passou 1 fascista e 1 liberal tendo tirado 2 liberais, e contou) virou 100% fascista para a IA. Depois: "da mesma forma se fosse fascista e usasse o falso descarte pra testar o chanceler [...] isso precisa ser balanceado corretamente, veja todos os casos"; "a IA n pode ter metajogo mas tbm n pode ser ingenua [...] eu sendo hitler posso aprovar lei liberal no inicio para disfarçar e esse cenário uma IA deve saber que existe no nivel adequado de dificuldade"; "varra a logica da IA buscando por incongruencias desse tipo".
- **Decisão:** requisito 18 do `CLAUDE.md`. O que a IA não sabia, em todos os níveis ou só nos de baixo:
  1. **Uma jogada virava certeza.** O liberal nunca jogava fora uma liberal, nunca errava a lei e nunca errava a fala. Agora há sempre uma margem (`SLIP_GUESS`, 3%), em todos os níveis.
  2. **Teste do chanceler.** Com 1 fascista e 2 liberais, o liberal pode passar uma de cada para ver o que o chanceler aprova, e conta a verdade. A IA calcula isso em todos os níveis (`TEST_GUESS`: 15% no difícil e no extremo, metade nos de baixo). Os liberais do difícil e do extremo testam quando têm dúvida sobre o chanceler, antes da zona do Hitler (`test` em `AI`). Um fascista pode se esconder atrás do "teste": os do difícil e do extremo contam a verdade, metade das vezes, quando o chanceler aprovou a liberal. O treinador chama de teste, não de "história que não fecha". A revisão do fim julga o teste pelo que custou e pelo que mostrou.
  3. **Hitler se disfarçando.** Antes da 3ª lei fascista, o Hitler deixa passar liberal, e o time passa liberal para ele aprovar. O difícil e o extremo sabem disso (`BOSS_CLEAN`, 60%); fácil e médio o tratam como qualquer fascista.
  4. **A espiada não era conferida.** No difícil e no extremo, o que alguém disse ter espiado vira a mão que o presidente seguinte tem de ter, nos mundos em que quem espiou é liberal.
  5. **Os votos eram ignorados.** No extremo, o fascista que sabe que há aliado no governo vota Ja! (`ALLY_JA`, 80%), contra 60% de qualquer outro (`ANY_JA`).
  6. **Indicação, eliminação e eleição especial não diziam nada.** No difícil e no extremo, o presidente fascista que conhece o time indica um aliado uma vez e meia mais que o acaso (`ALLY_PICK`); e os fascistas desses níveis, sabendo disso, indicam aliado menos (35% contra 60%). No difícil e no extremo, um fascista que conhece o time quase nunca elimina um aliado e prefere dar a presidência a um.
  7. **A IA muito desconfiada rejeitava qualquer governo.** O temperamento tirava até 15 pontos da folga e a deixava abaixo de zero, então nem um governo comum passava. A folga agora nunca é menor que zero.
- **Interpretações que precisaram ser feitas:** fácil e médio continuam mais ingênuos de propósito, porque é isso que separa os níveis. Mesmo assim, em nenhum nível uma jogada sozinha prova o papel de alguém. A conversa das IAs continua fora das contas (D13).
- **Para o balanceamento não pender:** os fascistas também se adaptam. No extremo, com a mesa já desconfiando do aliado, votam como um liberal votaria 80% das vezes, e a leitura dos votos ficou mais fraca (`ALLY_JA` 80%). No difícil e no extremo indicam aliado menos (35%). No fácil mentem mais (`act` 0,4). A IA muito desconfiada não rejeita mais todo governo, e isso tinha dado 5 pontos aos liberais no fácil.
- **Medido (27/10/2026, `node scripts/ai_bench.mjs 200`):** com a mesa no mesmo nível, os liberais vencem 54% no fácil, 52% no médio, 55% no difícil e 52% no extremo (erro de cerca de 3,5 pontos; antes eram 47%, 46%, 46% e 47%). "Você" (uma IA média num lugar) vence como liberal 48%, 54%, 46% e 49%, e como fascista 60%, 53%, 41% e 41%.
- **Não sei:** se 15% de teste e 60% de disfarce do Hitler batem com mesas de pessoas de verdade. Medi só contra as próprias IAs. As partidas exportadas (quando houver) servem para conferir isso.

## D23. Partidas guardadas no aparelho, para exportar

- **Contexto (27/10/2026):** "pq n vc n coleta metricas dos meus jogos, pra ir refinando a logica conforme eu vou jogando e treinando a IA?" Escolhido entre as opções: "guardando as partidas no celular com o botão de exportar". E: "esse projeto n precisa de servidor, eh desnecessario".
- **Decisão:** requisito 38 do `CLAUDE.md`. Isso muda o escopo: antes, histórico de partidas ficava de fora. Agora as partidas terminadas são guardadas, mas só para exportar, sem tela de histórico.
- **Interpretações que precisaram ser feitas:**
  - Fica guardada a partida inteira, inclusive o raciocínio das IAs, porque é com ele que se vê onde a IA errou sobre a pessoa. A chave é separada da do app (`secrethitler.history.v1`), para uma lista longa não deixar cada jogada mais lenta de salvar.
  - O limite é de 30 partidas, umas 2 a 3 MB. Se faltar espaço, as mais antigas saem primeiro. Partida encerrada no meio não é guardada.
  - Para exportar, uso o compartilhar do celular quando ele aceita arquivo, porque é o caminho mais curto até mandar o arquivo numa conversa. Quando não aceita, o arquivo é baixado.
  - Os dados servem para calibrar as taxas que as IAs supõem (teste do chanceler, disfarce do Hitler, mentiras, votos) pelo que pessoas fazem de verdade. As IAs não aprendem o estilo de uma pessoa: isso seria metajogo (D10).
- **Não sei:** como o Safari do iPhone se comporta ao compartilhar um `.json`. Não testei num iPhone.

## D24. Nomes e bichos por continente

- **Contexto (27/10/2026):** "quero poder escolhes facistas, comunistas e liberais por continente, pode usar o nome de lula mas troque por polvo para evitar qualquer problema judicial, quero fidel castro, hugo chavez, nicolas maduro etc, pinochet, etc". Depois: "faz sentido mudar a arte baseado nos animais de cada pais? leao pra africa? onça para americas"; "os fascista precisam mudar tbm"; "precisa ter um animal pro hitler e stalin em cada pais"; e a Oceania.
- **Decisão:** requisito 22 do `CLAUDE.md` e a parte de desenhos da Interface. Os bichos foram escolhidos com a pessoa, papel a papel, com prévia aprovada.
- **Interpretações que precisaram ser feitas:**
  - O continente vale para a partida inteira (`Game.region`): nomes das IAs e desenhos. São seis opções: Mundo (o de antes), Américas, Europa, Ásia, África e Oceania. Cada uma tem 12 nomes por tema, os dois lados misturados. A exceção é a Oceania, que usa os nomes do mundo, porque de lá quase não há fascistas e comunistas conhecidos (o resto seria gente viva de golpe em Fiji).
  - As Américas incluem os pedidos: Fidel, Chávez, Maduro e "Polvo" no tema comunista, Pinochet no tema fascista. A maioria das figuras já morreu; as vivas são Maduro e "Polvo". O cartão diz que o nome é só apelido de jogo e que o papel é sorteado.
  - Ficaram fora dos vilões a águia (símbolo do Reich) e o gorila na África (macaco representando o continente africano é imagem racista, em qualquer papel). Rato e panda entraram a pedido: o rato é o próprio Hitler, e o panda de cachimbo é sátira de governo.
  - Cada bicho veste a farda do papel, para o papel continuar reconhecível pela roupa: o liberal de azul, o fascista de marrom, o Hitler de casaco no púlpito, o comunista de túnica vermelha, o Stalin de túnica cáqui com cachimbo.
- **Não sei:** se o casuar e o ornitorrinco são reconhecíveis para quem não conhece os bichos. O Hitler da Ásia começou escorpião e virou aranha, escolhida entre três prévias (vespa-mandarina, tubarão, aranha).

## D25. Galeria com todos os desenhos

- **Contexto (27/10/2026):** "quero uma opcao pra ver todas aas artes dentro do site".
- **Decisão:** requisito 22 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:** a galeria abre pelo cartão "Tema do jogo", que é onde se escolhe o continente, e ocupa a tela inicial até tocar em "Voltar". Mostra, por continente e por tema, o liberal, o membro do lado escondido e o líder, cada um com o nome do bicho. O liberal aparece nos dois temas porque é o mesmo desenho. Não abre durante uma partida.
- **Não sei:** se vale mostrar também os símbolos das leis (balança, caveira, estrela).

## D26. Denunciar à mesa, e IAs com personalidade

- **Contexto (28/10/2026):** numa partida contra a IA, o liberal votou Nein! duas vezes no governo Trujillo + Alfonsín, mas dois liberais da IA votaram Ja! e elegeram o Hitler chanceler. Pedido: "quero poder raise awareness sobre possiveis nazi"; "na aba de anotacao bota um botao denunciar, que poderia ser unitario ou um compartilhar tudo q sei da mesa"; as falas de todos contam, "porem uma acusacao [baseada] pesa o dobro, entao a IA deve buscar na Ata do jogo como se fosse um humano lembrando do q ocorreu"; "preciso ver como cada um reage"; "criar perfis de IA, um mais critico, um mais desconfiado, um cetico… IA q blefa muito, blefa pouco, IA que eh centro, IA chaotic evil, IA lawful good"; "pra cada play vc sorteia os temperamentos".
- **Decisão:** requisitos 18, 27 e 28 do `CLAUDE.md`. Isto muda a D13: a fala deixa de ser só para as pessoas.
- **Interpretações que precisaram ser feitas:**
  - Denunciar é a mesma fala das IAs ("Desconfio de X"). Quem está marcado liberal no caderno é abonado ("Confio em X"). "Contar tudo" fala de cada um que está marcado ou que a pessoa sabe de certeza, inclusive o próprio time, se ela for fascista: a escolha é dela. Cada pessoa fala uma vez por rodada de cada jogador, para não virar spam. A fala da pessoa não tira a vez de uma IA falar.
  - Como a fala pesa: cada divisão de papéis é pesada pela chance de quem falou, no lado dele nessa divisão, dizer aquilo. O liberal aponta para o lado errado só por engano (`SLIP_TALK`); o fascista aponta para o lado errado `TALK_LIE` das vezes. O peso fica elevado a `TALK_W`, o que dá pouco. "Baseada" virou "a ata confirma" (`backed`): o acusado esteve num governo que aprovou lei fascista ou cuja história não fechou, ou o abonado esteve num que aprovou liberal com a história fechando. Aí o expoente dobra. A ata só conta até onde aquela IA lembra (a memória do nível).
  - As reações (concorda, não sabe, discorda) são palavras, sem peso nas contas, para uma reação não puxar a outra em cascata. O liberal reage pelo que acha depois de ouvir. O fascista reage pelo time: concorda quando isso leva a mesa para o lado errado e defende o aliado, mas o blefador às vezes entrega um aliado para parecer limpo.
  - Personalidades, de "lawful good" a "chaotic evil": certinho, desconfiado, cético, crítico, centrado, blefador e caótico. São sorteadas a cada partida, todas diferentes enquanto houver. Elas aparecem para a pessoa no caderno e no raciocínio, porque numa mesa de verdade se conhece o jeito dos amigos, e o jeito não diz nada do papel. O temperamento sorteado de antes continua, mas agora mexe pouco em volta do que a personalidade dá.
  - O resumo do fim repetia a linha "Você votou Nein! em Trujillo + Alfonsín" quando o mesmo par era votado duas vezes. O voto que perdeu o jogo agora diz quem votou Ja!.
- **Medido (28/10/2026, `node scripts/ai_bench.mjs 200`):** com as falas pesando e as personalidades sorteadas, e a mesa toda no mesmo nível, os liberais vencem 54% (fácil), 53% (médio), 52% (difícil) e 51% (extremo). As partidas são só de IA, então ninguém denuncia nelas.
- **Não sei:** se as personalidades ficam reconhecíveis jogando. Também não sei se a pessoa vai querer que as reações pesem nas contas.

## D27. DLC Brasil, com senha

- **Contexto (28/10/2026):** "preciso de uma DLC brasil com senha chumbada `unlockresenha`, mediante essa senha libera os commies: lula, jones manoel, boulos, dilma, manuela dávila, renan santos; nazis: bolsonaro, plinio salgado, figueiredo, geisel, castelo branco, ultra; liberais: amoedo, zema, aécio neves, enéias, serra, fhc".
- **Decisão:** requisito 22 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - A senha fica escrita no código (`DLC_KEY`), como pedido. Quem olhar o código acha a senha; é piada entre amigos, não cadeado. Liberada uma vez, fica liberada no aparelho (`S.dlc`).
  - "Brasil" entra como mais uma opção de nomes, ao lado dos continentes. Tem bichos próprios, pedidos pela pessoa ("o tucano é liberal, a lula é stalin, a onça é comunista, o hitler é um boi, e o fascista um bezerro"), no mesmo traço e com a farda de cada papel. A onça deixou de ser liberal em qualquer lugar ("se tiver onça liberal em algum desenho preciso q vc troque por outro"): o liberal das Américas virou o condor, escolhido entre águia-careca, condor e bisão. O Stalin do Brasil começou lula e virou polvo, escolhido com prévia, que também conversa com o "Polvo" de fora da DLC. A galeria mostra o Brasil só depois da senha.
  - Como nos outros continentes (D24), os nomes vão misturados e o papel é sorteado. O app não diz em lugar nenhum quem é "nazi" ou "commie": a divisão que a pessoa mandou só decide em qual tema cada nome entra. No tema fascista entram os liberais e os da lista "nazis"; no tema comunista, os liberais e os da lista "commies". Assim o app não rotula político vivo, e o Bolsonaro pode muito bem sair liberal.
  - Os nomes ficaram curtos, como na mesa: Aécio, Enéas, Manuela, Amoêdo. Só aqui o Lula aparece com o nome; fora da DLC continua "Polvo".
- **Confirmado (28/10/2026):** "ultra" é o Ustra ("é Ulstra mesmo"); ficou com a grafia certa, Ustra.

## D28. Sem o painel de raciocínio; acerto das anotações no fim

- **Contexto (28/10/2026):** "o racicinio das IAs pode remover, faltou um indicativo de quantos papeis eu deduzi certo baseando nas minhas anotacoes, ai pode contar como boas jogadas no fim do jogo". Antes, a pessoa tinha pedido: "queria dps ver qnts das minhas anotacoes deram match com os papeis reais". E sobre o caderno: "quebrou o layout, poderia ter só o emoji, e faltou o compartilhar tudo que sei ou denunciar todos (que vc resume em denunciar inimigos)".
- **Decisão:** requisitos 27, 34 e 37 do `CLAUDE.md`. Isto desfaz o painel da D16.
- **Interpretações que precisaram ser feitas:**
  - Saiu só o painel da tela. O motivo de cada decisão continua gravado em `Game.trace` e vai no arquivo exportado, porque serve para calibrar a IA (D23). O `S.debug` antigo é descartado ao ler.
  - O caderno vai com a partida no fim (`Game.notes`). O acerto conta só o que foi deduzido: o time que a pessoa já conhecia e o que as investigações dela mostraram ficam de fora. Cada acerto entra nas jogadas boas, com peso 1. O erro não conta como jogada ruim, porque marcar é anotar e não jogar.
  - No caderno, os botões viraram só emoji (📣 denuncia, 👍 abona quem está marcado liberal). "Contar tudo" virou "Denunciar inimigos": acusa de uma vez todos do outro lado, que são os marcados do lado oposto ao da pessoa, ou, para quem conhece o time, todos fora dele.
- **Não sei:** se vale contar erro no caderno como jogada ruim.

## D29. Votos na língua do continente e cartas com as cores dele

- **Contexto (28/10/2026):** "os idiomas de votacao tem refletir nas regioes dos lideres sabe, e se puder dar uma estilizada regional nas cartas ficaria massa".
- **Decisão:** requisito 22 do `CLAUDE.md`.
- **Interpretações que precisaram ser feitas:**
  - O voto segue a língua dos líderes de cada continente. Mundo e Europa ficam com os votos do original, porque ali estão Hitler e Stalin (alemão e russo). As Américas votam em espanhol, a língua de Pinochet e de Fidel. O Brasil vota em português. A Ásia vota em japonês para os fascistas (Tojo) e em chinês para os comunistas (Mao). A África vota em suaíli e a Oceania em inglês.
  - "Estilizada regional" virou uma faixa com as cores do continente: no pé de cada cartão, mais larga no pé dos botões de voto (era o que a pessoa queria: "eu queria isso nas cartas de votacao", "e se possivel nas leis") e no alto e no pé de cada lei, com as cores do continente: verde, amarelo e azul no Brasil; o padrão andino nas Américas; azul e dourado na Europa; vermelho e dourado na Ásia; o kente na África; azul do mar e areia na Oceania. No Mundo não há faixa.
- **Não sei:** se a pessoa queria algo mais forte que a faixa, como trocar a fonte ou o fundo por continente.

## D31. Reações que brotam do fundo e o caderno de volta

- **Contexto (29/10/2026):** "as reacoes positivas ou negativas aparecam como likes ou deslikes brotando do fundo da tela"; "quero q volte ao q era antes o menu de anotacoes mas verificando se o tamanho dos botoes de anotacao e denuncia nao quebram no layout do iphone"; "esse motivo e fatos do bloco de anotacoes ficou mt ruim".
- **Decisão:** cada IA que reage a um claim solta um 👍 (concorda), 👎 (discorda) ou 🤷 (não sabe) que sobe do pé da tela; com "reduzir movimento", nada sobe. O caderno volta a ser uma linha por jogador, com o nome à esquerda e as colunas Libs e Nazis com 🗒️ e 📣, em botões de 40 px para caber ao lado do nome em 393 px. O "Motivo e fatos" sai da tela; o que já estava gravado continua sendo lido.
- **Não sei:** se 40 px basta no dedo; a recomendação da Apple é 44.

## D32. Desconfiômetro

- **Contexto (29/10/2026):** "podia ter um desconfiometro tipo guitar hero tipo medido de oleo de carro"; "prefiro ponteiro de oleo".
- **Decisão:** com uma pessoa só na mesa e a opção ligada em "Mais opções" (`S.gauge`, desligada de início), um ponteiro de 0 a 100 logo abaixo da faixa da mesa mostra a média de quanto as IAs desconfiam da pessoa agora (a mesma conta da desconfiança ao vivo), com verde, amarelo e vermelho e as palavras "tranquilo", "de olho" e "na mira". O ponteiro gira do valor anterior para o novo.

## D35. Partida rápida e nomes revisados

- **Contexto (30/10/2026):** "quero uma opcao de quick game, com um jogo de 7 integrantes, e cenario aleatorio no dificil sem assistencia"; "o botao de quick game pode ficar no botao atual jogar agora"; "o botao mudar a mesa poderia ser voltar ao inicio". E a revisão dos nomes: só nomes conhecidos no Brasil, republicanos e democratas nas Américas, sem o Polvo.
- **Decisão:** "Jogar agora", no topo da tela inicial, monta uma partida de 7 lugares (a pessoa e 6 IAs no difícil), com tema e continente sorteados (o Brasil só com a DLC liberada), sem mexer na mesa montada à mão. Começa com a assistência desligada. No fim, "Mudar a mesa" virou "Voltar ao início". As listas de nomes foram revisadas com a pessoa, nome a nome; o Lula só aparece na DLC, com o próprio nome.
- **Não sei:** se a assistência deve voltar sozinha depois da partida rápida; hoje ela fica desligada até a pessoa ligar de novo.

## D38. Eliminação e investigação com mais peso

- **Contexto (30/10/2026):** "tem como melhorar a animacao de eliminacao e investigacao?" e a proposta aceita.
- **Decisão:** na eliminação, a tela escurece, o nome aparece grande, "ELIMINADO" é carimbado e uma carta diz se era o líder escondido ("Não era o Hitler" ou "Era o Hitler!"), que é o que a regra deixa a mesa saber; a tela treme uma vez, porque o iPhone não deixa a página vibrar. Na investigação, uma pasta "Confidencial" com o nome do investigado se abre, a lupa passa e o partido é carimbado na carta. Com "reduzir movimento", nada disso se mexe.
## D39. Tribunal: acusar com prova e "CONTRADIÇÃO!"

- **Contexto (30/10/2026):** "toda vez q acusar alguem ter uma mecanica parecida com la noire e ace atorney"; "contradicao"; prévias aprovadas (prova e tom à esquerda; tela com a prova, a fala e a rosca com os nomes, sem rostos, que entregariam o papel).
- **Decisão:** o 📣 de acusar abre o tribunal: o que a ata tem contra a pessoa (`evidence`: governo cuja conta não fecha, governo que aprovou lei do lado escondido, voto Ja! nesse governo) e o tom (Desconfio, Acuso, Tenho prova). Prova de governo segura (`hit`) vira "CONTRADIÇÃO!" na tela inteira, o acusado se enrola, e a acusação pesa o dobro para as IAs. Acusar firme, ou com prova, sem nada que segure na ata custa credibilidade a quem acusou (conta como contradição dele). O voto Ja! é só indício: não segura sozinho. Abonar (👍, "é liberal") continua direto.
- **Não sei:** se acusar com "Desconfio" deveria pesar menos que hoje; hoje pesa como antes.

## D40. As IAs usam o tribunal; defesa; o Hitler de cada personalidade

- **Contexto (30/10/2026):** "Faz o 2,3,4 da IA": fascista (e qualquer IA) que usa o tribunal, defesa no tribunal, Hitler com estilo próprio.
- **Decisão:** a IA que acusa alguém com uma prova que segura na ata faz isso como acusação de tribunal (pesa o dobro); o fascista sem prova forte contra um liberal pode exibir um indício fraco como prova (blefe que custa credibilidade se a mesa conferir). Quando acusam a pessoa, ela responde: "O baralho veio assim", "Foi teste do chanceler", "Está mentindo" ou fica calada; a resposta é conferida com a ata, e a que bate tira o peso da acusação. Quando a IA aponta uma prova que bate contra a pessoa, aparece o mesmo "CONTRADIÇÃO!". O Hitler de cada personalidade joga diferente (`BOSS_STYLE`): o certinho se esconde mais, o blefador e o caótico arriscam cedo.
- **Não sei:** o equilíbrio com isso não foi medido com o `ai_bench`.

## D41. Conquistas e compartilhar o resultado

- **Contexto (30/10/2026):** "Do ui/ux faz a 5 e 6" (compartilhar o resultado, conquistas) e o caderno com nomes desalinhados.
- **Decisão:** no fim, "Sua partida" mostra as conquistas desta partida (`ACHIEVEMENTS`, `achievements`: primeira vitória, líder invisível, caçador, caderno perfeito, CONTRADIÇÃO!, mesa dura, sem rastro) e quantas de todas a pessoa já tem nas partidas guardadas, e um botão "Compartilhar resultado" desenha uma imagem (quem venceu, o papel, o caderno, as conquistas) e manda pelo compartilhar do celular, ou baixa. No caderno, todo nome fica na própria linha, acima das duas colunas, para nomes curtos e longos ficarem iguais.

## D42. Eliminação numa tela só; defesa na tela da acusação

- **Contexto (30/10/2026):** "A animação de eliminação tá estranha, bugada"; "A defesa da acusação precisa melhorar e poderia ser na mesma tela de acusação".
- **Decisão:** a eliminação tinha duas animações ao mesmo tempo (o cartão "Eliminado da mesa" e a tela escura); ficou só a tela escura, sólida e acima de tudo. Quando uma IA acusa a pessoa, abre a tela da acusação ("ACUSAÇÃO!", ou "CONTRADIÇÃO!" se a prova segura) com as respostas ali mesmo, só as que a ata poderia sustentar, cada uma dizendo quando cola; o resultado aparece na mesma tela.

## D43. Reputômetro

- **Contexto (30/10/2026):** "Quero um reputometro para cada integrante da mesa"; "Só a 1" (estrelas na faixa do topo).
- **Decisão:** com a opção ligada em Mais opções (`S.rep`, desligada de início), cada nome vivo da faixa da mesa ganha de 1 a 3 estrelas (`reputation`), contadas só com o que a mesa viu: história que não fechou, acusação firme que a ata não sustentou, mudar de opinião sem fato novo.

## D44. Votação na mesinha

- **Contexto (30/10/2026):** "uma animação melhor para a votação, mostrando uma mesinha e os votos de cada um abrindo"; mockup aprovado.
- **Decisão:** numa mesa com IA, depois da votação a tela mostra uma mesa verde com os lugares em ordem, cada voto virando por vez a partir do presidente, o placar somando no meio e o carimbo "ELEITO!" ou "REJEITADO!" (a mesa fica vermelha se o Hitler acabou de ser eleito chanceler na zona de perigo). O ritmo segue a velocidade da IA. A tela fecha sozinha e não segura toque. Com "reduzir movimento", só aparece o carimbo de sempre.

## Pendências

| Pendência | Quem resolve |
|---|---|
| Proteger a `main` exigindo PR e os checks do CI | Dono do repositório |
| Preencher o `CLAUDE.md`: o que é o app, o escopo e os requisitos | Dono do repositório |


## D30 — Prioridade para leis decisivas na IA (2026-10-29)

Pedido: melhorias na IA do jogo. Escopo interpretado: corrigir decisões de fim de partida nos níveis difícil e extremo, que já planejam jogadas. Quando a própria mão permite garantir a lei vencedora ou impedir a lei vencedora adversária, essa decisão vem antes de reputação, blefe e erro aleatório. O chanceler usa o veto disponível para bloquear uma mão que daria vitória ao adversário; o presidente aceita esse veto e recusa vetar duas leis que venceriam para seu lado. A regra usa somente a View, inclusive para o líder sem aliados conhecidos. O veto pode levar ao caos: bloqueia a lei da mão, sem garantir a sobrevivência ao topo do baralho. Fácil e médio mantêm seu comportamento. Não foi medida melhora da taxa de vitórias.

## D31 — Dedução estável e estratégia da IA (2026-10-29)

Pedido: ampliar as melhorias da IA antes de trabalhar em outros pontos. Mantemos os quatro níveis e as personalidades, sem rede nem modelo de linguagem no jogo. A dedução usa logaritmos para evitar perder evidências por arredondamento em históricos longos; regras públicas e investigações privadas delimitam os mundos possíveis antes das hipóteses comportamentais. A IA não esquece que um chanceler que chegou à sessão legislativa na zona do líder não pode ser o líder. Uma fala repetida da mesma pessoa sobre o mesmo alvo e lado conta uma vez na janela de memória, para não virar prova por repetição.

Nos níveis que planejam, vitórias certas por eleição têm prioridade sobre erros aleatórios; fascistas não eliminam o líder conhecido se existe outro alvo. O presidente liberal reavalia o risco do chanceler mesmo quando participa do governo. O líder usa os aliados que descobriu investigando para indicar, votar, convocar e eliminar. Uma espiada privada ainda válida orienta o voto quando o caos decidiria a partida; espiadas consumidas ou declarações de terceiros não dão acesso ao topo. O presidente preserva até uma única lei vencedora para dar ao chanceler a chance de aprová-la. Simulações de reputação do chanceler deixam a compra presidencial desconhecida, em vez de inventar duas leis fascistas. Um cache dura apenas uma decisão e reaproveita crenças da mesma View sem guardar conhecimento entre jogadores.

A ferramenta `scripts/ai_compare.mjs` confronta a IA anterior e a atual no mesmo nível, alternando lados nas mesmas sementes e mesas de 5 a 10. Em 60 partidas por lado e nível, 480 no total, nenhuma travou. Vitórias da versão nova: fácil 36/60 como liberal e 25/60 como fascista; médio 37/60 e 27/60; difícil 31/60 e 30/60; extremo 35/60 e 32/60. Os intervalos de 95% por lado incluem 50%: esta amostra valida a execução e dá uma referência, sem demonstrar superioridade universal. Baseline: `58bf7c6dd29975f83ca946d717989d11bc8f8367`, antes de D30. As medições ficaram em `/workspace/ai-comparison.jsonl` no ambiente de trabalho.

## D32 — Insistência nas acusações e poderes visíveis (2026-10-29)

Pedido: acusar várias vezes a mesma pessoa não tinha consequência percebida; investigar e eliminar precisavam de animações. Repetição sem um novo governo, veto ou investigação envolvendo o alvo não é evidência independente de culpa. Uma acusação sem apoio na ata, repetida até três vezes além da primeira, pesa contra a credibilidade de quem acusa: multiplica cada hipótese por 1,3 se o acusador for do lado escondido nela, ou 0,85 se liberal, ajustado pela personalidade de quem ouve. O efeito é limitado, não uma prova. As reações cobram explicitamente um fato novo; uma acusação apoiada pela ata não recebe essa penalidade. Eventos relevantes novos reiniciam a contagem. Votos e rejeições sozinhos não limpam a insistência. Os botões mantêm o limite existente de uma fala por alvo por rodada.

Investigação e eliminação recebem um aviso público animado por 1600 ms, na faixa abaixo do cabeçalho, para pessoas e IAs. A investigação usa lupa e nome, sem partido ou retrato secreto. A eliminação usa martelo e risco no nome, sem revelar o papel de quem sai; o fim de jogo continua seguindo as regras. Os avisos não bloqueiam botões nem atrasam as regras e respeitam a preferência de movimento reduzido. A animação antiga de lupa no cartão secreto e o escurecimento da eliminação continuam; o novo aviso torna o poder perceptível antes do resultado secreto e também quando a IA atua.

## D33 — Caderno, memória social e campanhas (2026-10-29)

Pedido autorizado: tornar o caderno útil, a IA social e coerente, os governos atentos à maioria, e o resultado compreensível. Motivos privados por jogador têm até 280 caracteres e são classificados pela pessoa como fato observado ou palpite; essa classificação não confirma papéis. A ata pública aparece separada. Notas não entram na View de bots e acompanham apenas o arquivo da partida encerrada.

A memória social registra acusações, defesas, inversões sem evidência nova e versões públicas incompatíveis. Isso ajusta a credibilidade de quem fala, com efeitos moderados. A IA que planeja evita trocar de versão sem fatos novos e leva em conta o compromisso público de sua própria espiada. Estima a maioria por crenças públicas e opiniões declaradas, sem conhecer votos futuros; avalia também a presidência que virá após rejeitar e restaura a ordem da eleição especial.

Antes de votar há até duas falas de campanha de NPCs vivos, uma por NPC. Elas defendem governos ou pressionam rivais e podem mudar a leitura dos outros bots. Uma pessoa pode votar sem esperar a conversa. Os votos anteriores também viram assunto das falas, sem serem tratados isoladamente como prova de culpa. O resumo final destaca até três momentos registrados e suas consequências, sem inventar um resultado alternativo.

O feedback das acusações resume somente as reações públicas e avisa sobre insistência ou contradição. A linguagem ganhou variantes por personalidade e situação, com seleção determinística pelo histórico: não consome sorte nem altera decisões, e uma fala antiga continua igual depois. Dois testes de turnos foram atualizados porque a campanha passa a anteceder a espera do voto humano; o limite e o retorno à votação são testados.

## D34 — Poderes e acabamento no celular (2026-10-29)

A investigação usa lupa percorrendo o nome, sem mostrar o resultado. Eliminar usa arma estilizada com recuo, clarão e fumaça, sem sangue e sem revelar o papel; som respeita a opção de áudio e movimento reduzido elimina animações. O caderno agrupa ações por jogador, abre motivos sob demanda e preserva editores abertos durante atualizações. Os controles de anotação têm alvo de toque ampliado. O card Sim do Brasil usa somente fundo verde e losango amarelo: sem círculo azul nem faixa branca. A faixa regional das outras cartas permanece conforme o desenho existente.

## D35 — Botões no iPhone, Diário e resumo natural (2026-10-29)

A pessoa confirmou que a denúncia estava funcionando no iPhone: o defeito era visual. Substituímos os emojis dos botões por SVGs de traço único, com caixas fixas de 44 px, alinhamento central e rótulos acessíveis. Cliques em ações fecham o foco do editor antes do repaint, preservando o texto já salvo. A regra de uma fala por alvo na rodada não mudou.

O fim deixa de numerar “Momento 35” e usa títulos sobre os acontecimentos, nomes dos participantes e consequências específicas: o tiro que encerrou o jogo, o governo que tornou a votação perigosa, o voto perdido por um dos lados. A nota genérica sobre resultados alternativos saiu. Os papéis continuam aparecendo apenas no fim, conforme as regras existentes.

As falas completas deixam de virar avisos passageiros. O rodapé mostra um resumo persistente de quem falou sobre quem, com acesso ao Diário. Esse painel público guarda as linhas exatas já registradas em Game.log, incluindo acusações, defesas, respostas e declarações de compras; não regenera falas e não mostra motivos privados do caderno ou resultados secretos. Anotações e Diário são painéis separados, acessíveis no rodapé; abrir um fecha o outro. O Diário abre no final da conversa e preserva a posição durante novas falas, para permitir ler mensagens anteriores.

O teste móvel em tests/iphone.py verifica os dois tipos de botão, área de toque, foco do editor, registro da denúncia, resumo persistente, transcrição pública sem notas privadas e títulos finais. A suíte completa também o executa com Chromium; o mesmo teste aceita WebKit para conferir o motor do Safari.

## D36 — Avisos de reputação (2026-10-29)

A sugestão de crédito social virou reputação na mesa, sem pontuação única. Um aviso curto mostra “Credibilidade caiu” para repetição ou inversão sem fatos novos; “Sua fala ganhou apoio”, “Sua fala encontrou resistência” ou “A mesa está dividida” resumem as reações públicas. O rodapé mantém o aviso junto da última conversa, e o Diário explica a causa. Os avisos não revelam papéis, não inventam uma opinião unânime e não mudam as penalidades moderadas já existentes na IA. A reputação se refere apenas às ações dos jogadores nesta partida.

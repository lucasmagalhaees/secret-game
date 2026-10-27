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

## Pendências

| Pendência | Quem resolve |
|---|---|
| Proteger a `main` exigindo PR e os checks do CI | Dono do repositório |
| Preencher o `CLAUDE.md`: o que é o app, o escopo e os requisitos | Dono do repositório |

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

## Pendências

| Pendência | Quem resolve |
|---|---|
| Proteger a `main` exigindo PR e os checks do CI | Dono do repositório |
| Preencher o `CLAUDE.md`: o que é o app, o escopo e os requisitos | Dono do repositório |

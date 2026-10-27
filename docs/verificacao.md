# Verificação

O que foi verificado, como e quando; e o que não foi. Um item só entra em "Verificado" com o comando (ou a observação) e a data.

## Verificado

| Afirmação | Como | Quando |
|---|---|---|
| As regras do jogo (papéis, eleição, caos, limite de mandato, poderes, veto, vitórias, estado salvo) passam nos casos sem página | `node tests/core.mjs` | 12/10/2026 |
| A página gerada passa nos mesmos casos | `python3 tests/unit.py` | 12/10/2026 |
| A documentação bate com o código, inclusive os números das regras | `python3 tests/docs_check.py` | 12/10/2026 |
| Partidas inteiras pela tela (os dois lados vencendo), nos dois temas, no Chromium em tamanho de celular | `python3 tests/e2e.py dark` e `light` | 12/10/2026 |
| O app abre sem internet e troca de versão com um toque, no Chromium | `python3 tests/pwa.py` | 12/10/2026 |
| As IAs: cada visão só tem o que o lugar sabe, as respostas ficam nas opções, partidas só de IA em todo nível e toda mesa terminam e podem ser salvas, liberais não mentem | `node tests/core.mjs` (105 casos) | 26/10/2026 |
| Jogar sozinho contra a IA pela tela, do começo ao fim, recarregando no meio; duas pessoas com IA, voto por pessoa | `python3 tests/e2e.py dark` e `light` | 26/10/2026 |
| Os níveis da IA balanceados: com a mesa no mesmo nível, liberais vencem 47% a 51%; medidos em 6.400 partidas só de IA (números na D10) | `node scripts/ai_bench.mjs 400` | 26/10/2026 |
| Treino (papel escolhido), nomes históricos, ata com quem votou Ja! e o anúncio de quem aprovou cada lei, pela tela | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (109 casos) | 27/10/2026 |
| Tema liberais x comunistas (palavras, nomes, desenhos, nada de "fascista" na tela), anotações com o que a pessoa sabe já marcado | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (114 casos) | 27/10/2026 |
| Votos variados (temperamento) e níveis ainda balanceados: liberais 47% a 53% com a mesa no mesmo nível | `node scripts/ai_bench.mjs 400` | 27/10/2026 |
| Conversa das IAs, dicas do treinador, o que as IAs pensavam de você, velocidade, anotações na lista de jogadores | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (123 casos) | 27/10/2026 |
| Painel lateral de anotações (celular e tela larga), desconfiança ao vivo, nenhum "undefined" ou "NaN" na tela em toda a partida contra a IA | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (124 casos) | 27/10/2026 |
| Ponto crucial no fim e ao vivo, para quem é do lado escondido | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (125 casos) | 27/10/2026 |
| Balanceamento com a conversa: liberais 46% a 47% com a mesa no mesmo nível | `node scripts/ai_bench.mjs 300` | 27/10/2026 |
| Raciocínio das IAs: aviso antes de mostrar, cada decisão com motivo e opções, trilha de cada jogador, nada de "undefined" no painel; explicar não muda nenhuma decisão | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (130 casos); 120 partidas só de IA iguais antes e depois, mesmas sementes | 27/10/2026 |
| A tela da partida não esconde a jogada: fase antes das dicas, nada embaixo da barra, um painel por vez, anúncio e carimbo fora da fase, contraste dos votos de 4,5:1 ou mais nos dois temas | `python3 tests/e2e.py dark` e `light` | 27/10/2026 |
| Menos rolagem: faixa da mesa no topo, "Mais opções" e regras fechadas, botão de começar diz quantos faltam e completa com IA, ajuda com texto, fim de jogo em abas | `python3 tests/e2e.py dark` e `light` | 27/10/2026 |
| Jogadas boas e ruins no fim, só com a assistência (por pessoa, sozinho ou com várias pessoas; botão para ligar quando está desligada); jogada errada sem ter como saber não conta como ruim | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (136 casos) | 27/10/2026 |
| Mesa menor num toque (tira as últimas IAs, nunca pessoa), limpar a mesa com dois toques; o celular de tela para baixo só fecha o segredo com a opção ligada | `python3 tests/e2e.py dark` e `light`; `node tests/core.mjs` (137 casos) | 27/10/2026 |
| Depois de uma fala de IA, a próxima espera mais e o que o governo disse fica escrito; a fase de uma IA nunca mostra o portão do segredo; fala de IA não faz a fase entrar de novo nem fecha segredo | `python3 tests/e2e.py dark` e `light` | 27/10/2026 |
| IA não ingênua: nenhuma jogada vira certeza, teste do chanceler, disfarce do Hitler, espiada conferida, indicações, votos (extremo), eliminação e eleição especial; balanceamento: liberais 52% a 55% com a mesa no mesmo nível | `node tests/core.mjs` (145 casos); `node scripts/ai_bench.mjs 200` | 27/10/2026 |
| Depois de um veto aceito, o baralho é reabastecido | caso em `tests/unit.cases.mjs` | 26/10/2026 |
| A produção (https://secret-game-gamma.vercel.app) serve o commit da `main` | Página lida: `meta app-commit` = `6e6e539` | 13/10/2026 |

## Não verificado

| Afirmação | Por que não | Como verificar |
|---|---|---|
| O service worker no Safari do iPhone e no app instalado na Tela de Início | Os testes rodam no Chromium | Abrir a produção no iPhone, ligar o modo avião e abrir de novo |
| Uma partida de verdade, com pessoas passando o celular | Ninguém jogou ainda | Jogar uma partida e anotar o que travou |
| As animações, a fonte Didot do art déco e os desenhos no Safari do iPhone | Os testes rodam no Chromium/Linux | Abrir no iPhone e jogar uma rodada em cada estilo |
| Som, vibração e o esconder ao virar o celular num aparelho de verdade | Os testes rodam no Chromium, sem alto-falante nem sensor; o iPhone não vibra por página e pede permissão para o sensor | Jogar uma rodada num Android e num iPhone |
| A IA contra gente de verdade: se o nível parece certo, se as falas soam naturais | Só foi medida contra ela mesma | Jogar algumas partidas sozinho em cada nível |
| A mesa de 10 jogadores na tela | O e2e joga com 7; com 10 só as regras foram testadas | Montar uma mesa de 10 e jogar |

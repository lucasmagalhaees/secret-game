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

## Não verificado

| Afirmação | Por que não | Como verificar |
|---|---|---|
| O service worker no Safari do iPhone e no app instalado na Tela de Início | Os testes rodam no Chromium | Abrir a produção no iPhone, ligar o modo avião e abrir de novo |
| A produção servindo o commit da `main` | Só depois do primeiro deploy | O workflow `Produção` no primeiro merge |
| Uma partida de verdade, com pessoas passando o celular | Ninguém jogou ainda | Jogar uma partida e anotar o que travou |
| As animações, a fonte Didot do art déco e os desenhos no Safari do iPhone | Os testes rodam no Chromium/Linux | Abrir no iPhone e jogar uma rodada em cada estilo |
| Som, vibração e o esconder ao virar o celular num aparelho de verdade | Os testes rodam no Chromium, sem alto-falante nem sensor; o iPhone não vibra por página e pede permissão para o sensor | Jogar uma rodada num Android e num iPhone |
| A mesa de 10 jogadores na tela | O e2e joga com 7; com 10 só as regras foram testadas | Montar uma mesa de 10 e jogar |

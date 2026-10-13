# Secret Hitler

Jogo de cartas de dedução social no estilo Secret Hitler, liberais contra fascistas, jogado em um celular só que passa de mão em mão (5 a 10 pessoas na mesma sala).


Idioma da interface: português do Brasil, informal. Comentários no código: inglês.

## Fluxo de trabalho (obrigatório)

1. **Nunca commitar direto na `main`.** Toda mudança começa com um branch novo a partir da `main` atualizada: `git fetch origin && git switch -c tipo/descricao origin/main` (`feat/`, `fix/`, `docs/`, `chore/`, `ci/`).
2. Rodar `scripts/verify.sh` antes de enviar e colar a saída no PR.
3. Abrir PR para a `main` usando o template. O CI (checks, cobertura e e2e claro e escuro) tem que passar.
4. O merge na `main` dispara o deploy de produção. Não existe outro caminho para produção.
5. Mensagens de commit no estilo Conventional Commits, em português.

## Escopo: MVP


- Não adicionar backend, login nem banco sem pedido. O app é uma página estática.
- Um aparelho só, passando de mão: sem partida pela internet, sem um celular por jogador.
- As regras são as do Secret Hitler original (D6). A única diferença é de meio: a votação é em voz alta e o celular só registra o resultado.
- Fora por enquanto: histórico de partidas.

## Regras contra alucinação (valem para qualquer IA trabalhando aqui)

A ordem de confiança é: **código e testes rodando agora** > amostras reais gravadas > documentação > memória. Se dois deles discordam, o de cima ganha e o de baixo é corrigido.

1. **Não diga que funciona sem rodar.** Antes de afirmar que algo está certo, rode `scripts/verify.sh` e mostre a saída. Sem saída, a frase certa é "não verifiquei".
2. **Não invente campo da fonte de dados.** O app só pode ler campos que aparecem em `tests/fixtures/source/`. Precisa de um campo novo? Capture a resposta real, grave a amostra, acrescente a checagem em `tests/contract.py`, e só então escreva o código.
3. **Separe sempre o verificado do suposto.** Em resposta, commit e PR, diga o que foi testado e o que não foi. O registro oficial é [`docs/verificacao.md`](docs/verificacao.md): um item só sobe para "Verificado" com comando e data.
4. **Número mora no código.** Limites, intervalos e prazos citados aqui são conferidos contra o código em `src/` por `tests/docs_check.py`. Mudou um, mude o outro no mesmo commit.
5. **Decisão de produto não se presume.** O que já foi decidido, e por quê, está em [`docs/decisoes.md`](docs/decisoes.md). O que não está lá, pergunte. Decisão nova entra lá com data.
6. **Fato de terceiro tem data.** Limite de hospedagem, preço, comportamento de API: tudo isso envelhece. Cite a data em que foi conferido e reconfira antes de depender.
7. **Amostra real não é editada à mão.** Dado inventado para teste usa nome inventado.
8. **Não pule o harness.** O hook em `.claude/settings.json` roda `scripts/verify.sh --quick` quando a tarefa termina e segura o encerramento se falhar. Não desative, não contorne, e não edite um teste só para ele passar: se o teste está errado, explique por quê no PR.
9. **Na dúvida, pare e diga.** Uma resposta incompleta e honesta vale mais que uma completa e inventada.

O que cada peça do harness cobre:

| Peça | Protege contra |
|---|---|
| `scripts/verify.sh` | Afirmar que está certo sem ter rodado nada |
| `tests/unit.cases.mjs`, rodado por `tests/unit.py` e por `tests/core.mjs` | Mexer numa regra do núcleo e quebrar outra sem notar |
| `tests/core.mjs` (os mesmos casos, no Node, sem página) | O núcleo passar a depender de página, rede ou armazenamento sem ninguém notar |
| `tests/contract.py` + `tests/fixtures/source/` | Escrever leitor para um formato de API imaginado |
| `tests/docs_check.py` | Documentação citar número, arquivo ou chave que não existe mais |
| `tests/e2e.py` | Tudo passar isolado e o fluxo real pela interface estar quebrado |
| `tests/pwa.py` | Dizer que o app abre sem internet e avisa de versão nova sem nunca ter visto acontecer |
| `tests/cov.py` (cobertura medida pelo navegador) | Achar que está testado sem estar |
| `scripts/check_production.py` (workflow `Produção`, depois de cada merge) | CI verde e deploy feito, mas a produção servindo outra versão |
| `tsc` em modo `strict` (primeiro passo do `verify.sh`) | Chamar função com o dado errado, ou ler um campo que pode não existir |
| Hook de parada (`.claude/hooks/verify-on-stop.sh`) | Encerrar a tarefa com checagem falhando |
| `docs/verificacao.md` | Tratar suposição como fato |
| `docs/decisoes.md` | Depender da memória de uma conversa |

## Requisitos do produto


1. Mesa de 5 a 10 jogadores (`MIN_PLAYERS`, `MAX_PLAYERS`), em ordem de assento, guardada no aparelho.
2. Papéis sorteados: um Hitler e fascistas conforme a mesa (`FASCISTS`: 2 com 5 ou 6, 3 com 7 ou 8, 4 com 9 ou 10); o resto liberal.
3. Cada um vê o próprio papel em segredo. Os fascistas veem os outros fascistas e o Hitler; com 5 ou 6 jogadores (`HITLER_KNOWS_UPTO`) o Hitler também vê o fascista, com mais ele não vê ninguém; os liberais não veem ninguém.
4. Baralho de 17 leis: 11 fascistas (`DECK_F`) e 6 liberais (`DECK_L`). Com menos de 3 para tirar, o lixo volta e é embaralhado.
5. Rodada: o presidente indica o chanceler, a mesa vota em voz alta (Ja! ou Nein!) e o celular só registra se o governo foi eleito (mais Ja! que Nein!) ou rejeitado. Eleito, o presidente tira 3 leis e descarta 1; o chanceler descarta 1 das 2 e a outra é aprovada.
6. Limite de mandato: o último presidente e o último chanceler eleitos não podem ser chanceler; com 5 vivos ou menos (`SMALL_TABLE`), só o último chanceler.
7. 3 governos seguidos sem lei (`TRACKER_MAX`, rejeição ou veto) aprovam a lei do topo, sem poder, e zeram o limite de mandato.
8. Poderes do presidente pela lei fascista aprovada, pelo tabuleiro da mesa (`POWERS`, pelo número de jogadores que começaram): com 5 ou 6 jogadores, na 3ª olha as próximas 3 leis; com 7 ou 8, na 2ª investiga o partido de alguém e na 3ª convoca eleição especial; com 9 ou 10, na 1ª e na 2ª investiga e na 3ª convoca eleição especial; em toda mesa, na 4ª e na 5ª elimina alguém. Ninguém é investigado duas vezes; o Hitler aparece como fascista. Na eleição especial o presidente escolhe o próximo presidente (qualquer outro vivo, sem limite de mandato) e depois dessa rodada a ordem segue de quem convocou.
9. Veto a partir da 5ª lei fascista (`VETO_FROM`): o chanceler pede, o presidente aceita (nenhuma lei, conta como governo sem lei) ou recusa (o chanceler aprova uma).
10. Vitória: 5 leis liberais ou 6 fascistas (`WIN`); fascistas também vencem elegendo o Hitler chanceler com 3 ou mais leis fascistas (`HITLER_ZONE`); liberais também vencem eliminando o Hitler.
11. Todo segredo (papel, mão de leis, partido investigado, próximas leis) só aparece depois de "Passe o celular para X" e do toque de X. Recarregar a página fecha o segredo aberto.
12. A partida em curso fica guardada no aparelho; dá para encerrar no meio (dois toques) e jogar de novo com a mesma mesa.

## Arquitetura

TypeScript em módulos, build pelo Vite 8.3.3 com TypeScript 7.0.2 (versões exatas no `package.json`). O build junta tudo num arquivo só, `dist/index.html`, com o script e o estilo dentro (plugin `single-file` no `vite.config.js`) e **sem minificar**: o que os testes medem, por nome de função e linha, é o arquivo que vai para o ar. A página gerada leva o commit de origem em `<meta name="app-commit">`. O único outro arquivo que o build emite é `dist/sw.js`, o service worker.

`npm run typecheck` roda o `tsc` em modo `strict`, com `noUnusedLocals`. Nenhum módulo usa `@ts-nocheck` ou `@ts-ignore` (o `docs_check.py` confere). O único `any` é o tipo `Json`, para o que vem de fora.

### `src/core/`: lógica pura

Sem DOM, sem rede e sem armazenamento (conferido pelo `docs_check.py`, e pelo `tests/core.mjs`, que roda o núcleo no Node com `window`, `document`, `localStorage` e `fetch` armados para estourar). É o que testar primeiro e o que reaproveitar se o projeto ganhar backend.

| Módulo | O que tem |
|---|---|
| `src/core/types.ts` | As formas dos dados: `Game`, `Player`, `Law`, `Phase`, `AppState`, `Entry`, `Json` |
| `src/core/game.ts` | As regras: `newGame`, `revealNext`, `nominate`, `vote`, `presidentDiscard`, `chancellorDiscard`, `askVeto`, `answerVeto`, `investigate`, `endPower`, `execute`, as constantes da mesa e `seeded`/`shuffle` (o acaso entra como função) |
| `src/core/save.ts` | `readGame` e `readState`: lê o que foi guardado, descartando a partida que não fecha |
| `src/core/source.ts` | Os leitores da fonte de dados (`normEntry`, `normEntries`). Único lugar que conhece o formato dela |
| `src/core/index.ts` | O objeto `Core`, que a página usa e os testes exercitam |

### `src/app/`: a página

| Módulo | O que tem |
|---|---|
| `src/app/state.ts` | `S` (o que é guardado), `ui` (o que está na tela: segredo aberto, carta ou jogador escolhido), gravação no `localStorage` e o tema (`applyTheme`) |
| `src/app/format.ts` | `esc` e os acessos ao DOM (`$`, `part`, `valOf`) |
| `src/app/api.ts` | `getJSON` (toda chamada passa por ele, com tempo máximo) e `loadEntries`. Sem fonte configurada, não chama nada |
| `src/app/render.ts` | `render` e as telas de cada fase, a faixa de quem governa, o portão dos segredos (`gateKey`), o que se mexe (só o que acabou de mudar), `toast`, `blurField` |
| `src/app/art.ts` | Os desenhos, em SVG no próprio código: `portrait` (o papel: pássaro liberal de uniforme, cobra fascista de uniforme, naja de capelo aberto num púlpito para o Hitler) e `seal` (o selo do partido nas leis e no tabuleiro) |
| `src/app/events.ts` | Um listener delegado por `data-act`; o único lugar que usa `Math.random` |
| `src/app/update.ts` | Registro do service worker, aviso de versão nova (`initUpdates`, `applyUpdate`, `checkNow`) e `builtFrom`, o commit da página |
| `src/main.ts` | Entrada: liga os listeners, expõe `window.__APP`, pinta a tela e registra o service worker |
| `src/env.d.ts` | Declarações de tipo de `window.__APP`; os tipos do Vite vêm por referência |

`src/sw.js` é o service worker. É JavaScript puro, fora dos módulos e do `tsc`: roda em outro contexto, sem página, e o build só o copia para `dist/sw.js` trocando a versão.

Os módulos de `src/app/` se importam em círculo (a tela chama ações, ações repintam a tela). Funciona porque nada é chamado enquanto os módulos carregam: o que roda na carga fica em `src/app/state.ts` (ler o que está salvo e aplicar o tema) e em `src/main.ts`. Código novo não deve chamar função de outro módulo no nível de cima do arquivo.

`window.__APP` expõe `{Core, ui, S}` para teste.

Renderização é `innerHTML` a partir do estado. Todo texto que não veio do próprio código passa por `esc()`. `render()` não repinta a tela se o foco estiver num campo dela, para não derrubar o que a pessoa está digitando.

### Estado no `localStorage`

`secrethitler.v1`: `{ v: 1, names: [...], game: Game | null, theme, look }`. `theme` é `'light'` ou `'dark'`; sem o campo, segue o aparelho. `look` é `'deco'`; sem o campo, o estilo é o pôster. A partida inteira fica guardada, inclusive papéis e a ordem do baralho: quem abrir as ferramentas do navegador vê tudo. É um jogo entre amigos na mesma mesa, não um cofre. O que está aberto na tela (`ui`) não é guardado.

## Fonte de dados


Ainda não há. `SOURCE` em `src/app/api.ts` está vazio. Quando houver, toda leitura passa pelas funções `norm*` de `src/core/source.ts`, e cada resposta real usada vai para `tests/fixtures/source/`, com a checagem dela em `tests/contract.py`.

## App guardado no aparelho (offline e versão nova)

- **O que fica guardado:** `dist/sw.js` (de `src/sw.js`) guarda a página no cache `secret-hitler-page-<versão>` e passa a responder toda abertura do app com essa cópia, sem ir à rede. Arquivos de outros endereços só são guardados se o endereço estiver em `ASSET_HOSTS` (hoje vazio).
- **A fonte de dados nunca passa pelo service worker.** O app precisa dela fresca.
- **Versão:** o build calcula um hash da página sem o carimbo de commit e grava em `sw.js`. Publicação que não muda o app (documentação, testes) gera o mesmo `sw.js` e não incomoda ninguém.
- **Aviso de versão nova:** o `sw.js` novo guarda a página nova e fica esperando. A página mostra "Saiu uma versão nova do app." com o botão "Atualizar agora". Sem o toque, o app aberto continua o mesmo. Fechar o app de vez e abrir de novo também entra na versão nova.
- **Quando procura:** ao abrir, toda vez que o app volta para a frente e a cada 30 min com ele aberto (`CHECK_EVERY`).
- **Onde não vale:** só na página publicada (`import.meta.env.PROD`, por http ou https). No `npm run dev` e na página aberta do disco (como os testes fazem) não há service worker.

## Interface

Uma coluna de até 720 px, pensada para 393 px de largura. Tema claro e escuro, tudo em variáveis CSS no `:root`; por padrão segue o aparelho (`prefers-color-scheme`), e o cartão "Aparência" fixa um dos dois (`S.theme`). A paleta escura aparece duas vezes em `src/styles.css`, uma para "o aparelho pediu" e outra para "a pessoa escolheu"; o `docs_check.py` confere que as duas são iguais.

- **Dois estilos** (D4, D7), escolhidos no cartão "Aparência" (`S.look`), cada um com claro e escuro. **Pôster** (padrão): pôster político dos anos 30, papel envelhecido, tinta preta, azul liberal e vermelho fascista, capitulares condensadas, bordas grossas e sombras duras. **Art déco**: marfim e azul-marinho com filetes dourados (de noite, azul-marinho e dourado), serifa de alto contraste (Didot nos Apple). A paleta escura do art déco também aparece duas vezes, e o `docs_check.py` confere. Fontes só do aparelho, nada baixado.
- **Desenhos próprios** (`src/app/art.ts`): liberais são pássaros de uniforme (quepe, gola, botões), fascistas são cobras de uniforme, o Hitler tem carta própria (naja de capelo aberto, de casaco, num púlpito). Nenhuma arte, logo, personagem ou ilustração do jogo original.
- **Movimento só no que acabou de mudar:** a fase nova entra deslizando, o segredo vira como carta quando é aberto, a lei aprovada carimba no tabuleiro. Escolher uma carta não mexe nada. Com "reduzir movimento" ligado no aparelho, nada se mexe.
- **Nenhum seletor do sistema** (`<select>`): a lista que ele abre é desenhada pelo aparelho, com as cores dele, e já apareceu branca no tema escuro. Escolhas são botões do app. O `docs_check.py` e o `tests/e2e.py` conferem.
- Campos com fonte de 16 px ou mais (o iPhone dá zoom abaixo disso), `viewport-fit=cover` com `env(safe-area-inset-*)`, metas `apple-mobile-web-app-*`.
- O Safari pode limpar o `localStorage` de site sem uso por semanas. Se o app guardar algo que importa, ele precisa de backup em arquivo.

## Testes

```bash
npm ci                       # Vite e TypeScript
pip install -r tests/requirements.txt && playwright install chromium
scripts/verify.sh            # tudo: tipos, build, docs, core, unit, contract, autoteste da checagem de produção, e2e claro e escuro, pwa e cobertura
scripts/verify.sh --quick    # sem o e2e (poucos segundos)
node tests/core.mjs          # os casos do núcleo, sem navegador
npm run dev                  # servidor de desenvolvimento do Vite
```
O `verify.sh` começa pelo `tsc` e pelo build; se um dos dois falha, os testes nem rodam. **Todo teste usa `dist/`**, o que o build gerou: o que é testado é o que é publicado. Todos abrem `dist/index.html` do disco, menos o `pwa.py`, que serve `dist/` por um servidor local (service worker não existe em página aberta do disco). A exceção é o `core.mjs`, que constrói `src/core` sozinho e roda no Node.

Os casos do núcleo ficam em `tests/unit.cases.mjs`. Regra nova entra ali primeiro. Dois executores rodam os mesmos casos: `unit.py` no navegador, contra `window.__APP.Core` da página gerada, e `core.mjs` no Node.

**Cobertura:** com `APP_COVERAGE=1` (o `verify.sh` completo liga sozinho), cada suíte grava quais funções e trechos do script de `dist/index.html` executou. `python3 tests/cov.py` junta tudo e falha abaixo de 95% das funções e 90% do código. Teste que recarrega a página usa `cov.reload(pg)` em vez de `pg.reload()`.

`e2e.py` abre a página num tamanho de celular, com a rede bloqueada, e joga partidas inteiras pela tela: monta a mesa (nome vazio, repetido, mesa cheia, nome com marcação aparecendo como texto), troca o tema, confere que cada papel só aparece depois do toque, empilha papéis e baralho por `window.__APP.S` para a partida ser sempre a mesma, e passa por rejeições e caos, limite de mandato, os poderes da mesa de 7 (investigar, eleição especial, eliminar), veto recusado e aceito, vitória fascista pelo Hitler chanceler vitória liberal pelo Hitler eliminado e uma mesa de 5 (o Hitler vê o fascista, a 3ª lei fascista deixa espiar), troca de estilo, a lei nova carimbando no tabuleiro e a faixa de quem governa. Confere também que a partida volta depois de recarregar, que nada passa da largura da tela e que não há erro de script. Capturas em `tests/shots/`.

`pwa.py` publica o build e depois uma "versão seguinte" e confere: a página fica guardada, a primeira instalação não anuncia nada, o app abre com o site fora do ar, a versão nova é anunciada, o app em uso só troca depois do toque, a cópia antiga é apagada, publicar de novo sem mudar o app não avisa, e fechar e abrir de novo entra na versão que esperava. O build precisa estar num repositório git, porque a tela mostra o commit.

## Publicação

Deploy contínuo pela integração da Vercel com o GitHub: cada PR ganha uma URL de prévia e cada merge na `main` publica em produção, em https://secret-hitler.vercel.app. O `vercel.json` manda a Vercel fazer o mesmo que o `verify.sh` e o CI fazem: `npm ci`, `npm run build`, publicar `dist/`. Sem ele, a Vercel pode escolher sozinha outro preset e procurar arquivos que não existem. O `.vercelignore` deixa de fora o que o build não lê.

O build grava o commit em `<meta name="app-commit">`. Na Vercel ele vem da variável `VERCEL_GIT_COMMIT_SHA`; fora dela, do `git`.

A Vercel publica o que chegar na `main` sem olhar o CI. Quem garante que só entra código testado é a proteção do branch `main` exigindo os checks `checks`, `e2e (dark)` e `e2e (light)`.

**Merges em sequência podem deixar a produção numa versão antiga:** a Vercel faz um deploy por merge, e se o mais antigo termina por último ele fica com o endereço de produção. Por isso:

- Mesclar um PR por vez e esperar o deploy, ou mesclar só o último quando um PR já contém os anteriores.
- O workflow `Produção` roda `scripts/check_production.py` depois de cada push na `main`: espera a produção mostrar o carimbo do commit que entrou e **continua olhando por 5 min**. Falhou: na Vercel, promover o deploy do commit mais recente da `main`, ou fazer um novo merge. O endereço vem de `APP_PROD_URL`, com https://secret-hitler.vercel.app como padrão.
- Em PR o mesmo script só informa qual commit a produção está servindo (`--report`) e nunca falha. `--selftest` testa o script contra um servidor local e roda no `verify.sh`.

**Publicar não troca o app de quem já abriu.** O aparelho mostra a cópia guardada até a pessoa tocar em "Atualizar agora".

No iPhone: abrir a URL no Safari → Compartilhar → Adicionar à Tela de Início.

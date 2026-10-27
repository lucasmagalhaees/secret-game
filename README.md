# Secret Hitler

Jogo de dedução social no estilo Secret Hitler: liberais contra fascistas (com um Hitler escondido), num celular que passa de mão em mão. 5 a 10 lugares; dá para jogar sozinho contra a IA, em quatro níveis.

Feito a partir do modelo de arquitetura do Oito Lados: página estática em TypeScript, um arquivo só no ar, núcleo puro testado no Node e no navegador, testes ponta a ponta com Playwright, deploy na Vercel a cada merge e um conjunto de regras para trabalhar com IA sem que ela diga que funciona sem ter rodado.

Baseado em [Secret Hitler](https://www.secrethitler.com), de Goat, Wolf, & Cabbage, licenciado em [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Este app herda a licença: uso não comercial, com crédito, e adaptações sob a mesma licença.

## Começar um app novo com este modelo

1. Copie a pasta e dê o nome: `python3 scripts/rename.py "Nome do App" nome-do-app`. Troca "Secret Hitler", o slug (pacote, endereço na Vercel, caches) e a chave do `localStorage`.
2. `git init -b main && git add -A && git commit -m "chore: começa do modelo"` (o build carimba o commit; o `tests/pwa.py` confere esse carimbo).
3. `npm install`, `pip install -r tests/requirements.txt && playwright install chromium`, e `scripts/verify.sh`: tem que terminar em "tudo passou".
4. Crie o repositório no GitHub e faça o push da `main`.
5. Na Vercel: importe o repositório. O `vercel.json` já diz o que fazer (`npm ci`, `npm run build`, publicar `dist/`). O endereço de produção vira `https://nome-do-app.vercel.app`; se for outro, troque em `scripts/check_production.py` (ou defina `APP_PROD_URL`) e no `CLAUDE.md`.
6. No GitHub, proteja a `main`: exigir PR e os checks `checks`, `e2e (dark)` e `e2e (light)`. A Vercel publica o que chega na `main` sem olhar o CI; é essa proteção que segura código não testado.
7. Preencha o `CLAUDE.md` (o que é o app, o escopo, os requisitos) e troque a lista de exemplo pelo app de verdade, mantendo a divisão entre `src/core/` e `src/app/`.

## O que faz

- Monta a mesa, sorteia os papéis e mostra cada um em segredo ("passe o celular para…").
- Conduz as rodadas: indicação, votação, mão do presidente e do chanceler, poderes, veto, caos e fim de jogo. As regras completas estão nos requisitos do [`CLAUDE.md`](CLAUDE.md) e na tela inicial do app.
- Joga sozinho ou com poucos: a IA ocupa os lugares vazios, em quatro níveis, e cada IA só sabe o que o lugar dela saberia. Dá para treinar escolhendo o próprio papel e ligar uma ata com quem aprovou cada lei.
- A partida fica guardada no aparelho. Abre sem internet depois da primeira vez, e avisa quando sai versão nova.
- Tema automático, claro ou escuro.

Para rodar: `npm install` e `npm run dev`. Para testar tudo: `scripts/verify.sh`.

## Estrutura

```
index.html
src/main.ts
src/core/
src/app/
src/sw.js
src/styles.css
vite.config.js
tsconfig.json
vercel.json
scripts/verify.sh
scripts/check_production.py
scripts/rename.py
scripts/ai_bench.mjs
tests/unit.cases.mjs
tests/core.mjs
tests/unit.py
tests/contract.py
tests/docs_check.py
tests/e2e.py
tests/pwa.py
tests/cov.py
tests/fixtures/source/
.github/workflows/ci.yml
.github/workflows/producao.yml
.claude/settings.json
docs/decisoes.md
docs/verificacao.md
```

As regras de trabalho estão em [`CLAUDE.md`](CLAUDE.md) e em [`CONTRIBUTING.md`](CONTRIBUTING.md).

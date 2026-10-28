import { Core } from '../core';
import type { Ask, Event, Game, Gov, Law, Level, Pack, Party, Persona, Region, Role } from '../core';
import type { EndTab } from './state';
import { animalOf, portrait, seal } from './art';
import { $, esc, part, themed } from './format';
import { S, ui } from './state';
import { builtFrom, canUpdate } from './update';
import { kept } from './history';

/* ================= the screen =================
   Rendering is innerHTML from the state. Every text that did not come from the code goes through esc(). A field with
   the focus is left alone, so what the person is typing is never thrown away.
   Secrets (a role, the laws in a hand, a party, the next laws) are only drawn behind a gate: first the screen asks for
   the phone to go to one person, and only their tap opens it. The gate is closed again whenever the game moves on. */
/* What the last paint showed, so that only what just changed moves: the phase card slides in when the phase changes,
   a secret flips in when it is opened, and a law stamps onto the board when it is enacted. A tap that only picks a
   card repaints without moving anything. */
let seenPhase = '', seenOpen = '', seenLaws = { L: 0, F: 0 }, seenTracker = 0, seenHist = 0, seenDead = new Set<string>(), entering = false, flipping = false;

export function render(): void {
  const view = part('view'), active = document.activeElement;
  if (active && view.contains(active) && active.matches('input, textarea')) return;
  const g = S.game;
  P = (g ? g.pack : S.pack) || 'fascismo'; R = (g ? g.region : S.region) || 'mundo'; W = Core.words(P, R);
  document.documentElement.dataset.pack = P;
  document.documentElement.dataset.region = R;              // the cards wear the continent's colours (D29)
  part('boss').textContent = W.boss;
  part('score').innerHTML = g ? `<span class="chip L">${g.laws.L}/${Core.WIN.L}</span><span class="chip F">${g.laws.F}/${Core.WIN.F}</span>` : '';
  view.innerHTML = themed(g ? vGame(g) : ui.gallery ? vGallery() : vPack() + vTable() + vRules() + vHistory() + vSettings(), W as unknown as Record<string, string>);
}

/** The words of the theme of what is on screen (D12): the game's, or before a game the one chosen at the table. */
let P: Pack = 'fascismo', R: Region = 'mundo', W = Core.words();
const role = (r: Role): string => (r === 'liberal' ? 'Liberal' : r === 'hitler' ? W.boss : W.F);
const party = (p: Law): string => (p === 'L' ? 'Liberal' : W.F);
const POWER_LABEL: Record<string, string> = { investigate: 'partido', peek: 'espiar', special: 'eleição', execute: 'eliminar' };
const name = (g: Game, i: number): string => esc(g.players[i].name);
const AI_TAG = '<small class="ai">IA</small>';
/** What each level does, in a line (D10). */
export const LEVEL: Record<Level, [string, string]> = {
  facil: ['Fácil', 'Escolhe e vota sem pensar muitas vezes, esquece o que aconteceu há mais de cinco governos e acredita em quase tudo que ouve. Os {fs} mentem pouco.'],
  medio: ['Médio', 'Joga pelo próprio lado, lembra dos últimos governos e desconfia de vez em quando. Os {fs} mentem quando a verdade entrega.'],
  dificil: ['Difícil', 'Lembra de tudo e desconfia de história que não fecha. Os {fs} pensam em como a mesa vai ver cada jogada e armam para o {boss} parecer limpo.'],
  extremo: ['Extremo', 'Conta as cartas: sabe quantas leis de cada tipo ainda podem sair e calcula a chance de cada fala ser verdade. Nunca vê o papel de ninguém.']
};
const law = (l: Law, k?: number): string => {
  const face = `<span class="sym">${seal(l, P)}</span><span>${l === 'L' ? 'Liberal' : '{F}'}</span>`;
  return k === undefined ? `<div class="law ${l}">${face}</div>`
    : `<button class="law ${l}${ui.pick === k ? ' on' : ''}" data-act="pick" data-k="${k}" aria-pressed="${ui.pick === k}">${face}</button>`;
};

/* ---------- before the game: the table ---------- */
function vTable(): string {
  const names = S.names, n = names.length;
  let h = `<section class="card" id="table"><span class="label">Mesa (${Core.MIN_PLAYERS} a ${Core.MAX_PLAYERS} jogadores)</span>`;
  h += n ? `<ul class="names" id="names">${names.map((x, i) => `<li><span>${i + 1}. <b>${esc(x)}</b>${S.ai?.[i] ? ` ${AI_TAG}` : ''}</span><button class="x" data-act="rmname" data-i="${i}" aria-label="Tirar ${esc(x)}">×</button></li>`).join('')}</ul>`
    : '<p class="empty" id="empty">Ninguém na mesa ainda. Coloque os nomes na ordem em que vocês estão sentados.</p>';
  h += `<div class="row"><div class="field"><input id="name" maxlength="${Core.NAME_MAX}" autocomplete="off" placeholder="nome do jogador" value="${esc(ui.name)}" aria-label="Nome do jogador"></div><button class="btn" data-act="addname">Pôr</button><button class="btn ghost" data-act="addbot"${n >= Core.MAX_PLAYERS ? ' disabled' : ''}>+ IA</button></div>`;
  h += ui.msg ? `<p class="msg" id="msg">${esc(ui.msg)}</p>` : '';
  h += n ? `<button class="more" data-act="clear" id="clear">${ui.confirmClear ? 'Toque de novo para tirar todos' : 'Limpar a mesa'}</button>` : '';
  const short = Core.MIN_PLAYERS - n;
  h += short > 0
    ? `<button class="btn block" data-act="start" disabled>Faltam ${short} para começar</button>${n ? `<button class="btn ghost block" data-act="fill" data-n="${Core.MIN_PLAYERS}" id="fillmin">Completar com ${short} da IA</button>` : '<p class="hint">Ponha os nomes, ou só o seu e complete com a IA.</p>'}</section>`
    : `<button class="btn block" data-act="start">Começar com ${n} jogadores</button></section>`;
  return h + vSolo();
}
/** The choices of a game against the app that are not needed to start one (D18): the training role, the speed, the
 *  trainer and the minutes. Closed, one line says how they are set. */
function vMore(): string {
  return `<div id="moreopts">
    <p class="hint">Seu papel (treino)</p><div class="segm roles" role="group" aria-label="Seu papel">${(['', 'liberal', 'fascista', 'hitler'] as const).map(r => `<button class="${(S.train || '') === r ? 'on' : ''}" data-act="train" data-v="${r}" aria-pressed="${(S.train || '') === r}">${r ? role(r) : 'Sorteado'}</button>`).join('')}</div>
    <p class="hint" id="traintext">${S.train ? `Você vai ser ${role(S.train).toLowerCase()}, para treinar esse lado. Vale quando só você é gente na mesa; as IAs não sabem que você escolheu.` : 'O seu papel é sorteado, como numa partida normal.'}</p>
    <p class="hint">Velocidade da IA</p><div class="segm" role="group" aria-label="Velocidade da IA">${(['lenta', 'normal', 'rapida'] as const).map(v => `<button class="${(S.speed || 'normal') === v ? 'on' : ''}" data-act="speed" data-v="${v}" aria-pressed="${(S.speed || 'normal') === v}">${{ lenta: 'Lenta', normal: 'Normal', rapida: 'Rápida' }[v]}</button>`).join('')}</div>
    <p class="hint">Dicas do treinador</p><div class="segm" role="group" aria-label="Dicas do treinador"><button class="${S.coach ? '' : 'on'}" data-act="coach" data-v="off" aria-pressed="${!S.coach}">Desligadas</button><button class="${S.coach ? 'on' : ''}" data-act="coach" data-v="on" aria-pressed="${!!S.coach}">Ligadas</button></div>
    <p class="hint">${S.coach ? 'Depois de cada governo, o treinador faz as contas com o que só você sabe: a chance da mão que o presidente disse, se as falas fecham, e quem parece mais {f}.' : 'Ligadas, o treinador explica o que dá para tirar de cada governo.'}</p>
    <p class="hint">Assistência</p><div class="segm" role="group" aria-label="Assistência"><button class="${S.assist ? '' : 'on'}" data-act="assist" data-v="off" aria-pressed="${!S.assist}">Desligada</button><button class="${S.assist ? 'on' : ''}" data-act="assist" data-v="on" aria-pressed="${!!S.assist}">Ata com votos</button></div>
    <p class="hint">${S.assist ? 'A ata mostra cada lei, quem governou e quem votou {ja} no governo que a aprovou, e soma por jogador. Só o que a mesa toda viu.' : 'Ligada, a partida ganha uma ata com quem aprovou cada lei.'}</p>
  </div>`;
}
const moreSum = (): string => `Seu papel: ${S.train ? role(S.train).toLowerCase() : 'sorteado'} · velocidade ${({ lenta: 'lenta', normal: 'normal', rapida: 'rápida' } as const)[S.speed || 'normal']} · treinador ${S.coach ? 'ligado' : 'desligado'} · ata ${S.assist ? 'ligada' : 'desligada'}`;
/** Playing alone, or with fewer people than a table needs: the app plays the other seats, at the level chosen. */
function vSolo(): string {
  const lv = S.level || 'medio', bots = (S.ai || []).filter(Boolean).length;
  const now = S.names.length, size = (k: number): string => `<button class="${now === k ? 'on' : ''}" data-act="fill" data-n="${k}" aria-pressed="${now === k}">${k}</button>`;
  const lvl = (l: Level): string => `<button class="${lv === l ? 'on' : ''}" data-act="level" data-v="${l}" aria-pressed="${lv === l}">${LEVEL[l][0]}</button>`;
  return `<section class="card" id="solo"><span class="label">Contra a IA</span><p class="hint">Jogue sozinho ou com poucos: ponha o seu nome e complete a mesa com jogadores da IA. Cada IA só sabe o que aquele lugar saberia na mesa.</p>
    <p class="hint">Lugares na mesa (põe ou tira IA)</p><div class="segm" role="group" aria-label="Lugares na mesa">${[5, 6, 7, 8, 9, 10].map(size).join('')}</div>
    <p class="hint">Nível da IA</p><div class="segm" role="group" aria-label="Nível da IA">${Core.LEVELS.map(lvl).join('')}</div><p class="hint" id="leveltext">${LEVEL[lv][1]}</p>
    <button class="more" data-act="more" id="moretoggle" aria-expanded="${ui.more}" aria-controls="moreopts">${ui.more ? 'Menos opções ▴' : 'Mais opções ▾'}</button>
    ${ui.more ? vMore() : `<p class="hint" id="moresum">${moreSum()}</p>`}
    ${bots ? `<p class="hint">${bots} ${bots === 1 ? 'lugar é' : 'lugares são'} da IA.</p>` : ''}</section>`;
}
/** The theme of the game (D12): the same rules, other sides, other names, other drawings. */
function vPack(): string {
  const cur = S.pack || 'fascismo';
  const opt = (k: Pack): string => `<button class="${cur === k ? 'on' : ''}" data-act="pack" data-v="${k}" aria-pressed="${cur === k}"><span class="packart">${portrait('liberal', k, S.region)}${portrait('fascista', k, S.region)}${portrait('hitler', k, S.region)}</span>${Core.WORDS[k].theme}</button>`;
  return `<section class="card" id="pack"><span class="label">Tema do jogo</span><div class="packs" role="group" aria-label="Tema do jogo">${Core.PACKS.map(opt).join('')}</div>
    <p class="hint" id="packtext">${cur === 'comunismo' ? 'Os comunistas são o time escondido e o Stalin é o líder deles. Vota-se Da! ou Niet!. As regras são as mesmas; as IAs ganham nomes de liberais e comunistas.' : 'O jogo original: os fascistas são o time escondido e o Hitler é o líder deles.'}</p>
    <p class="hint">Nomes da IA</p><div class="segm regions" role="group" aria-label="Nomes da IA">${Core.REGIONS.filter(r => r !== 'brasil').map(r => `<button class="${(S.region || 'mundo') === r ? 'on' : ''}" data-act="region" data-v="${r}" aria-pressed="${(S.region || 'mundo') === r}">${Core.REGION_NAMES[r]}</button>`).join('')}</div>
    ${S.dlc ? `<button class="btn ghost block dlc-region${S.region === 'brasil' ? ' on' : ''}" data-act="region" data-v="brasil" aria-pressed="${S.region === 'brasil'}">Brasil · DLC</button>` : ''}
    <p class="hint" id="regiontext">Figuras conhecidas ${({ mundo: 'do mundo todo', americas: 'das Américas', europa: 'da Europa', asia: 'da Ásia', africa: 'da África', oceania: 'do mundo todo (da Oceania, só os bichos)', brasil: 'do Brasil (DLC)' } as const)[S.region || 'mundo']}, dos dois lados misturados. O nome é só apelido de jogo: o papel é sorteado, e quem tem nome de liberal pode ser o {boss}.</p><button class="more" data-act="gallery" id="gallerytoggle">Ver todos os desenhos ▸</button>
    ${S.dlc ? '<p class="hint" id="dlcon">DLC Brasil liberada.</p>' : `<details class="dlc" id="dlc"><summary>Tem uma senha?</summary><div class="row"><div class="field"><input id="dlckey" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="senha" aria-label="Senha da DLC"></div><button class="btn" data-act="dlc" id="dlcgo">Liberar</button></div></details>`}</section>`;
}
/** Every drawing of the game (D25): each continent, each theme, the liberal, the member of the hidden side and its
 *  leader, with the animal's name. */
function vGallery(): string {
  const back = '<button class="btn ghost block" data-act="gallery" id="galleryback">Voltar</button>';
  const cell = (r: Role, k: Pack, reg: Region, label: string): string => `<figure>${portrait(r, k, reg)}<figcaption><b>${label}</b>${animalOf(r, k, reg)}</figcaption></figure>`;
  const block = (reg: Region): string => `<section class="card gallery" id="gallery-${reg}"><span class="label">${Core.REGION_NAMES[reg]}</span>
    ${Core.PACKS.map(k => `<p class="hint">${Core.WORDS[k].theme}</p><div class="cast">${cell('liberal', k, reg, 'Liberal')}${cell('fascista', k, reg, Core.WORDS[k].F)}${cell('hitler', k, reg, Core.WORDS[k].boss)}</div>`).join('')}</section>`;
  return `<section class="card" id="gallery"><span class="label">Todos os desenhos</span><p class="hint">Cada continente com os bichos dos dois temas. O de cima é o do jogo original.</p>${back}</section>${Core.REGIONS.filter(r => r !== 'brasil' || S.dlc).map(block).join('')}<section class="card">${back}</section>`;
}
function vRules(): string {
  const head = `<section class="card" id="rules"><span class="label">Como joga</span><p>Liberais contra {fs}, e o {boss} escondido entre os {fs}. Ganha quem aprovar ${Core.WIN.L} leis liberais ou ${Core.WIN.F} {fs} primeiro.</p><button class="more" data-act="rules" id="rulestoggle" aria-expanded="${ui.rules}" aria-controls="ruleslist">${ui.rules ? 'Esconder as regras ▴' : 'Ver as regras ▾'}</button>`;
  if (!ui.rules) return `${head}</section>`;
  return `${head}<ul class="rules" id="ruleslist">
    <li>Baralho de ${Core.DECK_F + Core.DECK_L} leis: ${Core.DECK_F} {fs} e ${Core.DECK_L} liberais. Os liberais vencem com ${Core.WIN.L} leis liberais; os {fs}, com ${Core.WIN.F} {fs}.</li>
    <li>Os {fs} se conhecem e sabem quem é o {boss}. Com 5 ou 6 jogadores o {boss} também sabe quem é o {f}; com 7 ou mais, não sabe. Os liberais não conhecem ninguém.</li>
    <li>A cada rodada o presidente indica o chanceler e a mesa vota. Eleito, o presidente tira 3 leis e descarta 1; o chanceler recebe 2, descarta 1 e a outra vira lei.</li>
    <li>O último presidente e o último chanceler eleitos não podem ser chanceler na rodada seguinte (com ${Core.SMALL_TABLE} vivos ou menos, só o último chanceler).</li>
    <li>${Core.TRACKER_MAX} governos rejeitados seguidos: a lei do topo entra sozinha, sem poder, e o limite de mandato zera.</li>
    <li>Os poderes do presidente dependem da mesa. Com 5 ou 6: na 3ª lei {f} olha as próximas 3 leis. Com 7 ou 8: na 2ª descobre o partido de alguém, na 3ª convoca eleição especial. Com 9 ou 10: na 1ª e na 2ª descobre o partido de alguém, na 3ª convoca eleição especial. Em toda mesa, na 4ª e na 5ª elimina alguém. Ninguém é investigado duas vezes.</li>
    <li>Eleição especial: o presidente escolhe quem é o próximo presidente. Depois dessa rodada a ordem volta a partir de quem convocou.</li>
    <li>A partir da ${Core.VETO_FROM}ª lei {f} o chanceler pode pedir veto das duas leis; se o presidente aceitar, conta como governo rejeitado.</li>
    <li>Com ${Core.HITLER_ZONE} ou mais leis {fs}, eleger o {boss} chanceler dá a vitória aos {fs}. Eliminar o {boss} dá a vitória aos liberais.</li>
  </ul><p class="hint" id="credit">Baseado em <a href="https://www.secrethitler.com">Secret Hitler</a>, de Goat, Wolf, &amp; Cabbage, sob a licença <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br">CC BY-NC-SA 4.0</a>. Uso não comercial.</p></section>`;
}

/* ---------- the game ---------- */
function vGame(g: Game): string {
  const key = `${g.phase}:${beat(g)}:${g.reveal}`;
  entering = key !== seenPhase; seenPhase = key;
  // talk and claims happen beside the phase, not instead of it; while one goes on, a phase an app player holds still
  // shows that player deciding, never the gate of its secret (D21)
  const bot = Core.botTurn(g), under = Core.turn(g), side = ['pc', 'cc', 'inv', 'peek', 'talk'];
  const acting = bot && !side.includes(bot.ask) ? bot : under && under.ask !== 'votes' && g.players[under.seat]?.ai ? under : null;
  const phase = acting ? vBot(g, acting.seat, acting.ask) : vPhase(g);
  // what the person has to do comes first; what helps them decide (their claim, the trainer) right after it
  const card = phase.replace('<section class="card', `<section class="card${entering ? ' enter' : ''}`);
  if (g.phase === 'over') {
    // the end, in tabs (D18): the result first; the whole game and the record one tap away
    const tabs: [EndTab, string][] = [['res', 'Resultado'], ['jogo', 'Resumo'], ['log', 'Registro']];
    const bar = `<div class="segm endtabs" role="tablist" aria-label="Fim de jogo">${tabs.map(([k, l]) => `<button role="tab" id="tab-${k}" class="${ui.endTab === k ? 'on' : ''}" data-act="endtab" data-v="${k}" aria-selected="${ui.endTab === k}">${l}</button>`).join('')}</div>`;
    const body = ui.endTab === 'jogo' ? vSummary(g) + vAta(g) : ui.endTab === 'log' ? vLog(g) : vThoughts(g) + vNotesScore(g) + vReview(g) + vPlayers(g) + vBoard(g);
    return card + bar + body + vDock(g);
  }
  return vUndo() + vStatus(g) + vSeats(g) + vSaid(g) + vHelp(g) + card + vClaims(g) + vCoach(g) + vWatching(g) + vPlayers(g) + vBoard(g) + vAta(g) + vLog(g) + `<section class="card"><button class="btn ghost block" data-act="end">${ui.confirmEnd ? 'Toque de novo para encerrar o jogo' : 'Encerrar jogo'}</button></section>` + vDock(g);
}
/** A player run by the app is deciding: the screen says who and what, and shows nothing secret. */
const DOING: Record<string, string> = {
  reveal: 'está vendo o próprio papel', nominate: 'está escolhendo o chanceler', votes: 'A mesa está votando', pdiscard: 'está olhando as 3 leis',
  cdiscard: 'está olhando as 2 leis', veto: 'está decidindo se aceita o veto', investigate: 'está escolhendo quem investigar',
  see: 'está olhando em segredo', special: 'está escolhendo o próximo presidente', execute: 'está escolhendo quem eliminar'
};
function vBot(g: Game, seat: number, ask: string): string {
  const who = ask === 'votes' ? '' : `<b>${name(g, seat)}</b> ${AI_TAG} `;
  return `<section class="card" id="phase"><span class="label">Vez da IA</span><p class="big thinking" id="thinking">${who}${DOING[ask]}<span class="dots-wait" aria-hidden="true"><i></i><i></i><i></i></span></p></section>`;
}
/** The person at a table with app players was eliminated: the game plays on to the end, for them to watch. */
const vWatching = (g: Game): string => Core.hasAi(g) && g.phase !== 'over' && !Core.humansAlive(g).length
  ? '<section class="card" id="watching"><p class="hint">Você saiu do jogo. As IAs jogam até o fim; no fim, todos os papéis aparecem.</p></section>' : '';
/** What a person at a table with app players may tell the table (the app players hear it and weigh it). */
function vClaims(g: Game): string {
  if (!Core.hasAi(g)) return '';
  const cards = Core.humansAlive(g).flatMap(i => Core.claims(g, i).map(w => vClaim(g, i, w)));
  return cards.join('');
}
const CLAIM: Record<string, [string, string[]]> = {
  pc: ['Você foi presidente. O que diz que tirou?', ['3 liberais', '1 {f} e 2 liberais', '2 {fs} e 1 liberal', '3 {fs}']],
  cc: ['Você foi chanceler. O que diz que recebeu?', ['2 liberais', '1 {f} e 1 liberal', '2 {fs}']],
  inv: ['Você investigou. O que diz que viu?', ['Liberal', '{F}']],
  peek: ['Você espiou. O que diz que vem?', ['3 liberais', '1 {f} e 2 liberais', '2 {fs} e 1 liberal', '3 {fs}']]
};
function vClaim(g: Game, seat: number, w: Ask): string {
  const [q, opts] = CLAIM[w], many = Core.humansAlive(g).length > 1;
  return `<section class="card claim" id="claim-${w}"><span class="label">Diga à mesa${many ? ` · ${name(g, seat)}` : ''}</span><p>${q}</p><div class="pick">${opts.map((o, v) => `<button class="btn ghost" data-act="say" data-w="${w}" data-i="${seat}" data-v="${v}">${o}</button>`).join('')}</div><button class="btn ghost block" data-act="say" data-w="${w}" data-i="${seat}" data-v="-1">Não falar nada</button><p class="hint">Pode mentir. As IAs ouvem e comparam com o que sabem.</p></section>`;
}
/** Taking back the last public choice (a nomination, a vote result), while nothing else has happened since. */
const vUndo = (): string => ui.undo ? `<button class="undo" data-act="undo" id="undo">↶ Desfazer o último toque</button>` : '';

/** What to do in each phase, for whoever is holding the phone. */
const HELP: Record<string, string> = {
  reveal: 'Cada um vê o próprio papel sozinho. Passe o celular para a pessoa indicada; ela toca em "mostrar", lê e esconde antes de passar adiante.',
  nominate: 'O presidente escolhe quem vai ser o chanceler. O último governo eleito não pode voltar como chanceler.',
  vote: 'Todo mundo vota ao mesmo tempo, em voz alta: {ja} (sim) ou {nein} (não). Mais {ja} que {nein} elege. Marque o resultado aqui.',
  president: 'Só o presidente olha: ele tira 3 leis, descarta 1 e passa as outras 2 para o chanceler. Pode mentir sobre o que tirou.',
  chancellor: 'Só o chanceler olha: das 2 leis, descarta 1 e a outra é aprovada. A partir da 5ª lei {f} dá para pedir veto.',
  veto: 'O chanceler quer descartar as duas leis. Se o presidente aceitar, nenhuma lei entra e conta como governo rejeitado.',
  investigate: 'O presidente escolhe alguém e vai ver, em segredo, o partido dessa pessoa. Depois conta (ou não) para a mesa.',
  investigated: 'Só o presidente olha o partido. O {boss} aparece como {f}.',
  peek: 'Só o presidente olha as 3 próximas leis do baralho, na ordem. Elas continuam lá.',
  special: 'O presidente escolhe quem é o próximo presidente. Depois dessa rodada, a ordem volta a partir de quem convocou.',
  execute: 'O presidente elimina alguém. Se for o {boss}, os liberais vencem. O papel de quem sai não é revelado.',
  over: 'Fim de jogo. Na aba Resumo, cada governo, inclusive o que cada investigação mostrou de verdade.'
};
const HELP_AI: Record<string, string> = {
  vote: 'Cada pessoa toca no próprio voto; as IAs votam junto, e todos os votos aparecem. Mais {ja} que {nein} elege; empate rejeita.',
  reveal: 'Cada pessoa vê o próprio papel sozinha. As IAs já sabem o delas, e só o delas (um {f} também sabe quem é do time).'
};
function vHelp(g: Game): string {
  const text = (Core.hasAi(g) && HELP_AI[g.phase]) || HELP[g.phase];
  return `<div class="help"><button class="helpbtn" data-act="help" aria-expanded="${ui.help}" aria-controls="helptext"><b aria-hidden="true">${ui.help ? '✕' : '?'}</b>${ui.help ? 'Fechar a explicação' : 'Como funciona esta fase'}</button>${ui.help ? `<p class="helptext" id="helptext">${text}${Core.hasAi(g) ? ` IA no nível ${LEVEL[g.level || 'medio'][0].toLowerCase()}.` : ''}</p>` : ''}</div>`;
}

/** The game, round by round, at the end: who governed, which law came out, and what was secret then. */
function vSummary(g: Game): string {
  const n = (i: number): string => `<b>${name(g, i)}</b>`, pl = (p: Party): string => `<span class="role ${p}">${p === 'L' ? 'liberal' : W.f}</span>`;
  const cards = (ls?: Law[]): string => (ls || []).map(l => `<i class="mini ${l}">${l}</i>`).join('');
  const told = (x: number | undefined): string => x === undefined ? '' : x < 0 ? 'calado' : `disse ${x}F`;
  const hands = (e: Gov): string => e.drew && e.drew.length ? `<small class="hands">tirou ${cards(e.drew)}${told(e.pc) ? ` (${told(e.pc)})` : ''} · passou ${cards(e.got)}${told(e.cc) ? ` (${told(e.cc)})` : ''}</small>` : '';
  const line = (e: Event): string => {
    switch (e.k) {
      case 'gov': return `<li class="gov ${e.law}">${n(e.pres)} + ${n(e.chanc)} aprovaram lei ${pl(e.law as Law)}${hands(e)}</li>`;
      case 'rej': return `<li class="rej">${n(e.pres)} + ${n(e.chanc)} rejeitados</li>`;
      case 'veto': return `<li class="rej">${n(e.pres)} + ${n(e.chanc)} vetaram as duas leis${hands(e)}</li>`;
      case 'vote': case 'talk': return '';
      case 'chaos': return `<li class="gov ${e.law}">Caos: entrou lei ${pl(e.law)}</li>`;
      case 'inv': return `<li class="inv">${n(e.by)} investigou ${n(e.target)}: era ${pl(e.party)}${e.said && e.said !== '-' ? `<small class="hands">disse ${e.said === 'L' ? 'liberal' : W.f}${e.said !== e.party ? ' — mentiu' : ''}</small>` : ''}</li>`;
      case 'peek': return `<li>${n(e.by)} espiou as próximas 3 leis${e.saw ? `<small class="hands">viu ${cards(e.saw)}${e.said !== undefined && e.said >= 0 ? ` (disse ${e.said}F)` : ''}</small>` : ''}</li>`;
      case 'special': return `<li>${n(e.by)} convocou eleição especial para ${n(e.target)}</li>`;
      default: return `<li class="exec">${n(e.by)} eliminou ${n(e.target)} (${role(e.role)})</li>`;
    }
  };
  return `<section class="card" id="summary"><span class="label">Resumo da partida</span>${g.hist.length ? `<ol class="timeline">${g.hist.map(line).join('')}</ol>` : '<p class="hint">Nada aconteceu.</p>'}</section>`;
}

/** Who governs now, always in view: the president, the chancellor (or who is nominated) and the rejections in a row. */
function vStatus(g: Game): string {
  if (g.phase === 'reveal' || g.phase === 'over') return '';
  const chanc = g.chanc === null ? '—' : name(g, g.chanc);
  return `<div class="status" id="status"><span><small>Presidente</small><b>${name(g, g.pres)}</b></span><span><small>${g.phase === 'vote' ? 'Indicado' : 'Chanceler'}</small><b>${chanc}</b></span><span><small>Rejeições</small><b>${g.tracker}/${Core.TRACKER_MAX}</b></span></div>`;
}
function vBoard(g: Game): string {
  const fresh = { L: g.laws.L > seenLaws.L ? g.laws.L - 1 : -1, F: g.laws.F > seenLaws.F ? g.laws.F - 1 : -1 };
  seenLaws = { ...g.laws };
  const slots = (p: Law): string => Array.from({ length: Core.WIN[p] }, (_, i) => {
    const filled = g.laws[p] > i, tag = i + 1 === Core.WIN[p] ? 'vitória' : p === 'F' ? POWER_LABEL[Core.powerAt(g, i + 1) || ''] || '' : '';
    return `<div class="slot ${p}${filled ? ' on' : ''}${fresh[p] === i ? ' new' : ''}">${filled ? seal(p, P) : ''}<small>${tag}</small></div>`;
  }).join('');
  const dots = Array.from({ length: Core.TRACKER_MAX }, (_, i) => `<i class="${g.tracker > i ? 'on' : ''}"></i>`).join('');
  const last = g.hist[g.hist.length - 1], chaosNow = g.hist.length > seenHist && last?.k === 'chaos';
  const bump = g.tracker > seenTracker || chaosNow;
  seenTracker = g.tracker; seenHist = g.hist.length;
  return `<section class="card" id="board"><span class="label">Leis liberais</span><div class="track" style="--n:${Core.WIN.L}">${slots('L')}</div>
    <span class="label">Leis {fs}</span><div class="track" style="--n:${Core.WIN.F}">${slots('F')}</div>
    <div class="meta"><span>Rejeições seguidas <span class="dots${bump ? ' bump' : ''}" id="tracker">${dots}</span></span><span>Baralho: ${g.deck.length} · Lixo: ${g.discard.length}</span></div></section>`;
}
function vPlayers(g: Game): string {
  const dead = new Set(g.players.filter(p => !p.alive).map(p => p.name)), fresh = [...dead].filter(x => !seenDead.has(x));
  seenDead = dead;
  const kit = noteKit(g), notes = S.notes || {}, me = solo(g);
  const live = S.live && me >= 0 && g.phase !== 'over' && g.phase !== 'reveal' ? new Map(liveSuspicion(g, me).map(x => [x.seat, x.f])) : null;
  const meter = (i: number): string => { const f = live?.get(i); return f === undefined ? '' : `<span class="meter" title="Quanto ${esc(g.players[i].name)} desconfia de você agora"><i style="width:${Math.round(f * 100)}%"></i><b>${pct(f)}</b></span>`; };
  const liveBtn = me >= 0 && g.phase !== 'over' ? `<button class="live-toggle" data-act="live" aria-pressed="${!!S.live}" id="livetoggle">👁 Desconfiança ao vivo: ${S.live ? 'ligada' : 'desligada'}</button>` : '';
  return `<section class="card" id="players"><span class="label">Jogadores</span>${liveBtn}${live ? `<p class="hint">A barra é quanto cada IA desconfia de você agora.</p>${vCrux(g, me, 'live')}` : ''}<ul class="names">${g.players.map((p, i) => {
    const tag = g.phase === 'over' ? `<span class="role ${Core.partyOf(p.role)}">${role(p.role)}</span>` : i === g.pres ? '<span class="tag">Pres.</span>' : i === g.chanc ? '<span class="tag">Chanc.</span>' : '';
    const mark = kit && i !== kit.me ? notes[i] || '' : '';
    return `<li class="${p.alive ? '' : 'dead'}${fresh.includes(p.name) ? ' struck' : ''}${mark ? ` ${mark}` : ''}"><span class="who">${esc(p.name)}${p.ai ? ` ${AI_TAG}` : ''}${p.alive ? '' : ' <small>(eliminado)</small>'} ${tag}${g.phase === 'over' && p.persona ? ` <small class="persona" title="${PERSONA_W[p.persona][1]}">${PERSONA_W[p.persona][0]}</small>` : ''}</span>${meter(i)}${kit ? kit.cell(i, false) : ''}</li>`;
  }).join('')}</ul></section>`;
}
/** The live suspicion (D14), worked out once per state of the game: the same state paints many times. */
let liveCache: { key: string; rows: { seat: number; f: number }[] } | null = null;
function liveSuspicion(g: Game, me: number): { seat: number; f: number }[] {
  const key = `${g.log.length}:${g.hist.length}:${g.players.map(p => `${p.name}${p.alive ? 1 : 0}`).join()}`;
  if (!liveCache || liveCache.key !== key) liveCache = { key, rows: Core.suspicion(g, me) };
  return liveCache.rows;
}
/** One moment of the game, told from the point of view of `me` (D15): what the whole table saw happen. */
function moment(g: Game, i: number, me: number): string {
  const e = g.hist[i], who = (j: number): string => (j === me ? 'você' : `<b>${name(g, j)}</b>`);
  const lawW = (l?: Law): string => (l === 'L' ? 'liberal' : '{f}');
  const of3 = (n: number): string => (n === 0 ? '3 liberais' : n === 3 ? '3 {fs}' : n === 1 ? '1 {f} e 2 liberais' : '2 {fs} e 1 liberal');
  const of2 = (n: number): string => (n === 0 ? '2 liberais' : n === 2 ? '2 {fs}' : '1 {f} e 1 liberal');
  if (!e) return '';
  if (e.k === 'gov' || e.k === 'veto') {
    const what = e.k === 'veto' ? 'vetaram as duas leis' : `saiu lei ${lawW(e.law)}`;
    const said = [e.pc !== undefined && e.pc >= 0 ? `${who(e.pres)} disse que tirou ${of3(e.pc)}` : '', e.cc !== undefined && e.cc >= 0 ? `${who(e.chanc)} disse que recebeu ${of2(e.cc)}` : ''].filter(Boolean).join(' e ');
    const head = e.pres === me ? `Você foi presidente com ${who(e.chanc)}` : e.chanc === me ? `Você foi chanceler de ${who(e.pres)}` : `${who(e.pres)} e ${who(e.chanc)} governaram`;
    return `${head}: ${what}${said ? `, e ${said}` : ''}.`;
  }
  if (e.k === 'chaos') return `A lei ${lawW(e.law)} que entrou pelo caos.`;
  if (e.k === 'inv') {
    const said = e.said && e.said !== '-' ? (e.said === 'L' ? 'liberal' : '{f}') : '';
    if (e.target === me) return `${who(e.by)} usou o poder de investigar e viu o seu partido (a investigação mostra o partido de verdade, não o que você fez)${said ? `, e disse que você é ${said}` : ''}.`;
    return `${who(e.by)} investigou ${who(e.target)}${said ? ` e disse que é ${said}` : ''}.`;
  }
  if (e.k === 'exec') return `${who(e.by)} eliminou ${who(e.target)}.`;
  return '';
}
/** The crucial point (D15), for a person on the hidden side: the moment that raised the suspicion on them the most. */
function vCrux(g: Game, me: number, mode: 'end' | 'live'): string {
  if (g.players[me].role === 'liberal') return '';
  const c = mode === 'live' ? liveCrux(g, me) : Core.crux(g, me, 'end');
  if (!c) return '';
  const e = g.hist[c.at], mine = !!e && ((e.k === 'gov' || e.k === 'veto') ? e.pres === me || e.chanc === me : e.k === 'inv' ? e.target === me : false);
  const why = mine ? '' : '<p class="hint">Não foi uma jogada sua: quando outros parecem limpos, sobra desconfiança para quem ainda não se mostrou.</p>';
  return `<div class="crux" id="crux-${mode}"><small>${mode === 'live' ? 'O que mais fez a desconfiança subir até agora' : 'O ponto crucial: o que mais fez a desconfiança subir'}</small><p>${moment(g, c.at, me)}</p><b>${pct(c.before)} → ${pct(c.after)}</b>${why}</div>`;
}
let cruxCache: { key: string; c: ReturnType<typeof Core.crux> } | null = null;
function liveCrux(g: Game, me: number): ReturnType<typeof Core.crux> {
  const key = `${g.log.length}:${g.hist.length}:${g.players.map(p => `${p.name}${p.alive ? 1 : 0}`).join()}`;
  if (!cruxCache || cruxCache.key !== key) cruxCache = { key, c: Core.crux(g, me, 'live') };
  return cruxCache.c;
}
/** The one person at a table with app players, or -1. */
const solo = (g: Game): number => { const p = g.players.map((x, i) => (x.ai ? -1 : i)).filter(i => i >= 0); return Core.hasAi(g) && p.length === 1 ? p[0] : -1; };
const pct = (x: number): string => `${Math.round(x * 100)}%`;
/** The trainer's tips (D13): what a careful player could work out from the person's own seat, after each government. */
function vCoach(g: Game): string {
  const me = solo(g);
  if (!S.coach || me < 0 || !g.players[me].alive || g.phase === 'reveal' || g.phase === 'over') return '';
  const c = Core.coach(g, me), tips: string[] = [];
  if (c.odds) {
    const of = (n: number): string => (n === 0 ? '3 liberais' : n === 3 ? '3 {fs}' : n === 1 ? '1 {f} e 2 liberais' : '2 {fs} e 1 liberal');
    tips.push(`${name(g, c.odds.who)} disse que tirou ${of(c.odds.said)}. Pelas leis que ainda podem sair, a chance disso era de <b>${pct(c.odds.p)}</b>.${c.odds.p < 0.2 ? ' É pouco: desconfie.' : ''}`);
  }
  if (c.test) tips.push('O presidente passou uma {f} e uma liberal dizendo que tirou 2 liberais: <b>teste do chanceler</b>. Um liberal faz isso para ver o que o chanceler aprova, e um {f} pode se esconder atrás disso. O que o chanceler aprovou diz mais que o teste.');
  if (c.clash) tips.push('A história do último governo <b>não fecha</b>: o que o presidente disse que passou não bate com o que o chanceler disse que recebeu (ou com a lei que saiu). Alguém ali mentiu.');
  if (c.suspects.length) tips.push(`Pelas contas, com o que só você sabe: ${c.suspects.map(x => `<b>${name(g, x.seat)}</b> ${pct(x.f)}${x.boss >= 0.2 ? ` (${pct(x.boss)} de ser o {boss})` : ''}`).join(', ')} de chance de serem {fs}.`);
  if (g.players[me].role !== 'liberal') tips.push(`Como a mesa te vê, pelo que todos viram: <b>${pct(c.seen)}</b> de chance de você ser {f}.${c.seen >= 0.5 ? ' Cuidado: você está na mira.' : ''}`);
  return tips.length ? `<section class="card coach" id="coach"><span class="label">Dica do treinador</span>${tips.map(t => `<p>${t}</p>`).join('')}</section>` : '';
}
/** At the end (D13): how much each app player that did not know the person's role suspected them, law by law. A small
 *  line per player (one series each: no legend needed), the last value beside it. Tooltips on the points. */
let thoughtsCache: { key: string; html: string } | null = null;
/** At the end, with assistance on (D19): for each person at the table, the plays that were clearly good and clearly
 *  bad, the heaviest first. With assistance off, a button to turn it on. Worked out once per finished game. */
let reviewCache: { key: string; plays: Map<number, ReturnType<typeof Core.review>> } | null = null;
const SHOW = 4;
function vReview(g: Game): string {
  const people = g.players.map((p, i) => (p.ai ? -1 : i)).filter(i => i >= 0);
  if (!people.length || !g.hist.length) return '';
  if (!S.assist) return `<section class="card" id="review"><span class="label">Suas jogadas</span><p class="hint">Com a assistência ligada, o app aponta as jogadas boas e ruins de cada pessoa na mesa.</p><button class="btn ghost block" data-act="assist" data-v="on" id="reviewon">Ver jogadas boas e ruins</button></section>`;
  const key = `${g.log.length}:${g.hist.length}:${g.players.map(p => p.name).join()}`;
  if (!reviewCache || reviewCache.key !== key) reviewCache = { key, plays: new Map(people.map(i => [i, Core.review(g, i)])) };
  const one = people.length === 1;
  return people.map(i => {
    const all = reviewCache?.plays.get(i) || [], open = ui.allPlays;
    const pick = (good: boolean): ReturnType<typeof Core.review> => all.filter(x => x.good === good).sort((a, b) => b.weight - a.weight || a.at - b.at);
    const list = (xs: ReturnType<typeof Core.review>, good: boolean): string => xs.length
      ? `<ul class="plays ${good ? 'good' : 'bad'}">${(open ? xs : xs.slice(0, SHOW)).map(x => `<li>${whyText(g, x.text)}</li>`).join('')}</ul>`
      : `<p class="hint">${good ? 'Nenhuma que se destacou.' : 'Nenhuma jogada claramente ruim.'}</p>`;
    const good = pick(true), bad = pick(false), more = good.length > SHOW || bad.length > SHOW;
    return `<section class="card review" id="review${one ? '' : `-${i}`}"><span class="label">${one ? 'Suas jogadas' : `Jogadas de ${name(g, i)}`} · ${role(g.players[i].role).toLowerCase()}</span>
      <p class="hint">Pelo que deu certo ou errado, e pelo que dava para saber na hora: uma jogada que deu errado sem ter como saber não conta como ruim.</p>
      <b class="plays-head good">Boas</b>${list(good, true)}<b class="plays-head bad">Ruins</b>${list(bad, false)}
      ${more ? `<button class="more" data-act="allplays" aria-expanded="${open}">${open ? 'Mostrar só as principais ▴' : `Ver todas (${good.length + bad.length}) ▾`}</button>` : ''}</section>`;
  }).join('');
}
/** At the end (D28): how many of the roles the person deduced right in the notebook, seat by seat. */
function vNotesScore(g: Game): string {
  const me = solo(g);
  if (me < 0 || !g.notes) return '';
  const { right, wrong } = Core.notesScore(g, me), n = right.length + wrong.length;
  if (!n) return `<section class="card" id="notescore"><span class="label">Suas anotações</span><p class="hint">Nada para contar: você só marcou quem já sabia de certeza (o seu time ou quem você investigou).</p></section>`;
  const row = (i: number, ok: boolean): string => `<li class="${ok ? 'yes' : 'no'}"><b>${name(g, i)}</b> marcado ${g.notes?.[i] === 'L' ? W.libs : W.short}, era <span class="role ${Core.partyOf(g.players[i].role)}">${role(g.players[i].role)}</span></li>`;
  return `<section class="card" id="notescore"><span class="label">Suas anotações</span><p class="big-score"><b>${right.length}</b> de ${n} certas</p>
    <ul class="heard-list">${[...right.map(i => row(i, true)), ...wrong.map(i => row(i, false))].join('')}</ul><p class="hint">Só conta o que você deduziu: o time que você já conhecia e o que suas investigações mostraram ficam de fora.</p></section>`;
}
function vThoughts(g: Game): string {
  const me = solo(g);
  if (me < 0) return '';
  const key = `${g.log.length}:${g.players.map(p => p.name).join()}`;
  if (thoughtsCache && thoughtsCache.key === key) return thoughtsCache.html;
  const rows = Core.thoughts(g, me).sort((a, b) => b.series[b.series.length - 1] - a.series[a.series.length - 1]);
  const W0 = 120, H0 = 48, line = (s: number[]): string => {
    const x = (i: number): number => (s.length > 1 ? 4 + (i * (W0 - 8)) / (s.length - 1) : W0 / 2), y = (v: number): number => H0 - 4 - v * (H0 - 8);
    const pts = s.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="Desconfiança de ${pct(s[0])} a ${pct(s[s.length - 1])}"><line x1="4" x2="${W0 - 4}" y1="${y(s[0]).toFixed(1)}" y2="${y(s[0]).toFixed(1)}" class="spark-base"/><polyline points="${pts}" class="spark-line"/>${s.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === s.length - 1 ? 3 : 2}" class="spark-dot"><title>${i ? `Depois do ${i}º acontecimento` : 'No começo'}: ${pct(v)}</title></circle>`).join('')}</svg>`;
  };
  const html = rows.length ? `<section class="card" id="thoughts"><span class="label">O que as IAs pensavam de você</span><p class="hint">A chance que cada IA dava de você ser {f}, do começo ao fim, lei a lei. A linha tracejada é o começo.</p><ul class="thoughts">${rows.map(r => `<li><span>${name(g, r.seat)} <span class="role ${Core.partyOf(g.players[r.seat].role)}">${role(g.players[r.seat].role)}</span></span>${line(r.series)}<b><small>${pct(r.series[0])} →</small> ${pct(r.series[r.series.length - 1])}</b></li>`).join('')}</ul>${vCrux(g, me, 'end')}</section>` : '';
  thoughtsCache = { key, html };
  return html;
}
/** The notebook of the one person at a table with app players (D12), right in the list of players, next to the game:
 *  for every other seat, liberal or the hidden side, as the person marks it. What the person knows for sure comes
 *  marked and cannot be changed: their team (by rule 3) and what their own investigations showed. Only when there is
 *  one person at the table, so no one else sees it; at the end the roles are on the table anyway. */
function noteKit(g: Game): { me: number; cell: (i: number, edit: boolean) => string; party: (i: number) => Law | ''; sure: (i: number) => boolean } | null {
  const me = solo(g);
  if (me < 0 || g.phase === 'over' || g.phase === 'reveal') return null;
  const sure = new Map<number, [string, Law]>();
  for (const k of Core.knows(g, me)) sure.set(g.players.findIndex(p => p.name === k.name), [role(k.role), 'F']);
  for (const e of g.hist) if (e.k === 'inv' && e.by === me && !sure.has(e.target)) sure.set(e.target, [`${party(e.party)} (investigou)`, e.party]);
  const notes = S.notes || {};
  const cell = (i: number, edit: boolean): string => {
    if (i === me) return edit ? '' : '<span class="tag you">Você</span>';
    const known = sure.get(i), mark = notes[i] || (edit ? known?.[1] : undefined);
    if (known && !edit) return `<span class="tag sure-tag ${known[1]}">${known[0]} ✓</span>`;
    if (!edit) return mark ? `<span class="tag mark ${mark}">${mark === 'L' ? W.libs : W.short}</span>` : '';
    const btn = (v: '' | Law, label: string): string => `<button class="${(mark || '') === v ? 'on' : ''} ${v}" data-act="note" data-i="${i}" data-v="${v}" aria-pressed="${(mark || '') === v}">${label}</button>`;
    return `<span class="segm notes-segm" role="group" aria-label="Anotação sobre ${esc(g.players[i].name)}">${btn('', '?')}${btn('L', W.libs)}${btn('F', W.short)}</span>`;
  };
  return { me, cell, party: (i: number): Law | '' => notes[i] || sure.get(i)?.[1] || '', sure: (i: number): boolean => sure.has(i) };
}
/** What the last government (or investigation) told the table, kept in view under the table until the next one
 *  (D21): a claim no longer flashes by in a note. */
function vSaid(g: Game): string {
  if (g.phase === 'reveal') return '';
  const i = g.hist.map((e, j) => ((e.k === 'gov' || e.k === 'veto') && (e.pc !== undefined || e.cc !== undefined)) || (e.k === 'inv' && e.said !== undefined) ? j : -1).filter(j => j >= 0).pop();
  if (i === undefined) return '';
  return `<p class="said" id="said"><small>${g.hist[i].k === 'inv' ? 'Última investigação' : 'Último governo'}</small>${g.hist[i].k === 'inv' ? moment(g, i, solo(g)) : ledger(g, i)}</p>`;
}
/** What a government told the table, as a balance (D30): the president drew this and threw that away, the chancellor got
 *  this, threw that away and enacted the law. The throws are worked out from what each said; when the two stories do
 *  not add up, it says so. */
function ledger(g: Game, i: number): string {
  const e = g.hist[i] as Gov, me = solo(g), who = (j: number): string => (j === me ? 'você' : esc(g.players[j].name));
  // the laws as little cards (D30): what each said they held, the one thrown away faded and crossed out, the law enacted
  const card = (p: Law, out = false): string => `<i class="lc ${p}${out ? ' out' : ''}" title="${p === 'L' ? 'liberal' : W.f}${out ? ', descartada' : ''}"></i>`;
  const cards = (f: number, of: number, outF: number | null): string => {
    const xs: string[] = [];
    for (let k = 0; k < of - f; k++) xs.push(card('L', outF === 0 && k === 0));
    for (let k = 0; k < f; k++) xs.push(card('F', outF === 1 && k === 0));
    return xs.join('');
  };
  const law = e.k === 'veto' ? undefined : e.law;
  const pc = e.pc !== undefined && e.pc >= 0 ? e.pc : null, cc = e.cc !== undefined && e.cc >= 0 ? e.cc : null;
  const pThrow = pc !== null && cc !== null ? pc - cc : null, cThrow = cc !== null && law ? cc - (law === 'F' ? 1 : 0) : null;
  const ok = (t: number | null): number | null => (t === 0 || t === 1 ? t : null);
  const off = (pThrow !== null && ok(pThrow) === null) || (cThrow !== null && ok(cThrow) === null);
  const row = (role: string, j: number, body: string): string => `<span class="led-row"><span class="led-who"><small>${role}</small><b>${who(j)}</b></span><span class="led-cards">${body}</span></span>`;
  return `${row('Presidente', e.pres, pc === null ? '<i class="led-quiet">não disse</i>' : cards(pc, 3, ok(pThrow)))}${row('Chanceler', e.chanc, `${cc === null ? '<i class="led-quiet">não disse</i>' : cards(cc, 2, e.k === 'veto' ? null : ok(cThrow))}${e.k === 'veto' ? '<i class="led-quiet">pediu veto</i>' : law ? `<span class="led-arrow">→</span>${card(law)}<small class="led-law">${law === 'L' ? 'liberal' : W.f}</small>` : ''}`)}${off ? '<b class="clash">A conta não fecha: alguém mentiu.</b>' : ''}`;
}
/** The whole table at a glance, at the top (D18): every seat in order, who is president and chancellor, who is out, and,
 *  playing alone, what the person knows or marked of each (the colour) and, with the live suspicion on, how much each
 *  app player suspects them. */
function vSeats(g: Game): string {
  if (g.phase === 'reveal') return '';
  const kit = noteKit(g), me = solo(g), live = S.live && me >= 0 ? new Map(liveSuspicion(g, me).map(x => [x.seat, x.f])) : null;
  return `<ul class="seats" id="seats" aria-label="A mesa">${g.players.map((p, i) => {
    const mark = kit && i !== me ? kit.party(i) : '', f = live?.get(i);
    const tags = `${i === g.pres ? '<i>Pres.</i>' : ''}${i === g.chanc ? '<i>Chanc.</i>' : ''}${i === me ? '<i class="you">você</i>' : ''}${f !== undefined ? `<i class="sus">${pct(f)}</i>` : ''}`;
    return `<li class="seat${mark ? ` ${mark}` : ''}${kit?.sure(i) ? ' sure' : ''}${p.alive ? '' : ' dead'}">${esc(p.name)}${tags}</li>`;
  }).join('')}</ul>`;
}
/** Room kept at the end of the game screen: the bar at the bottom and the notes that pop up sit there, over nothing. */
const GAP = '<div class="dock-gap" aria-hidden="true"></div>';
/** The bar at the bottom with what opens beside the game (D17): the notebook. It
 *  has its own room at the end of the page, so it never covers what the game shows. */
function vDock(g: Game): string {
  const kit = noteKit(g), n = Object.keys(S.notes || {}).length, notes = !!S.notesOpen;
  const btns = [
    kit ? `<button class="dock-btn notes${notes ? ' open' : ''}" data-act="notesopen" id="notestoggle" aria-expanded="${notes}" aria-controls="drawer"><span aria-hidden="true">${notes ? '✕' : '✎'}</span> Anotações${n ? ` · ${n}` : ''}</button>` : '',
  ].filter(Boolean);
  if (!btns.length) return GAP;
  return `${vDrawer(g)}<nav class="dock" aria-label="Painéis">${btns.join('')}</nav>${GAP}`;
}
/** The personalities of the app players (D26), as the table knows them: a name and a line. */
export const PERSONA_W: Record<Persona, [string, string]> = {
  certinho: ['Certinho', 'joga limpo; como do lado escondido, mente pouco'],
  desconfiado: ['Desconfiado', 'acredita em pouca gente e acusa fácil'],
  cetico: ['Cético', 'quase não liga para o que se fala'],
  critico: ['Crítico', 'só leva a sério a acusação que a ata confirma'],
  centrado: ['Centrado', 'no meio-termo em tudo'],
  blefador: ['Blefador', 'do lado escondido, mente muito'],
  caotico: ['Caótico', 'imprevisível: às vezes fala e vota sem conta']
};
/** The notebook as a side panel (D14): the bar at the bottom opens it over the game, and closes it again; on a wide
 *  screen it stays open beside the game. */
function vDrawer(g: Game): string {
  const kit = noteKit(g);
  if (!kit) return '';
  const open = !!S.notesOpen, me = kit.me;
  // a claim to the table (D30): what the notebook says of someone, true or a bluff; the app players weigh it like any talk
  const claimed = (i: number): Law | '' => kit.party(i);
  // one column per side (D30): ✏️ marks what you think (only you see it), 📣 tells the table, true or a bluff
  const side = (i: number, p: Law): string => {
    const m = claimed(i), on = m === p, can = Core.canDenounce(g, me, i), dead = !g.players[i].alive;
    const pen = `<button class="pen${on ? ' on' : ''}" data-act="note" data-i="${i}" data-v="${on ? '' : p}" aria-pressed="${on}" title="${on ? 'Desmarcar' : `Anotar como ${p === 'L' ? 'liberal' : W.f}`}">✏️</button>`;
    const say = dead ? '' : can ? `<button class="tell ${p}${m && m !== p ? ' bluff' : ''}" data-act="denounce" data-i="${i}" data-v="${p === 'L' ? 'trust' : 'acc'}" title="${m && m !== p ? 'Blefe: ' : ''}dizer à mesa que é ${p === 'L' ? 'liberal' : W.f}">📣</button>` : '<span class="told" title="Já falou dele nesta rodada">✓</span>';
    return `<span class="side ${p}${on ? ' on' : ''}"><b>${p === 'L' ? W.libs : W.short}</b><span>${pen}${say}</span></span>`;
  };
  const rows = g.players.map((p, i) => (i === me ? '' : `<li class="${claimed(i)}${p.alive ? '' : ' dead'}"><span class="who">${esc(p.name)}${p.alive ? '' : ' <small>(eliminado)</small>'}${kit.sure(i) ? ' <small>(sabe)</small>' : ''}</span><span class="sides">${side(i, 'L')}${side(i, 'F')}</span></li>`)).join('');
  const last = [...g.hist].reverse().find((e): e is Extract<Game['hist'][number], { k: 'talk' }> => e.k === 'talk' && e.by === me);
  const at = last ? g.hist.lastIndexOf(last) : -1, icon = ['yes', 'meh', 'no'];
  const heard = last ? `<div class="heard" id="heard"><small>Você disse: "${esc(g.players[last.about].name)} é ${last.say === 'trust' ? 'liberal' : W.f}"</small><ul>${(last.re || []).map(([i, a]) => `<li class="${icon[a]}"><b>${esc(g.players[i].name)}</b>: "${esc(Core.reply(g, i, a, at))}"</li>`).join('')}${g.players[last.about].ai ? `<li class="${last.say === 'acc' ? 'no' : 'yes'}"><b>${esc(g.players[last.about].name)}</b>: "${esc(Core.answer(g, last.about, last.say === 'acc', at))}"</li>` : ''}</ul></div>` : '';
  return `<aside class="drawer${open ? ' open' : ''}" id="drawer" aria-label="Suas anotações"><span class="label">Suas anotações</span><p class="hint">Marque o que você acha (só você vê). 📣 diz à mesa o que quiser, até blefe.</p><ul class="names noted" id="notes">${rows}</ul>
    ${heard}</aside>`;
}
/** A reason, with the names of the seats in it. */
const whyText = (g: Game, line: string): string => line.replace(/\{p(\d+)\}/g, (_, i: string) => (g.players[+i] ? `<b>${name(g, +i)}</b>` : '?'));

/** The minutes, with assistance on (D11): every law, the government that made it and who voted Ja! for that
 *  government, and the count for each player. Only what the whole table saw: never a hand, a party or a role. */
function vAta(g: Game): string {
  if (!S.assist) return '';
  const rows: string[] = [], tally = g.players.map(() => ({ L: 0, F: 0 }));
  let n = 0;
  g.hist.forEach((e, i) => {
    if (e.k !== 'gov' && e.k !== 'veto' && e.k !== 'chaos') return;
    const v = e.k === 'chaos' ? undefined : [...g.hist.slice(0, i)].reverse().find((x): x is Extract<Event, { k: 'vote' }> => x.k === 'vote' && x.pres === e.pres && x.chanc === e.chanc);
    const ja = v ? v.ja.map(j => name(g, j)).join(', ') : '';
    if (e.k === 'chaos') { n++; rows.push(`<li class="gov ${e.law}"><b>${n}ª</b> <span class="role ${e.law}">${e.law === 'L' ? 'liberal' : W.f}</span> pelo caos, sem governo</li>`); return; }
    if (e.k === 'gov') { n++; if (e.law) { for (const j of v ? v.ja : [e.pres, e.chanc]) tally[j][e.law]++; } }
    const head = e.k === 'gov' ? `<b>${n}ª</b> <span class="role ${e.law}">${e.law === 'L' ? 'liberal' : W.f}</span>` : '<b>Veto</b>';
    rows.push(`<li class="${e.k === 'gov' ? `gov ${e.law}` : 'rej'}">${head} ${name(g, e.pres)} (pres.) + ${name(g, e.chanc)} (chanc.)<small class="hands">${v ? `{ja}: ${ja}` : 'votos em voz alta, sem registro'}</small></li>`);
  });
  const who = g.players.map((p, i) => ({ i, t: tally[i] })).filter(x => x.t.L + x.t.F).sort((a, b) => b.t.F - a.t.F || a.t.L - b.t.L);
  return `<section class="card" id="ata"><span class="label">Ata · assistência</span>${rows.length ? `<ol class="timeline ata-list">${rows.join('')}</ol>` : '<p class="hint">Nenhuma lei ainda.</p>'}
    ${who.length ? `<p class="hint">Aprovou (governou ou votou {ja}), por jogador:</p><ul class="tally">${who.map(x => `<li><span>${name(g, x.i)}</span><span><i class="mini F">F</i> ${x.t.F} <i class="mini L">L</i> ${x.t.L}</span></li>`).join('')}</ul>` : ''}
    <button class="btn ghost block" data-act="assist" data-v="off">Esconder a ata</button></section>`;
}
function vLog(g: Game): string {
  return `<details class="card" id="log"${g.phase === 'over' || Core.hasAi(g) ? ' open' : ''}><summary class="label">O que aconteceu (${g.log.length})</summary>${S.assist ? '' : '<button class="btn ghost block" data-act="assist" data-v="on" id="showata">Mostrar ata com quem aprovou cada lei</button>'}<ol class="log">${[...g.log].reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ol></details>`;
}

/** How far the game has gone, counting what changes a phase and not what is said beside it (a claim, a talk): the
 *  screen of a phase stays put, and a secret stays open, while the app players speak (D21). */
export const beat = (g: Game): number => g.hist.filter(e => e.k !== 'talk').length;
/** The key of the secret a phase shows, and who may see it; null for a phase with nothing secret. The game moves on
 *  every round, so the same phase in another round has another key and starts closed. */
export function gateKey(g: Game): { key: string; who: number } | null {
  const k = beat(g);
  if (g.phase === 'reveal') return { key: `reveal:${g.reveal}`, who: g.reveal };
  if (g.phase === 'president' || g.phase === 'investigated' || g.phase === 'peek') return { key: `${g.phase}:${k}`, who: g.pres };
  if (g.phase === 'chancellor') return { key: `chancellor:${k}`, who: g.chanc as number };
  return null;
}
function gated(g: Game, title: string, inner: () => string): string {
  const gk = gateKey(g) as { key: string; who: number };
  if (ui.open === gk.key) {
    const flip = seenOpen !== gk.key; seenOpen = gk.key; flipping = flip;
    return `<section class="card secret${flip ? ' flip' : ''}" id="phase"><span class="label">${title} · só ${name(g, gk.who)} olha</span>${inner()}</section>`;
  }
  seenOpen = '';
  const alone = Core.hasAi(g) && Core.humansAlive(g).length === 1;
  return `<section class="card" id="phase"><span class="label">${title}</span><div class="handoff"><span class="phone" aria-hidden="true"></span><p class="big">${alone ? 'Só para os seus olhos,' : 'Passe o celular para'}</p><b class="who">${name(g, gk.who)}</b><p class="hint">Ninguém mais olha a tela.</p></div><button class="btn block" data-act="open" data-k="${esc(gk.key)}">Sou ${name(g, gk.who)}, mostrar</button></section>`;
}
/** A secret card, face down first: when it has just been opened it turns over like a card on the table. */
const turn = (front: string): string => `<div class="turn${flipping ? ' go' : ''}"><div class="back" aria-hidden="true"><span>?</span></div>${front}</div>`;

const pickList = (g: Game, ok: (i: number) => boolean, act: string): string =>
  `<div class="pick">${g.players.map((p, i) => ok(i) ? `<button class="btn ghost${ui.pick === i ? ' on' : ''}" data-act="${act}" data-i="${i}" aria-pressed="${ui.pick === i}">${esc(p.name)}</button>` : '').join('')}</div>`;

function vPhase(g: Game): string {
  const pres = name(g, g.pres);
  switch (g.phase) {
    case 'reveal':
      return gated(g, `Papéis (${g.reveal + 1} de ${g.players.length})`, () => {
        const me = g.players[g.reveal], mates = Core.knows(g, g.reveal);
        const names = (r: Role): string => mates.filter(m => m.role === r).map(m => `<b>${esc(m.name)}</b>`).join(', ');
        const row = (cls: string, label: string, who: string): string => who ? `<div class="ally ${cls}"><small>${label}</small><span>${who}</span></div>` : '';
        const info = me.role === 'fascista' ? `<div class="allies" id="allies">${row('H', '{boss}', names('hitler'))}${row('F', 'Outros {fs}', names('fascista'))}</div>`
          : me.role === 'hitler' ? (mates.length ? `<div class="allies" id="allies">${row('F', 'Seu {f}', names('fascista'))}</div><p class="hint">Ele sabe quem você é.</p>` : '<p>Você não sabe quem são os {fs}. Eles sabem quem você é.</p>') : '<p>Você não sabe quem é quem. Ache o {boss}.</p>';
        const trained = g.train && !me.ai ? `<p class="hint" id="trained">Treino: você escolheu ser ${role(g.train).toLowerCase()}.</p>` : '';
        return `${turn(`<div class="role-card ${Core.partyOf(me.role)}${me.role === 'hitler' ? ' H' : ''}" id="role">${portrait(me.role, P, R)}<small>Você é</small><b>${role(me.role)}</b></div>`)}${info}${trained}<button class="btn block" data-act="hiderole">Entendi, esconder</button>`;
      });
    case 'nominate':
      return `<section class="card" id="phase"><span class="label">Nova rodada</span><p class="big"><b>${pres}</b> é o presidente. Escolha o chanceler:</p>${pickList(g, i => Core.canNominate(g, i), 'nominate')}${g.lastChanc !== null ? '<p class="hint">O último governo eleito não pode voltar como chanceler.</p>' : ''}</section>`;
    case 'vote':
      if (Core.hasAi(g)) return vVoteAi(g);
      return `<section class="card" id="phase"><span class="label">Votação</span><p class="big"><b>${pres}</b> presidente + <b>${name(g, g.chanc as number)}</b> chanceler?</p><p class="hint">Todo mundo vota junto, em voz alta: {ja} ou {nein} Mais {ja} que {nein} elege; empate rejeita.</p><div class="pick"><button class="btn vote L" data-act="elect" data-v="1">Eleito</button><button class="btn vote F" data-act="elect" data-v="0">Rejeitado</button></div>${g.tracker ? `<p class="hint">Já ${g.tracker === 1 ? 'foi 1 governo rejeitado' : `foram ${g.tracker} governos rejeitados`} seguido${g.tracker === 1 ? '' : 's'}. No ${Core.TRACKER_MAX}º, a lei do topo entra sozinha.</p>` : ''}</section>`;
    case 'president':
      return gated(g, 'Presidente', () => `<p>Toque na lei que vai pro lixo. As outras duas vão pro chanceler.</p><div class="hand">${g.hand.map((l, k) => law(l, k)).join('')}</div><button class="btn block" data-act="pdiscard"${ui.pick === null ? ' disabled' : ''}>Descartar e passar</button>`);
    case 'chancellor':
      return gated(g, 'Chanceler', () => `<p>Toque na lei que vai pro lixo. A outra vira lei.</p><div class="hand">${g.hand.map((l, k) => law(l, k)).join('')}</div><button class="btn block" data-act="cdiscard"${ui.pick === null ? ' disabled' : ''}>Descartar e aprovar a outra</button>${Core.canVeto(g) ? '<button class="btn ghost block" data-act="askveto">Pedir veto das duas</button>' : g.vetoed ? '<p class="hint">O presidente recusou o veto: uma das duas tem que virar lei.</p>' : ''}`);
    case 'veto':
      return `<section class="card" id="phase"><span class="label">Veto</span><p class="big"><b>${name(g, g.chanc as number)}</b> (chanceler) quer vetar as duas leis. <b>${pres}</b>, aceita?</p><p class="hint">Se aceitar, nenhuma lei entra e conta como governo rejeitado.</p><div class="pick"><button class="btn" data-act="veto" data-v="1">Aceitar veto</button><button class="btn ghost" data-act="veto" data-v="0">Recusar</button></div></section>`;
    case 'investigate':
      return `<section class="card" id="phase"><span class="label">Poder: investigar</span><p class="big"><b>${pres}</b>, de quem você quer saber o partido?</p>${pickList(g, i => Core.canTarget(g, i), 'investigate')}</section>`;
    case 'special':
      return `<section class="card" id="phase"><span class="label">Poder: eleição especial</span><p class="big"><b>${pres}</b>, quem é o próximo presidente?</p><p class="hint">Depois dessa rodada a ordem volta a partir de ${pres}.</p>${pickList(g, i => Core.canTarget(g, i), 'special')}</section>`;
    case 'investigated':
      return gated(g, 'Investigação', () => {
        const p = Core.investigated(g) as Law;
        return `${turn(`<div class="role-card ${p}" id="party">${portrait(p === 'L' ? 'liberal' : 'fascista', P, R)}<small>${name(g, g.target as number)} é</small><b>${party(p)}</b><span class="lens" aria-hidden="true"></span></div>`)}<p class="hint">Contar a verdade ou não é com você.</p><button class="btn block" data-act="endpower">Esconder e seguir</button>`;
      });
    case 'peek':
      return gated(g, 'Poder: espiar', () => `<p>As próximas 3 leis, na ordem:</p><div class="hand" id="peek">${g.deck.slice(0, 3).map(l => law(l)).join('')}</div><button class="btn block" data-act="endpower">Esconder e seguir</button>`);
    case 'execute':
      return `<section class="card" id="phase"><span class="label">Poder: eliminar</span><p class="big"><b>${pres}</b>, quem sai do jogo?</p>${pickList(g, i => Core.canTarget(g, i), 'pickp')}<button class="btn block danger" data-act="execute"${ui.pick === null ? ' disabled' : ''}>${ui.pick === null ? 'Escolha alguém' : `Eliminar ${name(g, ui.pick)}`}</button></section>`;
    default:
      return `<section class="card win ${g.winner}" id="phase"><span class="label">Fim de jogo</span><div class="cheer">${portrait(g.winner === 'L' ? 'liberal' : 'hitler', P, R)}</div><p class="big"><b>${g.winner === 'L' ? 'Os liberais venceram!' : 'Os {fs} venceram!'}</b></p><p>${esc(g.why)}</p>
        <button class="btn block" data-act="again">Jogar de novo com a mesma mesa</button><button class="btn ghost block" data-act="table">Mudar a mesa</button></section>`;
  }
}

/** The vote at a table with app players: each person taps their own vote; the app players vote when the last one is in. */
function vVoteAi(g: Game): string {
  const people = Core.humansAlive(g), one = people.length === 1;
  const row = (i: number): string => `<div class="voter"${one ? '' : ` id="voter-${i}"`}>${one ? '' : `<b>${name(g, i)}</b>`}<div class="pick"><button class="btn vote L${ui.votes[i] === true ? ' on' : ''}" data-act="myvote" data-i="${i}" data-v="1" aria-pressed="${ui.votes[i] === true}"><span class="vw">${ui.votes[i] === true ? '✓ ' : ''}{ja}</span></button><button class="btn vote F${ui.votes[i] === false ? ' on' : ''}" data-act="myvote" data-i="${i}" data-v="0" aria-pressed="${ui.votes[i] === false}">${ui.votes[i] === false ? '✓ ' : ''}{nein}</button></div></div>`;
  return `<section class="card" id="phase"><span class="label">Votação</span><p class="big"><b>${name(g, g.pres)}</b> presidente + <b>${name(g, g.chanc as number)}</b> chanceler?</p><p class="hint">${one ? 'Seu voto' : 'Cada pessoa toca no próprio voto'}; as IAs votam junto. Mais {ja} que {nein} elege; empate rejeita.</p>${people.map(row).join('')}${one ? '' : `<button class="btn block" data-act="countvotes"${people.every(i => typeof ui.votes[i] === 'boolean') ? '' : ' disabled'}>Abrir os votos</button>`}${g.tracker ? `<p class="hint">Já ${g.tracker === 1 ? 'foi 1 governo rejeitado' : `foram ${g.tracker} governos rejeitados`} seguido${g.tracker === 1 ? '' : 's'}. No ${Core.TRACKER_MAX}º, a lei do topo entra sozinha.</p>` : ''}</section>`;
}

/* ---------- settings ---------- */
/** The finished games kept on this device (D23), and the button that exports them. */
function vHistory(): string {
  const n = kept();
  return `<section class="card" id="history"><span class="label">Suas partidas</span><p class="hint" id="historytext">${n ? `${n} ${n === 1 ? 'partida terminada guardada' : 'partidas terminadas guardadas'} neste aparelho (as últimas ${Core.HISTORY_MAX}).` : 'Nenhuma partida terminada ainda.'} Só ficam aqui: nada sai do aparelho sozinho. Exporte o arquivo e mande para ajustar a IA ao jeito que as pessoas jogam de verdade.</p>
    ${n ? `<button class="btn block" data-act="exportgames" id="exportgames">Exportar partidas</button><button class="more" data-act="wipe" id="wipe">${ui.confirmWipe ? 'Toque de novo para apagar todas' : 'Apagar as partidas guardadas'}</button>` : ''}</section>`;
}
function vSettings(): string {
  const t = S.theme || 'auto', opt = (v: string, label: string): string => `<button class="${t === v ? 'on' : ''}" data-act="theme" data-t="${v}" aria-pressed="${t === v}">${label}</button>`;
  const l = S.look || 'poster', sty = (v: string, label: string): string => `<button class="${l === v ? 'on' : ''}" data-act="look" data-l="${v}" aria-pressed="${l === v}">${label}</button>`;
  const built = builtFrom();
  return `<section class="card" id="look"><span class="label">Aparência</span><p class="hint">Estilo</p><div class="segm" role="group" aria-label="Estilo">${sty('poster', 'Pôster')}${sty('deco', 'Art déco')}</div><p class="hint">Tema</p><div class="segm" role="group" aria-label="Tema">${opt('auto', 'Automático')}${opt('light', 'Claro')}${opt('dark', 'Escuro')}</div><p class="hint">Som e vibração</p><div class="segm" role="group" aria-label="Som e vibração"><button class="${S.quiet ? '' : 'on'}" data-act="fx" data-v="on" aria-pressed="${!S.quiet}">Ligados</button><button class="${S.quiet ? 'on' : ''}" data-act="fx" data-v="off" aria-pressed="${!!S.quiet}">Desligados</button></div>
    <p class="hint">Esconder o segredo ao virar o celular para baixo</p><div class="segm" role="group" aria-label="Esconder ao virar o celular"><button class="${S.flip ? '' : 'on'}" data-act="flip" data-v="off" aria-pressed="${!S.flip}">Desligado</button><button class="${S.flip ? 'on' : ''}" data-act="flip" data-v="on" aria-pressed="${!!S.flip}">Ligado</button></div>
    <p class="hint" id="fliptext">${S.flip ? 'Um segredo aberto se fecha quando o celular fica de tela para baixo. Deitado, o sensor pode achar que o celular foi virado.' : 'Um segredo aberto se fecha quando o app sai da tela. Ligado, também se fecha com o celular de tela para baixo.'}</p></section>
    <section class="card" id="about"><span class="label">Versão do app</span><p class="hint" id="version">${built ? `Versão ${esc(built.slice(0, 7))}.` : 'Versão de desenvolvimento.'} ${canUpdate() ? 'O app fica guardado neste aparelho: abre na hora e também sem internet.' : 'Neste endereço o app não fica guardado no aparelho.'}</p>${canUpdate() ? '<button class="btn ghost block" data-act="checkupdate">Procurar versão nova</button>' : ''}</section>`;
}
/** The vote result, stamped over the screen for a moment. */
let stampTimer: ReturnType<typeof setTimeout> | undefined;
export function stamp(text: string, party: Party): void {
  const s = part('stamp');
  s.textContent = text; s.className = `stamp ${party}`; s.hidden = false;
  void s.offsetWidth; s.classList.add('go');            // restart the animation even when it is the same stamp again
  clearTimeout(stampTimer); stampTimer = setTimeout(() => { s.hidden = true; }, 1100);
}
/** The screen goes dark for a moment: someone was eliminated. */
export function flash(): void {
  const f = part('flash');
  f.hidden = false; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  setTimeout(() => { f.hidden = true; }, 900);
}
/** A law has just been enacted: who made it, over the screen for a moment (D11). The text comes from the code and the
 *  names go through esc(). */
let decreeTimer: ReturnType<typeof setTimeout> | undefined;
export function decree(g: Game, e: Gov | Extract<Event, { k: 'chaos' }>): void {
  const d = part('decree'), law = (e.law || 'F') as Law;
  const who = e.k !== 'gov' && e.k !== 'veto' ? `<span class="who">O caos</span><span>aprovou</span>` : `<span class="who">${name(g, e.pres)} e ${name(g, e.chanc)}</span><span>aprovaram</span>`;
  d.innerHTML = `<div class="decree-card ${law}">${seal(law, P)}${who}<b>lei ${law === 'L' ? 'liberal' : W.f}</b></div>`;
  d.hidden = false; d.classList.remove('go'); void d.offsetWidth; d.classList.add('go');
  clearTimeout(decreeTimer); decreeTimer = setTimeout(() => { d.hidden = true; }, 2200);
}
/** Confetti in the colour of the side that won. */
export function confetti(winner: Party): void {
  const c = part('confetti');
  c.innerHTML = Array.from({ length: 48 }, (_, i) => `<i class="${winner}" style="left:${(i * 37) % 100}%;animation-delay:${(i % 12) * 0.08}s;animation-duration:${1.6 + (i % 5) * 0.25}s;--r:${(i * 53) % 360}deg"></i>`).join('');
  setTimeout(() => { c.innerHTML = ''; }, 4200);
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A short message at the bottom of the screen. */
export function toast(text: string): void {
  const t = part('toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}
/** Lets go of the field with the focus, so the screen can be painted again. */
export function blurField(): void { const a = document.activeElement as HTMLElement | null; if (a && a.blur && $('#view')?.contains(a)) a.blur(); }

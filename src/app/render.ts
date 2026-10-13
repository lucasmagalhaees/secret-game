import { Core } from '../core';
import type { Game, Law, Role } from '../core';
import { $, esc, part } from './format';
import { S, ui } from './state';
import { builtFrom, canUpdate } from './update';

/* ================= the screen =================
   Rendering is innerHTML from the state. Every text that did not come from the code goes through esc(). A field with
   the focus is left alone, so what the person is typing is never thrown away.
   Secrets (a role, the laws in a hand, a party, the next laws) are only drawn behind a gate: first the screen asks for
   the phone to go to one person, and only their tap opens it. The gate is closed again whenever the game moves on. */
export function render(): void {
  const view = part('view'), active = document.activeElement;
  if (active && view.contains(active) && active.matches('input, textarea')) return;
  const g = S.game;
  part('score').innerHTML = g ? `<span class="chip L">${g.laws.L}/${Core.WIN}</span><span class="chip F">${g.laws.F}/${Core.WIN}</span>` : '';
  view.innerHTML = g ? vGame(g) : vTable() + vRules() + vSettings();
}

const ROLE: Record<Role, string> = { liberal: 'Liberal', fascista: 'Fascista', hitler: 'Hitler' };
const PARTY: Record<Law, string> = { L: 'Liberal', F: 'Fascista' };
const POWER_LABEL: Record<string, string> = { investigate: 'partido', peek: 'espiar', execute: 'eliminar' };
const name = (g: Game, i: number): string => esc(g.players[i].name);
const law = (l: Law, k?: number): string => {
  const face = `<span class="sym">${l === 'L' ? '⚖' : '☠'}</span><span>${l === 'L' ? 'Liberal' : 'Fascista'}</span>`;
  return k === undefined ? `<div class="law ${l}">${face}</div>`
    : `<button class="law ${l}${ui.pick === k ? ' on' : ''}" data-act="pick" data-k="${k}" aria-pressed="${ui.pick === k}">${face}</button>`;
};

/* ---------- before the game: the table ---------- */
function vTable(): string {
  const names = S.names, n = names.length;
  let h = `<section class="card" id="table"><span class="label">Mesa (${Core.MIN_PLAYERS} a ${Core.MAX_PLAYERS} jogadores)</span>`;
  h += n ? `<ul class="names" id="names">${names.map((x, i) => `<li><span>${i + 1}. <b>${esc(x)}</b></span><button class="x" data-act="rmname" data-i="${i}" aria-label="Tirar ${esc(x)}">×</button></li>`).join('')}</ul>`
    : '<p class="empty" id="empty">Ninguém na mesa ainda. Coloque os nomes na ordem em que vocês estão sentados.</p>';
  h += `<div class="row"><div class="field"><input id="name" maxlength="${Core.NAME_MAX}" autocomplete="off" placeholder="nome do jogador" value="${esc(ui.name)}" aria-label="Nome do jogador"></div><button class="btn" data-act="addname">Pôr</button></div>`;
  h += ui.msg ? `<p class="msg" id="msg">${esc(ui.msg)}</p>` : '';
  h += `<button class="btn block" data-act="start"${n < Core.MIN_PLAYERS ? ' disabled' : ''}>Começar com ${n} ${n === 1 ? 'jogador' : 'jogadores'}</button></section>`;
  return h;
}
function vRules(): string {
  return `<section class="card" id="rules"><span class="label">Como joga</span><ul class="rules">
    <li>Baralho de ${Core.DECK_F + Core.DECK_L} leis: ${Core.DECK_F} fascistas e ${Core.DECK_L} liberais. Quem aprovar ${Core.WIN} leis do seu lado vence.</li>
    <li>Os fascistas se conhecem e sabem quem é o Hitler. O Hitler não sabe quem são eles. Os liberais não conhecem ninguém.</li>
    <li>A cada rodada o presidente indica o chanceler e a mesa vota. Eleito, o presidente tira 3 leis e descarta 1; o chanceler recebe 2, descarta 1 e a outra vira lei.</li>
    <li>O último presidente e o último chanceler eleitos não podem ser chanceler na rodada seguinte (com ${Core.SMALL_TABLE} vivos ou menos, só o último chanceler).</li>
    <li>${Core.TRACKER_MAX} governos rejeitados seguidos: a lei do topo entra sozinha, sem poder, e o limite de mandato zera.</li>
    <li>Na 2ª lei fascista o presidente descobre o partido de alguém; na 3ª, olha as próximas 3 leis; na 4ª e na 5ª, elimina alguém. Ninguém é investigado duas vezes.</li>
    <li>A partir da ${Core.VETO_FROM}ª lei fascista o chanceler pode pedir veto das duas leis; se o presidente aceitar, conta como governo rejeitado.</li>
    <li>Com ${Core.HITLER_ZONE} ou mais leis fascistas, eleger o Hitler chanceler dá a vitória aos fascistas. Eliminar o Hitler dá a vitória aos liberais.</li>
  </ul><p class="hint" id="credit">Baseado em <a href="https://www.secrethitler.com">Secret Hitler</a>, de Goat, Wolf, &amp; Cabbage, sob a licença <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br">CC BY-NC-SA 4.0</a>. Uso não comercial.</p></section>`;
}

/* ---------- the game ---------- */
function vGame(g: Game): string {
  return vPhase(g) + vBoard(g) + vPlayers(g) + vLog(g) + (g.phase === 'over' ? '' : `<section class="card"><button class="btn ghost block" data-act="end">${ui.confirmEnd ? 'Toque de novo para encerrar o jogo' : 'Encerrar jogo'}</button></section>`);
}
function vBoard(g: Game): string {
  const slots = (p: Law): string => Array.from({ length: Core.WIN }, (_, i) => {
    const filled = g.laws[p] > i, tag = i + 1 === Core.WIN ? 'vitória' : p === 'F' ? POWER_LABEL[Core.POWERS[i + 1]] || '' : '';
    return `<div class="slot ${p}${filled ? ' on' : ''}">${filled ? (p === 'L' ? '⚖' : '☠') : ''}<small>${tag}</small></div>`;
  }).join('');
  const dots = Array.from({ length: Core.TRACKER_MAX }, (_, i) => `<i class="${g.tracker > i ? 'on' : ''}"></i>`).join('');
  return `<section class="card" id="board"><span class="label">Leis liberais</span><div class="track">${slots('L')}</div>
    <span class="label">Leis fascistas</span><div class="track">${slots('F')}</div>
    <div class="meta"><span>Rejeições seguidas <span class="dots" id="tracker">${dots}</span></span><span>Baralho: ${g.deck.length} · Lixo: ${g.discard.length}</span></div></section>`;
}
function vPlayers(g: Game): string {
  return `<section class="card" id="players"><span class="label">Jogadores</span><ul class="names">${g.players.map((p, i) => {
    const tag = g.phase === 'over' ? `<span class="role ${Core.partyOf(p.role)}">${ROLE[p.role]}</span>` : i === g.pres ? '<span class="tag">Presidente</span>' : i === g.chanc ? '<span class="tag">Chanceler</span>' : '';
    return `<li class="${p.alive ? '' : 'dead'}"><span>${esc(p.name)}${p.alive ? '' : ' <small>(eliminado)</small>'}</span>${tag}</li>`;
  }).join('')}</ul></section>`;
}
function vLog(g: Game): string {
  return `<section class="card" id="log"><span class="label">O que aconteceu</span><ol class="log">${[...g.log].reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ol></section>`;
}

/** The key of the secret a phase shows, and who may see it; null for a phase with nothing secret. The log grows every
 *  round, so the same phase in another round has another key and starts closed. */
export function gateKey(g: Game): { key: string; who: number } | null {
  const k = g.log.length;
  if (g.phase === 'reveal') return { key: `reveal:${g.reveal}`, who: g.reveal };
  if (g.phase === 'president' || g.phase === 'investigated' || g.phase === 'peek') return { key: `${g.phase}:${k}`, who: g.pres };
  if (g.phase === 'chancellor') return { key: `chancellor:${k}`, who: g.chanc as number };
  return null;
}
function gated(g: Game, title: string, inner: () => string): string {
  const gk = gateKey(g) as { key: string; who: number };
  if (ui.open === gk.key) return `<section class="card secret" id="phase"><span class="label">${title} · só ${name(g, gk.who)} olha</span>${inner()}</section>`;
  return `<section class="card" id="phase"><span class="label">${title}</span><p class="big">Passe o celular para <b>${name(g, gk.who)}</b>.</p><p class="hint">Ninguém mais olha a tela.</p><button class="btn block" data-act="open" data-k="${esc(gk.key)}">Sou ${name(g, gk.who)}, mostrar</button></section>`;
}
const pickList = (g: Game, ok: (i: number) => boolean, act: string): string =>
  `<div class="pick">${g.players.map((p, i) => ok(i) ? `<button class="btn ghost${ui.pick === i ? ' on' : ''}" data-act="${act}" data-i="${i}" aria-pressed="${ui.pick === i}">${esc(p.name)}</button>` : '').join('')}</div>`;

function vPhase(g: Game): string {
  const pres = name(g, g.pres);
  switch (g.phase) {
    case 'reveal':
      return gated(g, `Papéis (${g.reveal + 1} de ${g.players.length})`, () => {
        const me = g.players[g.reveal], mates = Core.knows(g, g.reveal);
        const info = me.role === 'fascista' ? `<p>Seus aliados: ${mates.map(m => `<b>${esc(m.name)}</b>${m.role === 'hitler' ? ' (Hitler)' : ''}`).join(', ')}.</p>`
          : me.role === 'hitler' ? '<p>Você não sabe quem são os fascistas. Eles sabem quem você é.</p>' : '<p>Você não sabe quem é quem. Ache o Hitler.</p>';
        return `<div class="role-card ${Core.partyOf(me.role)}" id="role"><small>Você é</small><b>${ROLE[me.role]}</b></div>${info}<button class="btn block" data-act="hiderole">Entendi, esconder</button>`;
      });
    case 'nominate':
      return `<section class="card" id="phase"><span class="label">Nova rodada</span><p class="big"><b>${pres}</b> é o presidente. Escolha o chanceler:</p>${pickList(g, i => Core.canNominate(g, i), 'nominate')}${g.lastChanc !== null ? '<p class="hint">O último governo eleito não pode voltar como chanceler.</p>' : ''}</section>`;
    case 'vote':
      return `<section class="card" id="phase"><span class="label">Votação</span><p class="big"><b>${pres}</b> presidente + <b>${name(g, g.chanc as number)}</b> chanceler?</p><p class="hint">Todo mundo vota junto, em voz alta: Ja! ou Nein! Mais Ja! que Nein! elege; empate rejeita.</p><div class="pick"><button class="btn elect" data-act="elect" data-v="1">Eleito</button><button class="btn ghost" data-act="elect" data-v="0">Rejeitado</button></div>${g.tracker ? `<p class="hint">Já ${g.tracker === 1 ? 'foi 1 governo rejeitado' : `foram ${g.tracker} governos rejeitados`} seguido${g.tracker === 1 ? '' : 's'}. No ${Core.TRACKER_MAX}º, a lei do topo entra sozinha.</p>` : ''}</section>`;
    case 'president':
      return gated(g, 'Presidente', () => `<p>Toque na lei que vai pro lixo. As outras duas vão pro chanceler.</p><div class="hand">${g.hand.map((l, k) => law(l, k)).join('')}</div><button class="btn block" data-act="pdiscard"${ui.pick === null ? ' disabled' : ''}>Descartar e passar</button>`);
    case 'chancellor':
      return gated(g, 'Chanceler', () => `<p>Toque na lei que vai pro lixo. A outra vira lei.</p><div class="hand">${g.hand.map((l, k) => law(l, k)).join('')}</div><button class="btn block" data-act="cdiscard"${ui.pick === null ? ' disabled' : ''}>Descartar e aprovar a outra</button>${Core.canVeto(g) ? '<button class="btn ghost block" data-act="askveto">Pedir veto das duas</button>' : g.vetoed ? '<p class="hint">O presidente recusou o veto: uma das duas tem que virar lei.</p>' : ''}`);
    case 'veto':
      return `<section class="card" id="phase"><span class="label">Veto</span><p class="big"><b>${name(g, g.chanc as number)}</b> (chanceler) quer vetar as duas leis. <b>${pres}</b>, aceita?</p><p class="hint">Se aceitar, nenhuma lei entra e conta como governo rejeitado.</p><div class="pick"><button class="btn" data-act="veto" data-v="1">Aceitar veto</button><button class="btn ghost" data-act="veto" data-v="0">Recusar</button></div></section>`;
    case 'investigate':
      return `<section class="card" id="phase"><span class="label">Poder: investigar</span><p class="big"><b>${pres}</b>, de quem você quer saber o partido?</p>${pickList(g, i => Core.canTarget(g, i), 'investigate')}</section>`;
    case 'investigated':
      return gated(g, 'Investigação', () => {
        const p = Core.investigated(g) as Law;
        return `<div class="role-card ${p}" id="party"><small>${name(g, g.target as number)} é</small><b>${PARTY[p]}</b></div><p class="hint">Contar a verdade ou não é com você.</p><button class="btn block" data-act="endpower">Esconder e seguir</button>`;
      });
    case 'peek':
      return gated(g, 'Poder: espiar', () => `<p>As próximas 3 leis, na ordem:</p><div class="hand" id="peek">${g.deck.slice(0, 3).map(l => law(l)).join('')}</div><button class="btn block" data-act="endpower">Esconder e seguir</button>`);
    case 'execute':
      return `<section class="card" id="phase"><span class="label">Poder: eliminar</span><p class="big"><b>${pres}</b>, quem sai do jogo?</p>${pickList(g, i => Core.canTarget(g, i), 'pickp')}<button class="btn block danger" data-act="execute"${ui.pick === null ? ' disabled' : ''}>${ui.pick === null ? 'Escolha alguém' : `Eliminar ${name(g, ui.pick)}`}</button></section>`;
    default:
      return `<section class="card win ${g.winner}" id="phase"><span class="label">Fim de jogo</span><p class="big"><b>${g.winner === 'L' ? 'Os liberais venceram!' : 'Os fascistas venceram!'}</b></p><p>${esc(g.why)}</p>
        <button class="btn block" data-act="again">Jogar de novo com a mesma mesa</button><button class="btn ghost block" data-act="table">Mudar a mesa</button></section>`;
  }
}

/* ---------- settings ---------- */
function vSettings(): string {
  const t = S.theme || 'auto', opt = (v: string, label: string): string => `<button class="${t === v ? 'on' : ''}" data-act="theme" data-t="${v}" aria-pressed="${t === v}">${label}</button>`;
  const built = builtFrom();
  return `<section class="card" id="look"><span class="label">Aparência</span><div class="segm" role="group" aria-label="Tema">${opt('auto', 'Automático')}${opt('light', 'Claro')}${opt('dark', 'Escuro')}</div></section>
    <section class="card" id="about"><span class="label">Versão do app</span><p class="hint" id="version">${built ? `Versão ${esc(built.slice(0, 7))}.` : 'Versão de desenvolvimento.'} ${canUpdate() ? 'O app fica guardado neste aparelho: abre na hora e também sem internet.' : 'Neste endereço o app não fica guardado no aparelho.'}</p>${canUpdate() ? '<button class="btn ghost block" data-act="checkupdate">Procurar versão nova</button>' : ''}</section>`;
}
let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A short message at the bottom of the screen. */
export function toast(text: string): void {
  const t = part('toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}
/** Lets go of the field with the focus, so the screen can be painted again. */
export function blurField(): void { const a = document.activeElement as HTMLElement | null; if (a && a.blur && $('#view')?.contains(a)) a.blur(); }

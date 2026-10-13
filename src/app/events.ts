import { Core } from '../core';
import type { Game, Theme } from '../core';
import { $, valOf } from './format';
import { blurField, render, toast } from './render';
import { S, applyTheme, saveS, setS, ui } from './state';
import { applyUpdate, checkNow } from './update';

/* ================= events =================
   One listener for every tap, by data-act; one for what is typed. Chance comes from Math.random here: the core only
   ever gets it as a function. */
const rand = (): number => Math.random();

/** A new game state: saved, and whatever was picked, opened or half-counted on screen is let go. */
function play(next: Game, msg?: string): void {
  const changed = next !== S.game;
  setS({ ...S, game: next }); saveS();
  if (changed) { ui.open = ''; ui.pick = null; ui.confirmEnd = false; }
  render();
  if (msg && changed) toast(msg);
}
const ERR = { name: 'Escreve um nome.', dup: 'Esse nome já está na mesa.', count: `A mesa vai de ${Core.MIN_PLAYERS} a ${Core.MAX_PLAYERS} jogadores.` };

function addName(): void {
  const r = Core.addName(S.names, valOf('#name'));
  blurField();
  if (!r.ok) { ui.msg = ERR[r.why]; render(); return; }
  setS({ ...S, names: r.names }); saveS(); ui.msg = ''; ui.name = ''; render();
  $<HTMLInputElement>('#name')?.focus();
}
function start(): void {
  const r = Core.newGame(S.names, rand);
  if (!r.ok) { ui.msg = ERR[r.why]; render(); return; }
  ui.msg = ''; play(r.game, 'Jogo novo. Cada um vê seu papel em segredo.');
}
function lawMsg(before: Game, after: Game): string {
  if (after.phase === 'over') return after.winner === 'L' ? 'Os liberais venceram!' : 'Os fascistas venceram!';
  if (after.laws.F > before.laws.F) return 'Lei fascista aprovada.';
  if (after.laws.L > before.laws.L) return 'Lei liberal aprovada.';
  return '';
}

export function initEvents(): void {
  document.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b) return;
    const a = b.dataset.act, d = b.dataset, g = S.game, i = Number(d.i);
    if (a === 'addname') addName();
    else if (a === 'rmname') { setS({ ...S, names: S.names.filter((_, j) => j !== i) }); saveS(); ui.msg = ''; render(); }
    else if (a === 'start') start();
    else if (a === 'theme') { const t = d.t as Theme | 'auto'; if (t === 'auto') delete S.theme; else S.theme = t; saveS(); applyTheme(); render(); }
    else if (a === 'update') applyUpdate();
    else if (a === 'checkupdate') checkNow();
    else if (!g) return;
    else if (a === 'open') { ui.open = d.k || ''; ui.pick = null; render(); window.scrollTo(0, 0); }
    else if (a === 'hiderole') play(Core.revealNext(g));
    else if (a === 'nominate') play(Core.nominate(g, i));
    else if (a === 'elect') {
      const next = Core.vote(g, d.v === '1', rand);
      play(next, next.phase === 'over' ? lawMsg(g, next) : next.phase === 'president' ? 'Governo eleito.' : `Governo rejeitado.${lawMsg(g, next) ? ' ' + lawMsg(g, next) : ''}`);
    }
    else if (a === 'pick' || a === 'pickp') { ui.pick = Number(d.k ?? d.i); render(); }
    else if (a === 'pdiscard' && ui.pick !== null) play(Core.presidentDiscard(g, ui.pick));
    else if (a === 'cdiscard' && ui.pick !== null) { const next = Core.chancellorDiscard(g, ui.pick, rand); play(next, lawMsg(g, next)); }
    else if (a === 'askveto') play(Core.askVeto(g));
    else if (a === 'veto') { const next = Core.answerVeto(g, d.v === '1', rand); play(next, d.v === '1' ? `Veto aceito.${lawMsg(g, next) ? ' ' + lawMsg(g, next) : ''}` : 'Veto recusado.'); }
    else if (a === 'investigate') play(Core.investigate(g, i));
    else if (a === 'endpower') play(Core.endPower(g));
    else if (a === 'execute' && ui.pick !== null) { const t = g.players[ui.pick].name, next = Core.execute(g, ui.pick); play(next, next.phase === 'over' ? lawMsg(g, next) : `${t} foi eliminado.`); }
    else if (a === 'again') start();
    else if (a === 'table' || (a === 'end' && ui.confirmEnd)) { ui.confirmEnd = false; ui.open = ''; ui.pick = null; setS({ ...S, game: null }); saveS(); render(); }
    else if (a === 'end') { ui.confirmEnd = true; render(); }
  });
  document.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'name') ui.name = t.value;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target as HTMLElement).id === 'name') addName(); });
}

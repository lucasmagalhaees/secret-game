import { Core } from '../core';
import type { Game, Theme } from '../core';
import { $, valOf } from './format';
import { buzz, later, sound } from './fx';
import { blurField, confetti, flash, render, stamp, toast } from './render';
import { S, applyTheme, saveS, setS, ui } from './state';
import { applyUpdate, checkNow } from './update';

/* ================= events =================
   One listener for every tap, by data-act; one for what is typed. Chance comes from Math.random here: the core only
   ever gets it as a function. */
const rand = (): number => Math.random();

/** A new game state: saved, and whatever was picked, opened or half-counted on screen is let go. The end of a game
 *  gets its confetti and its fanfare here, whatever ended it. */
function play(next: Game, msg?: string, undo: Game | null = null): void {
  const before = S.game, changed = next !== before;
  setS({ ...S, game: next }); saveS();
  if (changed) { ui.open = ''; ui.pick = null; ui.confirmEnd = false; ui.undo = undo; }
  render();
  if (msg && changed) toast(msg);
  if (changed && next.phase === 'over' && before?.phase !== 'over' && next.winner) {
    confetti(next.winner); sound(next.winner === 'L' ? 'win' : 'lose'); buzz([60, 80, 60, 80, 200]);
  }
}
/** A public choice that can be taken back with "Desfazer" until something else happens. */
const choose = (before: Game, next: Game, msg?: string): void => play(next, msg, before);
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
  ui.msg = ''; ui.help = false; play(r.game, 'Jogo novo. Cada um vê seu papel em segredo.');
}
function lawMsg(before: Game, after: Game): string {
  if (after.phase === 'over') return after.winner === 'L' ? 'Os liberais venceram!' : 'Os fascistas venceram!';
  if (after.laws.F > before.laws.F) return 'Lei fascista aprovada.';
  if (after.laws.L > before.laws.L) return 'Lei liberal aprovada.';
  return '';
}
/** A law went on the table (from a government or from the chaos): the gavel. */
function gavelIf(before: Game, after: Game): void {
  if (after.laws.L + after.laws.F > before.laws.L + before.laws.F) sound('gavel');
}
/** The discarded card falls off the screen first; taps wait for it. */
function discard(then: () => void): void {
  ui.busy = true;
  document.querySelector('#phase .law.on')?.classList.add('toss');
  sound('paper');
  later(() => { ui.busy = false; then(); }, 380);
}
/** Whoever holds the phone puts it face down, or leaves the app: the secret closes by itself. */
function hide(why: string): void {
  if (!ui.open) return;
  ui.open = ''; ui.pick = null; render(); toast(why);
}
type Orientation = { requestPermission?: () => Promise<string> };
let askedOrientation = false;
/** iPhones only report the phone's position after the person allows it, and only from a tap. */
function askOrientation(): void {
  if (askedOrientation) return;
  askedOrientation = true;
  const D = (window as unknown as { DeviceOrientationEvent?: Orientation }).DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => { /* refused: the screen just does not hide by itself */ });
}

export function initEvents(): void {
  document.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b || ui.busy) return;
    const a = b.dataset.act, d = b.dataset, g = S.game, i = Number(d.i);
    if (a === 'addname') addName();
    else if (a === 'rmname') { setS({ ...S, names: S.names.filter((_, j) => j !== i) }); saveS(); ui.msg = ''; render(); }
    else if (a === 'start') start();
    else if (a === 'theme') { const t = d.t as Theme | 'auto'; if (t === 'auto') delete S.theme; else S.theme = t; saveS(); applyTheme(); render(); }
    else if (a === 'look') { if (d.l === 'deco') S.look = 'deco'; else delete S.look; saveS(); applyTheme(); render(); }
    else if (a === 'fx') { if (d.v === 'off') S.quiet = true; else { delete S.quiet; buzz(30); sound('stamp'); } saveS(); render(); }
    else if (a === 'update') applyUpdate();
    else if (a === 'checkupdate') checkNow();
    else if (!g) return;
    else if (a === 'help') { ui.help = !ui.help; render(); }
    else if (a === 'undo' && ui.undo) { const back = ui.undo; ui.undo = null; setS({ ...S, game: back }); saveS(); render(); toast('Desfeito.'); }
    else if (a === 'open') { askOrientation(); ui.undo = null; ui.open = d.k || ''; ui.pick = null; buzz(25); render(); window.scrollTo(0, 0); }
    else if (a === 'hiderole') play(Core.revealNext(g));
    else if (a === 'nominate') choose(g, Core.nominate(g, i));
    else if (a === 'elect') {
      const yes = d.v === '1', next = Core.vote(g, yes, rand);
      stamp(yes ? 'Eleito!' : 'Rejeitado!', yes ? 'L' : 'F'); sound('stamp'); if (yes) buzz([40, 60, 40]);
      gavelIf(g, next);
      choose(g, next, next.phase === 'over' ? lawMsg(g, next) : next.phase === 'president' ? 'Governo eleito.' : `Governo rejeitado.${lawMsg(g, next) ? ' ' + lawMsg(g, next) : ''}`);
    }
    else if (a === 'pick' || a === 'pickp') { ui.pick = Number(d.k ?? d.i); render(); }
    else if (a === 'pdiscard' && ui.pick !== null) { const k = ui.pick; discard(() => play(Core.presidentDiscard(g, k))); }
    else if (a === 'cdiscard' && ui.pick !== null) { const k = ui.pick; discard(() => { const next = Core.chancellorDiscard(g, k, rand); gavelIf(g, next); play(next, lawMsg(g, next)); }); }
    else if (a === 'askveto') play(Core.askVeto(g));
    else if (a === 'veto') { const next = Core.answerVeto(g, d.v === '1', rand); gavelIf(g, next); play(next, d.v === '1' ? `Veto aceito.${lawMsg(g, next) ? ' ' + lawMsg(g, next) : ''}` : 'Veto recusado.'); }
    else if (a === 'investigate') play(Core.investigate(g, i));
    else if (a === 'special') play(Core.specialElect(g, i), `${g.players[i].name} é o próximo presidente.`);
    else if (a === 'endpower') play(Core.endPower(g));
    else if (a === 'execute' && ui.pick !== null) {
      const t = g.players[ui.pick].name, next = Core.execute(g, ui.pick);
      flash(); sound('gavel'); buzz(220);
      play(next, next.phase === 'over' ? lawMsg(g, next) : `${t} foi eliminado.`);
    }
    else if (a === 'again') start();
    else if (a === 'table' || (a === 'end' && ui.confirmEnd)) { ui.confirmEnd = false; ui.open = ''; ui.pick = null; ui.undo = null; setS({ ...S, game: null }); saveS(); render(); }
    else if (a === 'end') { ui.confirmEnd = true; render(); }
  });
  document.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'name') ui.name = t.value;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target as HTMLElement).id === 'name') addName(); });
  // a secret never stays on screen when the app goes to the background or the phone is put face down
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide('Segredo escondido: o app saiu da tela.'); });
  window.addEventListener('deviceorientation', e => { if (e.beta !== null && Math.abs(e.beta) > 150) hide('Segredo escondido: o celular foi virado para baixo.'); });
}

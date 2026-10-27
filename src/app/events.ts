import { Core } from '../core';
import type { Ask, Game, Law, Level, Pack, Role, Theme } from '../core';
import { $, valOf } from './format';
import { buzz, later, sound } from './fx';
import { blurField, confetti, decree, flash, render, stamp, toast } from './render';
import { S, SPEEDS, applyTheme, saveS, setS, ui } from './state';
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
  if (changed) { ui.open = ''; ui.pick = null; ui.confirmEnd = false; ui.undo = undo; ui.votes = {}; }
  render();
  if (msg && changed) toast(msg);
  if (changed && next.phase === 'over' && before?.phase !== 'over' && next.winner) {
    confetti(next.winner); sound(next.winner === 'L' ? 'win' : 'lose'); buzz([60, 80, 60, 80, 200]);
  }
  tick();
}

/* ---------- the players run by the app (D10) ----------
   When it is their turn, one step is played after `ui.think` ms, so the people at the table can follow it; then the
   next. Anything that happens meanwhile (a tap, an undo, a new game) changes S.game, and the step that was waiting is
   dropped. Seeing their own role takes no time. */
let botTimer: ReturnType<typeof setTimeout> | undefined;
export function tick(): void {
  clearTimeout(botTimer);
  const g = S.game, t = g ? Core.botTurn(g) : null;
  if (!g || !t) return;
  botTimer = setTimeout(() => {
    if (S.game !== g) return;
    const next = Core.botStep(g, rand);
    if (next) botPlayed(g, next);
  }, t.ask === 'reveal' ? 0 : ui.think ?? SPEEDS[S.speed || 'normal']);
}
/** What everyone notices when a vote is counted: the stamp, and the vibration when it elects. */
function voted(before: Game, next: Game): void {
  const e = [...next.hist].reverse().find(x => x.k === 'vote');
  const elected = !!e && e.k === 'vote' && e.ja.length * 2 > before.players.filter(p => p.alive).length;
  stamp(elected ? 'Eleito!' : 'Rejeitado!', elected ? 'L' : 'F'); sound('stamp'); if (elected) buzz([40, 60, 40]);
}
/** An app player did something: the same sounds and marks as when a person does it, and the line it adds to the log. */
function botPlayed(before: Game, next: Game): void {
  if (next.hist.length > before.hist.length && next.hist.slice(before.hist.length).some(e => e.k === 'vote')) voted(before, next);
  if (next.phase === 'chancellor' && before.phase === 'president') sound('paper');
  gavelIf(before, next);
  if (next.players.some((p, i) => !p.alive && before.players[i].alive)) { flash(); sound('gavel'); buzz(220); }
  const line = next.log.length > before.log.length ? next.log[next.log.length - 1] : '';
  play(next, next.phase === 'over' ? lawMsg(before, next) || next.why : line || undefined);
}
/** A person voted at a table with app players: once every person still in the game has, the votes are counted. */
function myVote(i: number, yes: boolean): void {
  const g = S.game as Game;
  ui.votes = { ...ui.votes, [i]: yes };
  const people = Core.humansAlive(g);
  if (people.length === 1) count(g);
  else render();
}
function count(g: Game): void {
  const next = Core.castVotes(g, ui.votes, rand);
  if (next === g) return;
  voted(g, next); gavelIf(g, next);
  choose(g, next, next.phase === 'over' ? lawMsg(g, next) || next.why : next.log[next.log.length - 1]);
}
/** A public choice that can be taken back with "Desfazer" until something else happens. */
const choose = (before: Game, next: Game, msg?: string): void => play(next, msg, before);
const ERR = { name: 'Escreve um nome.', dup: 'Esse nome já está na mesa.', count: `A mesa vai de ${Core.MIN_PLAYERS} a ${Core.MAX_PLAYERS} jogadores.` };

/** Which seats of the table the app plays, one flag per name. */
const flags = (): boolean[] => S.names.map((_, i) => !!S.ai?.[i]);
function setTable(names: string[], ai: boolean[]): void {
  const next = { ...S, names };
  if (ai.some(Boolean)) next.ai = ai; else delete next.ai;
  setS(next); saveS();
}
function addName(): void {
  const r = Core.addName(S.names, valOf('#name'));
  blurField();
  if (!r.ok) { ui.msg = ERR[r.why]; render(); return; }
  setTable(r.names, [...flags(), false]); ui.msg = ''; ui.name = ''; render();
  $<HTMLInputElement>('#name')?.focus();
}
/** One more seat for the app, or as many as it takes to make a table of n. */
function addBots(n: number): void {
  let names = S.names, ai = flags();
  if (!ai.some(x => !x) && !valOf('#name').trim()) { ui.msg = 'Ponha o seu nome primeiro: a IA completa a mesa.'; render(); return; }
  if (valOf('#name').trim()) { const r = Core.addName(names, valOf('#name')); if (r.ok) { names = r.names; ai = [...ai, false]; ui.name = ''; } }
  blurField();
  while (names.length < n && names.length < Core.MAX_PLAYERS) { names = [...names, Core.botName(names, rand, S.pack)]; ai = [...ai, true]; }
  if (names.length > n) { ui.msg = `A mesa já tem ${names.length} lugares.`; }
  else ui.msg = '';
  setTable(names, ai); render();
}
/** Another theme (D12): the seats of the app get names of that theme; the people keep theirs. */
function setPack(pack: Pack | undefined): void {
  const ai = flags(), names: string[] = S.names.map((x, i) => (ai[i] ? '' : x));
  for (let i = 0; i < names.length; i++) if (ai[i]) names[i] = Core.botName(names.filter(Boolean), rand, pack);
  const next = { ...S, names };
  if (pack) next.pack = pack; else delete next.pack;
  setS(next); saveS(); render();
}
function start(): void {
  if (S.names.length && flags().every(Boolean)) { ui.msg = 'Precisa de pelo menos uma pessoa na mesa.'; render(); return; }
  const r = Core.newGame(S.names, rand, { ai: flags(), level: S.level, train: S.train, pack: S.pack });
  if (!r.ok) { ui.msg = ERR[r.why]; render(); return; }
  if (S.notes) { const next = { ...S }; delete next.notes; setS(next); }     // a new game starts a clean notebook
  ui.msg = ''; ui.help = false; ui.endTab = 'res'; play(r.game, 'Jogo novo. Cada um vê seu papel em segredo.');
}
function lawMsg(before: Game, after: Game): string {
  const w = Core.words(after.pack);
  if (after.phase === 'over') return after.winner === 'L' ? 'Os liberais venceram!' : `Os ${w.fs} venceram!`;
  if (after.laws.F > before.laws.F) return `Lei ${w.f} aprovada.`;
  if (after.laws.L > before.laws.L) return 'Lei liberal aprovada.';
  return '';
}
/** A law went on the table (from a government or from the chaos): the gavel, and who made it over the screen. */
function gavelIf(before: Game, after: Game): void {
  if (after.laws.L + after.laws.F <= before.laws.L + before.laws.F) return;
  sound('gavel');
  const e = after.hist.slice(before.hist.length).reverse().find(x => x.k === 'gov' || x.k === 'chaos');
  if (e && (e.k === 'gov' || e.k === 'chaos')) decree(after, e);
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
    else if (a === 'rmname') { setTable(S.names.filter((_, j) => j !== i), flags().filter((_, j) => j !== i)); ui.msg = ''; render(); }
    else if (a === 'addbot') addBots(S.names.length + (valOf('#name').trim() ? 2 : 1));
    else if (a === 'fill') addBots(Number(d.n));
    else if (a === 'level') { setS({ ...S, level: d.v as Level }); saveS(); render(); }
    else if (a === 'pack') setPack(d.v === 'comunismo' ? 'comunismo' : undefined);
    else if (a === 'train') { const next = { ...S }; if (d.v) next.train = d.v as Role; else delete next.train; setS(next); saveS(); render(); }
    else if (a === 'coach') { const next = { ...S }; if (d.v === 'on') next.coach = true; else delete next.coach; setS(next); saveS(); render(); }
    else if (a === 'speed') { const next = { ...S }; if (d.v === 'lenta' || d.v === 'rapida') next.speed = d.v; else delete next.speed; setS(next); saveS(); render(); }
    else if (a === 'assist') { const next = { ...S }; if (d.v === 'on') next.assist = true; else delete next.assist; setS(next); saveS(); render(); }
    else if (a === 'start') start();
    else if (a === 'more') { ui.more = !ui.more; render(); }
    else if (a === 'rules') { ui.rules = !ui.rules; render(); }
    else if (a === 'theme') { const t = d.t as Theme | 'auto'; if (t === 'auto') delete S.theme; else S.theme = t; saveS(); applyTheme(); render(); }
    else if (a === 'look') { if (d.l === 'deco') S.look = 'deco'; else delete S.look; saveS(); applyTheme(); render(); }
    else if (a === 'fx') { if (d.v === 'off') S.quiet = true; else { delete S.quiet; buzz(30); sound('stamp'); } saveS(); render(); }
    else if (a === 'update') applyUpdate();
    else if (a === 'checkupdate') checkNow();
    else if (!g) return;
    else if (a === 'help') { ui.help = !ui.help; render(); }
    else if (a === 'allplays') { ui.allPlays = !ui.allPlays; render(); }
    else if (a === 'endtab') { ui.endTab = d.v === 'jogo' || d.v === 'log' ? d.v : 'res'; render(); scrollTo(0, 0); }
    else if (a === 'mind') { ui.mind = !ui.mind; if (ui.mind && S.notesOpen) { const next = { ...S }; delete next.notesOpen; setS(next); saveS(); } render(); }
    else if (a === 'debug') { const next = { ...S }; if (d.v === 'on') next.debug = true; else { delete next.debug; ui.mind = false; } setS(next); saveS(); render(); }
    else if (a === 'mindseat') { ui.mindSeat = i; ui.mindOf = null; render(); }
    else if (a === 'mindof') { ui.mindOf = i; render(); }
    else if (a === 'live') { const next = { ...S }; if (S.live) delete next.live; else next.live = true; setS(next); saveS(); render(); }
    else if (a === 'notesopen') { const next = { ...S }; if (S.notesOpen) delete next.notesOpen; else { next.notesOpen = true; ui.mind = false; } setS(next); saveS(); render(); }   // one panel at a time: on a phone they would cover each other
    else if (a === 'note') { const notes: Record<string, Law> = Object.fromEntries(Object.entries(S.notes || {}).filter(([k]) => k !== String(i))); if (d.v === 'L' || d.v === 'F') notes[i] = d.v; const next = { ...S }; if (Object.keys(notes).length) next.notes = notes; else delete next.notes; setS(next); saveS(); render(); }
    else if (a === 'undo' && ui.undo) { const back = ui.undo; ui.undo = null; ui.votes = {}; setS({ ...S, game: back }); saveS(); render(); toast('Desfeito.'); tick(); }
    else if (a === 'open') { askOrientation(); ui.undo = null; ui.open = d.k || ''; ui.pick = null; buzz(25); render(); window.scrollTo(0, 0); }
    else if (a === 'hiderole') play(Core.revealNext(g));
    else if (a === 'nominate') choose(g, Core.nominate(g, i));
    else if (a === 'myvote') myVote(i, d.v === '1');
    else if (a === 'countvotes') count(g);
    else if (a === 'say') { const next = Core.say(g, i, d.w as Ask, Number(d.v)); play(next, next.log[next.log.length - 1]); }
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
    else if (a === 'table' || (a === 'end' && ui.confirmEnd)) { ui.confirmEnd = false; ui.open = ''; ui.pick = null; ui.undo = null; setS({ ...S, game: null }); saveS(); render(); tick(); }
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

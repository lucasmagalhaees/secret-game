/* The rules of the game. Pure: a game comes in and a new one goes out; chance comes in as a function (`rand`), so the
   same seed always plays the same game. An action that is not allowed where the game is returns the same game,
   untouched: the page only offers what is allowed, and a stray tap changes nothing. */
import type { Game, Law, Party, Player, Role } from './types';

export const MIN_PLAYERS = 5, MAX_PLAYERS = 10, NAME_MAX = 20;
/** The deck: 17 laws, 11 fascist and 6 liberal, as in the original game. */
export const DECK_F = 11, DECK_L = 6;
/** Laws of its own kind each side needs to win, as in the original game. */
export const WIN: Record<Law, number> = { L: 5, F: 6 };
/** Governments rejected in a row before the top law is enacted by itself. */
export const TRACKER_MAX = 3;
/** Fascist laws on the table from which electing Hitler chancellor wins the game for the fascists. */
export const HITLER_ZONE = 3;
/** Fascist laws on the table from which the chancellor may ask to veto the two laws in hand. */
export const VETO_FROM = 5;
/** Players alive at or under which only the last chancellor (not the last president) is barred from being chancellor. */
export const SMALL_TABLE = 5;
/** Fascists (Hitler included) for each size of table. */
export const FASCISTS: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4 };
/** What the president of the round gets to do when the Nth fascist law is enacted. */
export const POWERS: Record<number, 'investigate' | 'peek' | 'execute'> = { 2: 'investigate', 3: 'peek', 4: 'execute', 5: 'execute' };

/** A small seeded generator (mulberry32): numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const partyOf = (r: Role): Party => (r === 'liberal' ? 'L' : 'F');
export const lawName = (l: Law): string => (l === 'L' ? 'liberal' : 'fascista');

/** The names of a table, checked: trimmed, none empty, none repeated, between MIN_PLAYERS and MAX_PLAYERS. */
export function checkNames(names: string[]): { ok: true; names: string[] } | { ok: false; why: 'count' | 'name' | 'dup' } {
  const n = names.map(x => String(x || '').trim().slice(0, NAME_MAX));
  if (n.some(x => !x)) return { ok: false, why: 'name' };
  if (new Set(n.map(x => x.toLocaleLowerCase('pt-BR'))).size !== n.length) return { ok: false, why: 'dup' };
  if (n.length < MIN_PLAYERS || n.length > MAX_PLAYERS) return { ok: false, why: 'count' };
  return { ok: true, names: n };
}

/** One more name at the table, or why not: empty, already there, or the table is full. */
export function addName(names: string[], name: string): { ok: true; names: string[] } | { ok: false; why: 'name' | 'dup' | 'count' } {
  const n = String(name || '').trim().slice(0, NAME_MAX);
  if (!n) return { ok: false, why: 'name' };
  if (names.some(x => x.toLocaleLowerCase('pt-BR') === n.toLocaleLowerCase('pt-BR'))) return { ok: false, why: 'dup' };
  if (names.length >= MAX_PLAYERS) return { ok: false, why: 'count' };
  return { ok: true, names: [...names, n] };
}

/** A new game: roles dealt at random, the deck shuffled, the first president drawn. */
export function newGame(names: string[], rand: () => number): { ok: true; game: Game } | { ok: false; why: 'count' | 'name' | 'dup' } {
  const c = checkNames(names);
  if (!c.ok) return c;
  const k = FASCISTS[c.names.length];
  const roles = shuffle<Role>(['hitler', ...Array(k - 1).fill('fascista'), ...Array(c.names.length - k).fill('liberal')], rand);
  const players: Player[] = c.names.map((name, i) => ({ name, role: roles[i], alive: true }));
  const deck = shuffle<Law>([...Array(DECK_F).fill('F'), ...Array(DECK_L).fill('L')], rand);
  const pres = Math.floor(rand() * players.length);
  return { ok: true, game: { players, deck, discard: [], laws: { L: 0, F: 0 }, phase: 'reveal', pres, chanc: null, lastPres: null, lastChanc: null, tracker: 0, vetoed: false, seen: [], reveal: 0, hand: [], target: null, winner: null, why: '', log: [`Jogo começou com ${players.length} jogadores.`] } };
}

/** What player i is told at the start: the fascists see each other and Hitler; Hitler and the liberals see no one. */
export function knows(g: Game, i: number): { name: string; role: Role }[] {
  if (g.players[i]?.role !== 'fascista') return [];
  return g.players.filter((p, j) => j !== i && p.role !== 'liberal').map(p => ({ name: p.name, role: p.role }));
}

/** The player who has just seen their role hides it; after the last one, the first round begins. */
export function revealNext(g: Game): Game {
  if (g.phase !== 'reveal') return g;
  const reveal = g.reveal + 1;
  return reveal < g.players.length ? { ...g, reveal } : { ...g, reveal, phase: 'nominate' };
}

const aliveCount = (g: Game): number => g.players.filter(p => p.alive).length;

/** Who the president can nominate: anyone else still in the game, except the last government elected (term limits:
 *  with SMALL_TABLE or fewer alive, only the last chancellor is barred). */
export const canNominate = (g: Game, i: number): boolean => g.phase === 'nominate' && i !== g.pres && !!g.players[i]?.alive
  && i !== g.lastChanc && (aliveCount(g) <= SMALL_TABLE || i !== g.lastPres);

export function nominate(g: Game, i: number): Game {
  return canNominate(g, i) ? { ...g, chanc: i, phase: 'vote' } : g;
}

/** The next president: the next player still alive, going round the table. */
function nextPres(g: Game): number {
  let i = g.pres;
  do i = (i + 1) % g.players.length; while (!g.players[i].alive);
  return i;
}
const newRound = (g: Game): Game => ({ ...g, phase: 'nominate', pres: nextPres(g), chanc: null, hand: [], target: null, vetoed: false });
const over = (g: Game, winner: Party, why: string): Game => ({ ...g, phase: 'over', winner, why, hand: [], log: [...g.log, why] });

/** With fewer than 3 laws left to draw, the discarded ones go back in and the pile is shuffled. */
function refill(g: Game, rand: () => number): Game {
  return g.deck.length >= 3 ? g : { ...g, deck: shuffle([...g.deck, ...g.discard], rand), discard: [] };
}

/** One law goes on the table. From a government it may give the president a power; from the tracker it never does. */
function enact(g: Game, law: Law, rand: () => number, fromGov: boolean): Game {
  const laws = { ...g.laws, [law]: g.laws[law] + 1 };
  const who = fromGov ? `por ${g.players[g.pres].name} (presidente) e ${g.players[g.chanc as number].name} (chanceler)` : `pelo caos (${TRACKER_MAX} governos seguidos sem lei)`;
  const n: Game = refill({ ...g, laws, hand: [], log: [...g.log, `Lei ${lawName(law)} aprovada ${who}.`] }, rand);
  if (laws.L >= WIN.L) return over(n, 'L', `${WIN.L} leis liberais aprovadas: os liberais vencem.`);
  if (laws.F >= WIN.F) return over(n, 'F', `${WIN.F} leis fascistas aprovadas: os fascistas vencem.`);
  const power = law === 'F' && fromGov ? POWERS[laws.F] : undefined;
  if (power) return { ...n, phase: power, target: null };
  return newRound(n);
}

/** The table voted out loud (Ja! or Nein!) and the phone records the result: more Ja! than Nein! elects the government. */
export function vote(g: Game, elected: boolean, rand: () => number): Game {
  if (g.phase !== 'vote' || g.chanc === null) return g;
  const pres = g.players[g.pres].name, chanc = g.players[g.chanc];
  if (elected) {
    const n: Game = { ...g, tracker: 0, lastPres: g.pres, lastChanc: g.chanc, log: [...g.log, `Governo ${pres} + ${chanc.name} eleito.`] };
    if (chanc.role === 'hitler' && g.laws.F >= HITLER_ZONE) return over(n, 'F', `Hitler (${chanc.name}) foi eleito chanceler: os fascistas vencem.`);
    return { ...n, phase: 'president', hand: n.deck.slice(0, 3), deck: n.deck.slice(3) };
  }
  return failed({ ...g, log: [...g.log, `Governo ${pres} + ${chanc.name} rejeitado.`] }, rand);
}


/** A government that did not make a law (rejected, or vetoed). At the third in a row, the top law is enacted by itself
 *  and the term limits are forgotten. */
function failed(g: Game, rand: () => number): Game {
  const n: Game = { ...g, tracker: g.tracker + 1, hand: [] };
  if (n.tracker < TRACKER_MAX) return newRound(n);
  const r = refill(n, rand), top = r.deck[0];
  return enact({ ...r, tracker: 0, lastPres: null, lastChanc: null, deck: r.deck.slice(1) }, top, rand, false);     // the presidency moves on inside enact
}

/** The president throws one of the 3 laws away and passes the other 2 on. */
export function presidentDiscard(g: Game, k: number): Game {
  if (g.phase !== 'president' || !(k >= 0 && k < g.hand.length)) return g;
  return { ...g, phase: 'chancellor', discard: [...g.discard, g.hand[k]], hand: g.hand.filter((_, j) => j !== k) };
}

/** The chancellor throws one of the 2 laws away; the other is enacted. */
export function chancellorDiscard(g: Game, k: number, rand: () => number): Game {
  if (g.phase !== 'chancellor' || !(k >= 0 && k < g.hand.length)) return g;
  const law = g.hand[1 - k];
  return enact({ ...g, discard: [...g.discard, g.hand[k]] }, law, rand, true);
}

/** The chancellor may ask to veto when VETO_FROM fascist laws are on the table, once per government. */
export const canVeto = (g: Game): boolean => g.phase === 'chancellor' && g.laws.F >= VETO_FROM && !g.vetoed;

export function askVeto(g: Game): Game {
  return canVeto(g) ? { ...g, phase: 'veto', log: [...g.log, `${g.players[g.chanc as number].name} (chanceler) pediu veto.`] } : g;
}
/** The president answers the veto. Yes: both laws go to the discards and the government counts as failed. No: the
 *  chancellor must enact one of them. */
export function answerVeto(g: Game, yes: boolean, rand: () => number): Game {
  if (g.phase !== 'veto') return g;
  const who = g.players[g.pres].name;
  if (!yes) return { ...g, phase: 'chancellor', vetoed: true, log: [...g.log, `${who} (presidente) recusou o veto.`] };
  return failed({ ...g, discard: [...g.discard, ...g.hand], log: [...g.log, `${who} (presidente) aceitou o veto: nenhuma lei aprovada.`] }, rand);
}

/** Who the president can use a power on: anyone else still in the game, and for an investigation, not someone already
 *  investigated. */
export const canTarget = (g: Game, i: number): boolean => (g.phase === 'investigate' || g.phase === 'execute') && i !== g.pres && !!g.players[i]?.alive
  && !(g.phase === 'investigate' && g.seen.includes(i));

/** The president picks whose party to see. Hitler shows as fascist. */
export function investigate(g: Game, i: number): Game {
  if (g.phase !== 'investigate' || !canTarget(g, i)) return g;
  return { ...g, phase: 'investigated', target: i, seen: [...g.seen, i], log: [...g.log, `${g.players[g.pres].name} investigou ${g.players[i].name}.`] };
}

/** The party the president sees, once a player has been investigated. */
export const investigated = (g: Game): Party | null => (g.phase === 'investigated' && g.target !== null ? partyOf(g.players[g.target].role) : null);

/** The president has seen what the power showed (a party, or the next 3 laws): the next round begins. */
export function endPower(g: Game): Game {
  if (g.phase === 'peek') return newRound({ ...g, log: [...g.log, `${g.players[g.pres].name} olhou as próximas 3 leis.`] });
  return g.phase === 'investigated' ? newRound(g) : g;
}

/** The president eliminates a player. Eliminating Hitler wins the game for the liberals. */
export function execute(g: Game, i: number): Game {
  if (g.phase !== 'execute' || !canTarget(g, i)) return g;
  const players = g.players.map((p, j) => (j === i ? { ...p, alive: false } : p));
  const n: Game = { ...g, players, log: [...g.log, `${g.players[g.pres].name} eliminou ${g.players[i].name}.`] };
  if (g.players[i].role === 'hitler') return over(n, 'L', `Hitler (${g.players[i].name}) foi eliminado: os liberais vencem.`);
  return newRound(n);
}

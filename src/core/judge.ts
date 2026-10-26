/* The judge between the game and the players run by the app (D10). It is the only code that holds the whole game and
   asks them anything: for the seat whose turn it is, it builds what that seat may know (`viewOf`: its own role, its
   team if it knows it, the laws that passed through its hands, what it saw with its own powers, and what everyone saw
   and heard), asks one question with the answers allowed, and plays the answer through the rules. An answer outside
   what was offered is not played: the first allowed option is. So no player run by the app sees more than its seat or
   does more than its turn. It also takes the votes, one by one, where the app plays some of the seats, and what each
   player tells the table about its hand. */
import { decide } from './ai';
import { answerVeto, askVeto, canNominate, canTarget, canVeto, chancellorDiscard, endPower, execute, FASCISTS, HITLER_KNOWS_UPTO, investigate, nominate, presidentDiscard, revealNext, specialElect, vote } from './game';
import type { Ask, Event, Game, Gov, Law, Level, Role, Seen, View } from './types';

export const hasAi = (g: Game): boolean => g.players.some(p => p.ai);
const isAi = (g: Game, i: number): boolean => !!g.players[i]?.ai;
/** The people at the table still in the game (not run by the app). */
export const humansAlive = (g: Game): number[] => g.players.map((p, i) => (p.alive && !p.ai ? i : -1)).filter(i => i >= 0);
const seats = (g: Game, ok: (i: number) => boolean): number[] => g.players.map((_, i) => i).filter(ok);

/* ---------- what each seat tells the table ---------- */
const talkKinds: Ask[] = ['pc', 'cc', 'inv', 'peek'];
/** A new election closes what could still be said about the last one. */
const settled = (g: Game, i: number): boolean => g.hist.slice(i + 1).some(e => e.k === 'vote' || e.k === 'rej' || e.k === 'gov' || e.k === 'veto');
function lastIndex(g: Game, kinds: Event['k'][]): number {
  for (let i = g.hist.length - 1; i >= 0; i--) if (kinds.includes(g.hist[i].k)) return i;
  return -1;
}
/** What this seat may still tell the table: what it drew as president ('pc'), got as chancellor ('cc'), saw in an
 *  investigation ('inv') or spying ('peek'). Each once, and only until the next election. */
export function claims(g: Game, seat: number): Ask[] {
  if (g.phase === 'over' || !g.players[seat]?.alive) return [];
  const out: Ask[] = [], i = lastIndex(g, ['gov', 'veto']), j = lastIndex(g, ['inv']), k = lastIndex(g, ['peek']);
  if (i >= 0 && !settled(g, i)) {
    const e = g.hist[i] as Gov;
    if (e.pres === seat && e.pc === undefined) out.push('pc');
    if (e.chanc === seat && e.cc === undefined) out.push('cc');
  }
  const inv = g.hist[j];
  if (inv && inv.k === 'inv' && inv.by === seat && inv.said === undefined && !settled(g, j) && g.phase !== 'investigated') out.push('inv');
  const pk = g.hist[k];
  if (pk && pk.k === 'peek' && pk.by === seat && pk.said === undefined && !settled(g, k)) out.push('peek');
  return out;
}
const MAX_SAY: Record<string, number> = { pc: 3, cc: 2, inv: 1, peek: 3 };
const fN = (n: number, of: number, a: string, b: string): string => {
  const l = of - n, part = (x: number, w: string): string => `${x} ${w}${x === 1 ? '' : 's'}`;
  return n && l ? `${part(n, a)} e ${part(l, b)}` : n ? part(n, a) : part(l, b);
};
/** One seat tells the table what it saw (`v`: fascist laws, or for 'inv' 0 liberal / 1 fascist; -1 keeps quiet). */
export function say(g: Game, seat: number, what: Ask, v: number): Game {
  if (!claims(g, seat).includes(what) || !(Number.isInteger(v) && v >= -1 && v <= MAX_SAY[what])) return g;
  const who = g.players[seat].name, quiet = v < 0;
  const set = (i: number, patch: object, line: string): Game => ({ ...g, hist: g.hist.map((e, j) => (j === i ? ({ ...e, ...patch } as Event) : e)), log: [...g.log, line] });
  if (what === 'pc' || what === 'cc') {
    const i = lastIndex(g, ['gov', 'veto']);
    const line = quiet ? `${who} não disse o que ${what === 'pc' ? 'tirou' : 'recebeu'}.`
      : what === 'pc' ? `${who} (presidente) disse que tirou ${fN(v, 3, 'fascista', 'liberal')}.` : `${who} (chanceler) disse que recebeu ${fN(v, 2, 'fascista', 'liberal')}.`;
    return set(i, what === 'pc' ? { pc: v } : { cc: v }, line);
  }
  if (what === 'inv') {
    const i = lastIndex(g, ['inv']), e = g.hist[i] as Extract<Event, { k: 'inv' }>;
    return set(i, { said: quiet ? '-' : v ? 'F' : 'L' }, quiet ? `${who} não disse o que viu na investigação.` : `${who} disse que ${g.players[e.target].name} é ${v ? 'fascista' : 'liberal'}.`);
  }
  const i = lastIndex(g, ['peek']);
  return set(i, { said: v }, quiet ? `${who} não disse o que espiou.` : `${who} disse que as próximas 3 leis são ${fN(v, 3, 'fascista', 'liberal')}.`);
}

/* ---------- the votes, where the app plays some seats ---------- */
/** Everyone alive votes: the people with `votes` (seat → Ja!), the players run by the app by themselves. The votes are
 *  recorded for all to see, and more Ja! than Nein! elects. Missing a person's vote, nothing happens. */
export function castVotes(g: Game, votes: Record<number, boolean>, rand: () => number): Game {
  if (g.phase !== 'vote' || g.chanc === null) return g;
  const alive = seats(g, i => g.players[i].alive);
  if (alive.some(i => !isAi(g, i) && typeof votes[i] !== 'boolean')) return g;
  const ja = alive.filter(i => (isAi(g, i) ? ask(g, i, 'vote', [1, 0], rand) === 1 : votes[i]));
  const nein = alive.filter(i => !ja.includes(i)), list = (xs: number[]): string => xs.map(i => g.players[i].name).join(', ') || 'ninguém';
  const n: Game = { ...g, log: [...g.log, `Votos. Ja!: ${list(ja)}. Nein!: ${list(nein)}.`], hist: [...g.hist, { k: 'vote', pres: g.pres, chanc: g.chanc, ja }] };
  return vote(n, ja.length > nein.length, rand);
}

/* ---------- what a seat may know ---------- */
/** The history as this seat knows it: the secrets of others taken out. */
function seenBy(e: Event, me: number): Seen {
  switch (e.k) {
    case 'gov': case 'veto': {
      const { drew, got, ...rest } = e;
      return { ...rest, ...(e.pres === me && drew ? { drew } : {}), ...((e.pres === me || e.chanc === me) && got ? { got } : {}) };
    }
    case 'inv': { const { party, ...rest } = e; return e.by === me ? { ...rest, party } : rest; }
    case 'peek': { const { saw, ...rest } = e; return e.by === me && saw ? { ...rest, saw } : rest; }
    case 'exec': return { k: 'exec', by: e.by, target: e.target };
    default: return e;
  }
}
/** What seat `me` may know when asked `q` with these answers allowed. */
export function viewOf(g: Game, me: number, q: Ask, options: number[]): View {
  const role = g.players[me].role, all = role === 'fascista' || (role === 'hitler' && g.players.length <= HITLER_KNOWS_UPTO);
  const known: (Role | null)[] = g.players.map((p, i) => (i === me || all ? p.role : null));
  const hand: Law[] = (q === 'pdiscard' || q === 'cdiscard' || q === 'veto') ? [...g.hand] : [];
  return {
    me, role, level: (g.players[me].level || g.level || 'medio') as Level, n: g.players.length, alive: g.players.map(p => p.alive), known, fascists: FASCISTS[g.players.length],
    laws: { ...g.laws }, tracker: g.tracker, pres: g.pres, chanc: g.chanc, lastPres: g.lastPres, lastChanc: g.lastChanc,
    ask: q, options: [...options], hand, hist: g.hist.map(e => seenBy(e, me))
  };
}
/** Asks one seat one question, through its view; an answer outside the options is taken as the first option. */
function ask(g: Game, seat: number, q: Ask, options: number[], rand: () => number): number {
  const a = decide(viewOf(g, seat, q, options), rand);
  return options.includes(a) ? a : options[0];
}

/* ---------- whose turn ---------- */
/** The question the game puts now, to whom, with the answers allowed; null when nobody has to decide anything (or
 *  only the people at the table, voting). */
export function turn(g: Game): { seat: number; ask: Ask | 'reveal' | 'see' | 'votes'; options: number[] } | null {
  const all = (ok: (i: number) => boolean): number[] => seats(g, ok);
  switch (g.phase) {
    case 'reveal': return { seat: g.reveal, ask: 'reveal', options: [] };
    case 'nominate': return { seat: g.pres, ask: 'nominate', options: all(i => canNominate(g, i)) };
    case 'vote': return humansAlive(g).length ? null : { seat: g.pres, ask: 'votes', options: [] };
    case 'president': return { seat: g.pres, ask: 'pdiscard', options: g.hand.map((_, k) => k) };
    case 'chancellor': return { seat: g.chanc as number, ask: 'cdiscard', options: [...g.hand.map((_, k) => k), ...(canVeto(g) ? [2] : [])] };
    case 'veto': return { seat: g.pres, ask: 'veto', options: [1, 0] };
    case 'investigate': case 'special': case 'execute': return { seat: g.pres, ask: g.phase, options: all(i => canTarget(g, i)) };
    case 'investigated': case 'peek': return { seat: g.pres, ask: 'see', options: [] };
    default: return null;
  }
}
/** The player run by the app who acts next: one with something to tell the table first (the president before the
 *  chancellor), then whoever the game is waiting for. Null when it waits for a person, or for nobody. */
export function botTurn(g: Game): { seat: number; ask: Ask | 'reveal' | 'see' | 'votes'; options: number[] } | null {
  if (!hasAi(g) || g.phase === 'over') return null;
  for (const kind of talkKinds) {
    const s = seats(g, i => isAi(g, i) && claims(g, i).includes(kind))[0];
    if (s !== undefined) return { seat: s, ask: kind, options: kind === 'inv' ? [0, 1] : Array.from({ length: MAX_SAY[kind] + 1 }, (_, i) => i) };
  }
  const t = turn(g), choice = t && !['reveal', 'see', 'votes'].includes(t.ask);
  if (!t || (choice && !t.options.length)) return null;                     // nothing it could answer: never asked
  return isAi(g, t.seat) || t.ask === 'votes' ? t : null;
}
/** The next step of a player run by the app, played through the rules; null when it is not their turn. */
export function botStep(g: Game, rand: () => number): Game | null {
  const t = botTurn(g);
  if (!t) return null;
  if (t.ask === 'reveal') return revealNext(g);
  if (t.ask === 'see') return endPower(g);
  if (t.ask === 'votes') return castVotes(g, {}, rand);
  const a = ask(g, t.seat, t.ask, t.options, rand);
  switch (t.ask) {
    case 'pc': case 'cc': case 'inv': case 'peek': return say(g, t.seat, t.ask, a);
    case 'nominate': return nominate(g, a);
    case 'pdiscard': return presidentDiscard(g, a);
    case 'cdiscard': return a === 2 ? askVeto(g) : chancellorDiscard(g, a, rand);
    case 'veto': return answerVeto(g, a === 1, rand);
    case 'investigate': return investigate(g, a);
    case 'special': return specialElect(g, a);
    default: return execute(g, a);
  }
}

/* The judge between the game and the players run by the app (D10). It is the only code that holds the whole game and
   asks them anything: for the seat whose turn it is, it builds what that seat may know (`viewOf`: its own role, its
   team if it knows it, the laws that passed through its hands, what it saw with its own powers, and what everyone saw
   and heard), asks one question with the answers allowed, and plays the answer through the rules. An answer outside
   what was offered is not played: the first allowed option is. So no player run by the app sees more than its seat or
   does more than its turn. It also takes the votes, one by one, where the app plays some of the seats, and what each
   player tells the table about its hand. */
import { believe, decideWhy, drawOdds, QUIET, REACT, temper } from './ai';
import { answerVeto, askVeto, canNominate, canTarget, canVeto, chancellorDiscard, DECK_F, DECK_L, endPower, execute, FASCISTS, HITLER_KNOWS_UPTO, HITLER_ZONE, investigate, nominate, partyOf, presidentDiscard, revealNext, SMALL_TABLE, specialElect, vote } from './game';
import { words } from './words';
import type { Ask, Event, Game, Gov, Law, Level, Party, Role, Seen, Talk, Trace, View } from './types';

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
      : what === 'pc' ? `${who} (presidente) disse que tirou ${fN(v, 3, words(g.pack).f, 'liberal')}.` : `${who} (chanceler) disse que recebeu ${fN(v, 2, words(g.pack).f, 'liberal')}.`;
    return set(i, what === 'pc' ? { pc: v } : { cc: v }, line);
  }
  if (what === 'inv') {
    const i = lastIndex(g, ['inv']), e = g.hist[i] as Extract<Event, { k: 'inv' }>;
    return set(i, { said: quiet ? '-' : v ? 'F' : 'L' }, quiet ? `${who} não disse o que viu na investigação.` : `${who} disse que ${g.players[e.target].name} é ${v ? words(g.pack).f : 'liberal'}.`);
  }
  const i = lastIndex(g, ['peek']);
  return set(i, { said: v }, quiet ? `${who} não disse o que espiou.` : `${who} disse que as próximas 3 leis são ${fN(v, 3, words(g.pack).f, 'liberal')}.`);
}

/* ---------- what the players run by the app say between rounds (D13) ---------- */
/** How many of them speak each round, at most. */
export const TALKS = 2;
/** What ends a round of talk: anything that happened at the table that is not talk. */
const roundMark = (g: Game): number => lastIndex(g, ['vote', 'rej', 'gov', 'veto', 'chaos', 'inv', 'peek', 'special', 'exec']);
/** Who speaks next, if anyone: once something happened, at the start of a round (before the president nominates),
 *  up to TALKS players run by the app, each once, in an order that turns with the rounds. */
export function talker(g: Game): number | null {
  if (g.phase !== 'nominate' || !g.hist.some(e => e.k === 'gov' || e.k === 'rej' || e.k === 'chaos' || e.k === 'veto')) return null;
  // what a person said (D26) does not take the turn of an app player
  const mark = roundMark(g), said = g.hist.slice(mark + 1).filter((e): e is Talk => e.k === 'talk' && isAi(g, e.by));
  if (said.length >= TALKS) return null;
  const n = g.players.length, start = (g.hist.filter(e => e.k === 'vote' || e.k === 'rej').length * 3) % n;
  for (let j = 0; j < n; j++) {
    const i = (start + j) % n;
    if (isAi(g, i) && g.players[i].alive && !said.some(t => t.by === i)) return i;
  }
  return null;
}
/** The options of a player who may speak: suspect or trust any other seat still in the game, or keep quiet. */
const talkOptions = (g: Game, me: number): number[] => [...g.players.flatMap((p, i) => (p.alive && i !== me ? [2 * i, 2 * i + 1] : [])), QUIET];
/** Plays what it said: a line in the log, and the talk in the history. */
export function talk(g: Game, by: number, a: number): Game {
  if (talker(g) !== by || !talkOptions(g, by).includes(a)) return g;
  const quiet = a === QUIET, about = quiet ? -1 : a >> 1, kind: Talk['say'] = quiet ? 'quiet' : a % 2 ? 'trust' : 'acc';
  const line = quiet ? [] : [`${g.players[by].name}: "${kind === 'acc' ? 'Desconfio de' : 'Confio em'} ${g.players[about].name}."`];
  return { ...g, log: [...g.log, ...line], hist: [...g.hist, { k: 'talk', by, about, say: kind }] };
}

/** What a person may tell the table now (D26), from the notebook: whether `by` may say this about `about`. A person
 *  still in the game, about someone else still in it, once a round for each one. */
export function canDenounce(g: Game, by: number, about: number): boolean {
  const p = g.players[by], q = g.players[about];
  if (!p || !q || p.ai || !p.alive || !q.alive || by === about || g.phase === 'over' || g.phase === 'reveal') return false;
  return !g.hist.slice(roundMark(g) + 1).some(e => e.k === 'talk' && e.by === by && e.about === about);
}
/** A person tells the table whom they suspect or trust (D26): a line in the log and a talk in the history, which the
 *  app players weigh like any other talk. Each app player still in the game, but the one talked about, says how it
 *  takes it (agrees, is unsure, disagrees), by its side, what it believes and its personality; the one talked about,
 *  if accused, denies it. The reactions go with the talk and in the log; they are words, nobody weighs them. */
export function denounce(g: Game, by: number, about: number, trust: boolean, rand: () => number): Game {
  if (!canDenounce(g, by, about)) return g;
  const said: Talk = { k: 'talk', by, about, say: trust ? 'trust' : 'acc' };
  const line = `${g.players[by].name}: "${trust ? 'Confio em' : 'Desconfio de'} ${g.players[about].name}."`;
  const heard: Game = { ...g, hist: [...g.hist, said] }, ts: Trace[] = [], re: [number, number][] = [];
  for (let i = 0; i < g.players.length; i++) {
    if (!isAi(g, i) || !g.players[i].alive || i === about) continue;
    const r = ask(heard, i, 'react', [REACT.agree, REACT.unsure, REACT.disagree], rand);
    ts.push(r.t); re.push([i, r.a]);
  }
  const verb = ['concorda', 'não sabe', 'discorda'];
  const lines = [line, ...(re.length ? [`Reações: ${re.map(([i, a]) => `${g.players[i].name} ${verb[a]}`).join(', ')}.`] : []), ...(!trust && isAi(g, about) ? [`${g.players[about].name}: "Não sou eu!"`] : [])];
  return { ...traced(g, ts), log: [...g.log, ...lines], hist: [...g.hist, { ...said, ...(re.length ? { re } : {}) }] };
}

/* ---------- the trainer, for the person (D13) ---------- */
export interface Coach {
  /** The chance of the hand the last president said they drew, counting the laws that could still come out. */
  odds: { who: number; said: number; p: number } | null;
  /** The last government's story does not hold together: one of the two lied (or a liberal law was thrown away). */
  clash: boolean;
  /** The last president passed one fascist and one liberal law though he says he drew 2 liberal ones: a chancellor test
   *  (D22), from a liberal testing or from someone hiding behind one. */
  test: boolean;
  /** Who looks most like the hidden side, by what this seat knows: the chance of each, highest first. */
  suspects: { seat: number; f: number; boss: number }[];
  /** How the table sees this seat, from what everyone saw: the chance it is on the hidden side. */
  seen: number;
}
/** What a careful player sitting at `seat` could work out from what that seat knows (its own view, nothing more). */
export function coach(g: Game, seat: number): Coach {
  const i = lastIndex(g, ['gov', 'veto']), e = g.hist[i] as Gov | undefined;
  let odds: Coach['odds'] = null, clash = false, test = false;
  if (e && e.pc !== undefined && e.pc >= 0) {
    const before = g.hist.slice(0, i), F = before.filter(x => (x.k === 'gov' || x.k === 'chaos') && x.law === 'F').length, L = before.filter(x => (x.k === 'gov' || x.k === 'chaos') && x.law === 'L').length;
    odds = { who: e.pres, said: e.pc, p: drawOdds(Math.max(0, DECK_F - F), Math.max(0, DECK_L - L))[e.pc] };
  }
  if (e && e.cc !== undefined && e.cc >= 0) {
    test = e.pc === 1 && e.cc === 1;
    clash = !test && ((e.pc !== undefined && e.pc >= 0 && Math.max(0, e.pc - 1) !== e.cc) || (e.law === 'F' && e.cc < 2));
  }
  const v = { ...viewOf(g, seat, 'vote', [1, 0]), level: 'extremo' as Level }, b = believe(v);
  const suspects = g.players.map((p, j) => ({ seat: j, f: b.pF[j], boss: b.pH[j], alive: p.alive }))
    .filter(x => x.seat !== seat && x.alive && v.known[x.seat] === null).sort((x, y) => y.f - x.f).slice(0, 3).map(({ seat: s, f, boss }) => ({ seat: s, f, boss }));
  return { odds, clash, test, suspects, seen: believe(v, true).pF[seat] };
}
/** At the end: how much each player run by the app that did not know `me` suspected them, from the start and after each
 *  law, investigation or elimination (the same reasoning those players used, from their own seats). */
export function thoughts(g: Game, me: number): { seat: number; series: number[] }[] {
  const marks = g.hist.map((e, i) => (e.k === 'gov' || e.k === 'veto' || e.k === 'chaos' || e.k === 'inv' || e.k === 'exec' ? i : -1)).filter(i => i >= 0);
  return g.players.map((p, seat) => ({ p, seat })).filter(({ p, seat }) => p.ai && seat !== me && viewOf(g, seat, 'vote', [1, 0]).known[me] === null)
    .map(({ seat }) => ({ seat, series: [-1, ...marks].map(i => believe(viewOf({ ...g, hist: g.hist.slice(0, i + 1) }, seat, 'vote', [1, 0])).pF[me]) }));
}

/** Live, during the game (D14): how much each player run by the app suspects `me` right now. One that knows the role
 *  of `me` (a fascist knows everyone) shows the reckoning it would make if it did not, from its own seat, as it would
 *  look to the table: showing its real answer (0 or 100%), or nothing, would give away who knows. */
export function suspicion(g: Game, me: number): { seat: number; f: number }[] {
  return g.players.map((p, seat) => ({ p, seat })).filter(({ p, seat }) => p.ai && p.alive && seat !== me).map(({ seat }) => {
    const v = viewOf(g, seat, 'vote', [1, 0]);
    const blind: View = v.known[me] === null ? v : { ...v, role: 'liberal', known: v.known.map((_, i) => (i === seat ? 'liberal' : null)) };
    return { seat, f: believe(blind).pF[me] };
  });
}

/** The moment that raised the suspicion on `me` the most (D15): the event (an index in the history: a law, a veto,
 *  the chaos, an investigation, an elimination) after which the average suspicion of the players run by the app rose
 *  the most, with that average before and after. 'end' asks the ones that did not know the role of `me` (the end
 *  summary); 'live' asks all of them, the ones that know reckoning as if they did not, as the live suspicion does, so
 *  nothing gives away who knows. Null when nothing raised it. */
export function crux(g: Game, me: number, mode: 'end' | 'live'): { at: number; before: number; after: number } | null {
  const marks = g.hist.map((e, i) => (e.k === 'gov' || e.k === 'veto' || e.k === 'chaos' || e.k === 'inv' || e.k === 'exec' ? i : -1)).filter(i => i >= 0);
  const askers = g.players.map((p, seat) => ({ p, seat })).filter(({ p, seat }) => p.ai && seat !== me && (mode === 'live' ? p.alive : viewOf(g, seat, 'vote', [1, 0]).known[me] === null)).map(x => x.seat);
  if (!marks.length || !askers.length) return null;
  const avg = (upto: number): number => askers.reduce((a, seat) => {
    const v = viewOf({ ...g, hist: g.hist.slice(0, upto + 1) }, seat, 'vote', [1, 0]);
    const blind: View = v.known[me] === null ? v : { ...v, role: 'liberal', known: v.known.map((_, i) => (i === seat ? 'liberal' : null)) };
    return a + believe(blind).pF[me];
  }, 0) / askers.length;
  let prev = avg(-1), top: { at: number; before: number; after: number } | null = null;
  for (const i of marks) {
    const now = avg(i);
    if (now - prev > 0.01 && (!top || now - prev > top.after - top.before)) top = { at: i, before: prev, after: now };
    prev = now;
  }
  return top;
}

/* ---------- the review of a person's plays, at the end (D19) ---------- */
/** One play of a person, judged at the end: good or bad, how much it weighed in the game, and why, in words with {pN}
 *  for the name of seat N and the theme's words. `at` is the index in the history. */
export interface Play { at: number; good: boolean; weight: number; text: string }
/** The plays of seat `me` that were clearly good or clearly bad (D19), judged two ways at once: by what came of them,
 *  now that every role is known, and by what that seat could have known then, reckoned as the extreme level would from
 *  that seat (its own role and team, its own hands and investigations, and what everyone saw). A play that went wrong
 *  without any way of knowing is not called bad; a lucky one is not praised much. Liberals are judged by laws and trust
 *  placed well; the hidden side by laws pushed through without the table catching on. */
export function review(g: Game, me: number): Play[] {
  const out: Play[] = [], P = (i: number): string => `{p${i}}`, pc = (x: number): string => `${Math.round(x * 100)}%`;
  const side = (i: number): Party => partyOf(g.players[i].role), lib = side(me) === 'L';
  const nF = (ls?: Law[]): number => (ls || []).filter(l => l === 'F').length;
  const hand = (n: number, of: number): string => (of === 3 ? ['3 liberais', '1 {f} e 2 liberais', '2 {fs} e 1 liberal', '3 {fs}'] : ['2 liberais', '1 {f} e 1 liberal', '2 {fs}'])[n] ?? '';
  const upTo = (n: number): Game => ({ ...g, hist: g.hist.slice(0, n) });
  const mind = (n: number) => believe({ ...viewOf(upTo(n), me, 'vote', [1, 0]), level: 'extremo' as Level });
  const seen = (n: number): number => believe({ ...viewOf(upTo(n), me, 'vote', [1, 0]), level: 'extremo' as Level }, true).pF[me];
  const alive = (n: number): number[] => g.players.map((_, i) => i).filter(i => !g.hist.slice(0, n).some(e => e.k === 'exec' && e.target === i));
  const lawsF = (n: number): number => g.hist.slice(0, n).filter(e => (e.k === 'gov' || e.k === 'chaos') && e.law === 'F').length;
  const add = (at: number, good: boolean, weight: number, text: string): void => { out.push({ at, good, weight, text }); };
  // who could have been nominated chancellor at that moment: alive, not the president, not barred by the last government
  const eligible = (n: number): number[] => {
    const h = g.hist.slice(0, n), last = [...h].reverse().find((e): e is Gov => e.k === 'gov' || e.k === 'veto'), chaos = h.map(e => e.k).lastIndexOf('chaos') > h.lastIndexOf(last as Event);
    const live = alive(n);
    return live.filter(i => i !== me && (!last || chaos || (i !== last.chanc && (live.length <= SMALL_TABLE || i !== last.pres))));
  };
  // the vote that elected or rejected this government: the one right before it, if votes were taken one by one
  const voteOf = (i: number): number => (g.hist[i - 1]?.k === 'vote' ? i - 1 : i);
  const nominated = (i: number, c: number, made: Law | undefined): void => {
    const at = voteOf(i), b = mind(at), opts = eligible(at), zone = lawsF(at) >= HITLER_ZONE;
    const score = (j: number): number => b.pF[j] + (zone ? 2 * b.pH[j] : 0), top = opts.reduce((a, j) => (score(j) < score(a) ? j : a), opts[0] ?? c);
    if (lib) {
      if (side(c) === 'F' && score(c) - score(top) >= 0.1) add(i, false, made === 'F' ? 2.5 : 2, `Você indicou ${P(c)}, que era {f}${made === 'F' ? ', e saiu lei {f}' : ''}. Com o que você sabia, ${P(c)} tinha ${pc(b.pF[c])} de chance de ser {f}; ${P(top)} era a opção mais limpa (${pc(b.pF[top])}).`);
      else if (side(c) === 'L' && made === 'L' && score(c) - score(top) < 0.05) add(i, true, 1, `Você indicou ${P(c)}, a opção mais limpa pelas contas (${pc(b.pF[c])}), e saiu lei liberal.`);
    } else if (side(c) === 'F' && made === 'F') add(i, true, 1, `Você indicou um aliado, ${P(c)}, e saiu lei {f}.`);
  };
  g.hist.forEach((e, i) => {
    if (e.k === 'vote' && e.ja !== undefined && alive(i).includes(me)) {
      const next = g.hist[i + 1], elected = next ? next.k !== 'rej' : g.phase === 'over', gov = [e.pres, e.chanc], dirty = gov.some(j => side(j) === 'F');
      const ja = e.ja.includes(me), lost = elected && !next && g.winner === 'F' && g.players[e.chanc].role === 'hitler' && lawsF(i) >= HITLER_ZONE;
      if (!lib) { if (lost && ja) add(i, true, 3, e.chanc === me ? `A mesa elegeu você, o {boss}, chanceler com ${HITLER_ZONE} leis {fs} na mesa: vitória.` : `Você votou {ja} no {boss}, ${P(e.chanc)}, para chanceler com ${HITLER_ZONE} leis {fs} na mesa: vitória.`); return; }
      if (gov.includes(me)) return;
      const b = mind(i), others = alive(i).filter(j => j !== me), f = others.reduce((a, j) => a + b.pF[j], 0) / Math.max(1, others.length);
      const risk = 1 - gov.reduce((a, j) => a * (1 - b.pF[j]), 1), base = 1 - (1 - f) ** 2, bad = gov.filter(j => side(j) === 'F');
      const who = `${bad.map(j => (g.players[j].role === 'hitler' ? `${P(j)} (o {boss})` : P(j))).join(' e ')} ${bad.length > 1 ? 'eram {fs}' : 'era {f}'}`;
      const law = next && next.k === 'gov' ? next.law : undefined;
      if (ja && dirty && elected && risk >= base + 0.03) add(i, false, lost ? 5 : law === 'F' ? 2 : 1.5, `Você votou {ja} em ${P(e.pres)} + ${P(e.chanc)}, e ${who}${lost ? ': o {boss} virou chanceler e os {fs} ganharam' : law === 'F' ? ', e saiu lei {f}' : ''}. Com o que você sabia, o risco desse governo era ${pc(risk)}, mais que o de um par qualquer (${pc(base)}).`);
      else if (!ja && lost) add(i, true, 1, `Você votou {nein} no {boss}, ${P(e.chanc)}, para chanceler, mas a mesa elegeu: ${e.ja.map(P).join(', ')} votaram {ja}.`);
      else if (!ja && dirty) add(i, true, elected ? 0.5 : 1, `Você votou {nein} em ${P(e.pres)} + ${P(e.chanc)}${elected ? '' : ', e o governo caiu'}: ${who}.`);
      else if (!ja && !dirty && !elected && risk < base - 0.03) add(i, false, 0.5, `Você votou {nein} em ${P(e.pres)} + ${P(e.chanc)}, dois liberais, e o governo caiu. Pelas contas o risco era baixo (${pc(risk)}, contra ${pc(base)} de um par qualquer).`);
      return;
    }
    if (e.k === 'gov' || e.k === 'veto') {
      const law = e.k === 'gov' ? e.law : undefined;
      if (e.pres === me) nominated(i, e.chanc, law);
      if (e.pres !== me && e.chanc !== me) return;
      const pres = e.pres === me, mate = pres ? e.chanc : e.pres;
      if (lib) {
        if (pres && e.drew && e.got) {
          if (e.drew.includes('L') && !e.got.includes('L')) add(i, false, 3, `Presidente com ${P(mate)}: você tirou ${hand(nF(e.drew), 3)} e passou ${hand(nF(e.got), 2)}, jogando fora a liberal.`);
          else if (nF(e.drew) === 1 && nF(e.got) === 1) {         // the chancellor test (D22): judged by what it cost and what it showed
            if (law === 'F') add(i, false, 2, `Você testou ${P(mate)} passando uma {f} e uma liberal, e ${P(mate)} aprovou a {f}: o teste mostrou um {f}, mas custou uma lei.`);
            else if (law === 'L') add(i, true, 0.5, `Você testou ${P(mate)} passando uma {f} e uma liberal, e ${P(mate)} aprovou a liberal${side(mate) === 'L' ? ': era liberal mesmo' : ', mas era {f} jogando limpo'}.`);
            if (e.pc !== undefined && e.pc >= 0 && e.pc !== 1) add(i, false, 1, `No teste, você não contou que tinha tirado 2 liberais: quem ouve acha que você é {f}. Teste se conta.`);
          }
          else if (e.drew.includes('F') && e.drew.includes('L')) add(i, true, 1, `Presidente com ${P(mate)}: você tirou ${hand(nF(e.drew), 3)} e jogou fora uma {f}.`);
          if (e.pc !== undefined && e.pc >= 0 && e.pc !== nF(e.drew) && !(nF(e.drew) === 1 && nF(e.got) === 1)) add(i, false, 1.5, `Você disse que tirou ${hand(e.pc, 3)}, mas tirou ${hand(nF(e.drew), 3)}. Liberal que mente confunde a mesa e vira suspeito.`);
        }
        if (!pres && e.got) {
          if (law === 'F' && e.got.includes('L')) add(i, false, 3, `Chanceler de ${P(mate)}: você recebeu ${hand(nF(e.got), 2)} e aprovou a {f}.`);
          else if (law === 'L' && e.got.includes('F')) add(i, true, 1, `Chanceler de ${P(mate)}: você recebeu ${hand(nF(e.got), 2)} e aprovou a liberal.`);
          else if (e.k === 'veto') add(i, !e.got.includes('L'), e.got.includes('L') ? 2 : 1, e.got.includes('L') ? `Você vetou e jogou fora uma liberal (recebeu ${hand(nF(e.got), 2)}).` : `Você recebeu 2 {fs} e conseguiu o veto: nenhuma lei {f}.`);
          if (e.cc !== undefined && e.cc >= 0 && e.cc !== nF(e.got)) add(i, false, 1.5, `Você disse que recebeu ${hand(e.cc, 2)}, mas recebeu ${hand(nF(e.got), 2)}. Liberal que mente confunde a mesa e vira suspeito.`);
        }
        return;
      }
      // the hidden side: a law pushed through is good, unless the table caught on
      const before = seen(voteOf(i)), after = seen(i + 1), up = after - before;
      const couldF = (pres ? e.drew : e.got)?.includes('F');
      if (law === 'F') {
        if (up >= 0.15) add(i, false, 2, `Saiu lei {f} do seu governo com ${P(mate)}, mas a mesa percebeu: a chance de você ser {f}, pelo que todos viram, subiu (${pc(before)} → ${pc(after)}).`);
        else add(i, true, 1.5, `Saiu lei {f} do seu governo com ${P(mate)}, e a mesa quase não desconfiou mais de você (${pc(before)} → ${pc(after)}).`);
      } else if (law === 'L' && couldF) {
        if (up <= -0.1) add(i, true, 1, `Você deixou passar uma liberal com ${P(mate)} e limpou a sua barra (${pc(before)} → ${pc(after)}).`);
        else add(i, false, 1, `Você deixou passar uma liberal com ${P(mate)} sem ganhar confiança (${pc(before)} → ${pc(after)}).`);
      }
      const mine = pres ? e.pc : e.cc, truth = nF(pres ? e.drew : e.got);
      if (pres && law === 'L' && nF(e.drew) === 1 && nF(e.got) === 1 && e.pc === 1) add(i, true, 0.5, `Você passou uma {f} e uma liberal e contou a verdade, como num teste: ${P(mate)} aprovou a liberal e a sua história fecha.`);
      if (e.pc !== undefined && e.cc !== undefined && e.pc >= 0 && e.cc >= 0 && Math.max(0, e.pc - 1) !== e.cc && !(e.pc === 1 && e.cc === 1) && mine !== truth) add(i, false, 1.5, `A sua história não fechou com a de ${P(mate)}: o presidente disse ${hand(e.pc, 3)} e o chanceler disse ${hand(e.cc, 2)}. Quem ouviu soube que alguém mentiu.`);
      return;
    }
    if (e.k === 'inv' && e.by === me) {
      const t = e.target, said = e.said && e.said !== '-' ? e.said : null;
      if (lib) {
        const b = mind(i), done = g.hist.slice(0, i).filter((x): x is Extract<Event, { k: 'inv' }> => x.k === 'inv').map(x => x.target);
        const opts = alive(i).filter(j => j !== me && !done.includes(j)), doubt = (j: number): number => b.pF[j] * (1 - b.pF[j]);
        const alt = opts.reduce((a, j) => (doubt(j) > doubt(a) ? j : a), opts[0] ?? t);
        if (side(t) === 'F') add(i, true, 2, `Você investigou ${P(t)} e achou um {f}.`);
        else if ((b.pF[t] < 0.15 || b.pF[t] > 0.85) && alt !== t) add(i, false, 1, `Você investigou ${P(t)}, de quem já dava para ter quase certeza (${pc(b.pF[t])} de ser {f}). ${P(alt)} era a maior dúvida (${pc(b.pF[alt])}).`);
        if (said && said !== e.party) add(i, false, 1.5, `Você disse que ${P(t)} é ${said === 'L' ? 'liberal' : '{f}'}, mas viu ${e.party === 'L' ? 'liberal' : '{f}'}. Liberal que mente confunde a mesa.`);
      } else if (said && side(t) === 'F' && said === 'L') add(i, true, 1, `Você investigou um aliado, ${P(t)}, e disse que é liberal: cobriu o time.`);
      else if (said && side(t) === 'L' && said === 'F') add(i, true, 1, `Você investigou ${P(t)}, liberal, e disse que é {f}: jogou a desconfiança nele.`);
      else if (said && side(t) === 'F' && said === 'F') add(i, false, 2, `Você entregou um aliado: disse que ${P(t)} é {f}.`);
      return;
    }
    if (e.k === 'exec' && e.by === me) {
      const t = e.target, role = g.players[t].role;
      if (lib && side(t) === 'F') add(i, true, role === 'hitler' ? 5 : 3, role === 'hitler' ? `Você eliminou o {boss}, ${P(t)}: vitória.` : `Você eliminou ${P(t)}, que era {f}.`);
      else if (lib) {
        const b = mind(i), opts = alive(i).filter(j => j !== me), top = opts.reduce((a, j) => (b.pF[j] > b.pF[a] ? j : a), opts[0] ?? t);
        if (b.pF[top] - b.pF[t] >= 0.1) add(i, false, 3, `Você eliminou ${P(t)}, que era liberal: o seu lado perdeu um voto. Com o que você sabia, ${P(t)} tinha ${pc(b.pF[t])} de chance de ser {f}, e ${P(top)} tinha ${pc(b.pF[top])}.`);
      }
      else add(i, side(t) === 'L', side(t) === 'L' ? 2 : 3, side(t) === 'L' ? `Você eliminou ${P(t)}, um liberal.` : `Você eliminou ${P(t)}, que era do seu time.`);
      return;
    }
    if (e.k === 'special' && e.by === me) {
      const t = e.target;
      if (lib && side(t) === 'L') add(i, true, 1, `Na eleição especial, você deu a presidência a ${P(t)}, um liberal.`);
      else if (lib) {
        const b = mind(i), opts = alive(i).filter(j => j !== me), top = opts.reduce((a, j) => (b.pF[j] < b.pF[a] ? j : a), opts[0] ?? t);
        if (b.pF[t] - b.pF[top] >= 0.1) add(i, false, 2, `Na eleição especial, você deu a presidência a ${P(t)}, que era {f}. Com o que você sabia, ${P(t)} tinha ${pc(b.pF[t])} de chance de ser {f}; ${P(top)} tinha ${pc(b.pF[top])}.`);
      }
      else if (side(t) === 'F') add(i, true, 1, `Na eleição especial, você deu a presidência a um aliado, ${P(t)}.`);
    }
  });
  // the hidden leader elected chancellor at the end, nominated by this seat
  if (g.phase === 'over' && g.winner === 'F' && g.chanc !== null && g.pres === me && g.players[g.chanc].role === 'hitler' && g.why.includes('eleito chanceler')) {
    const at = g.hist.length - 1;
    if (lib) add(at, false, 5, `Você indicou ${P(g.chanc)} para chanceler com ${HITLER_ZONE} leis {fs} na mesa. Era o {boss}, e os {fs} ganharam.`);
    else add(at, true, 3, `Você indicou o {boss}, ${P(g.chanc)}, para chanceler com ${HITLER_ZONE} leis {fs} na mesa, e a mesa elegeu: vitória.`);
  }
  return out;
}

/* ---------- the votes, where the app plays some seats ---------- */
/** Everyone alive votes: the people with `votes` (seat → Ja!), the players run by the app by themselves. The votes are
 *  recorded for all to see, and more Ja! than Nein! elects. Missing a person's vote, nothing happens. */
export function castVotes(g: Game, votes: Record<number, boolean>, rand: () => number): Game {
  if (g.phase !== 'vote' || g.chanc === null) return g;
  const alive = seats(g, i => g.players[i].alive);
  if (alive.some(i => !isAi(g, i) && typeof votes[i] !== 'boolean')) return g;
  const ts: Trace[] = [];
  const ja = alive.filter(i => { if (!isAi(g, i)) return votes[i]; const r = ask(g, i, 'vote', [1, 0], rand); ts.push(r.t); return r.a === 1; });
  const nein = alive.filter(i => !ja.includes(i)), list = (xs: number[]): string => xs.map(i => g.players[i].name).join(', ') || 'ninguém';
  const n: Game = { ...traced(g, ts), log: [...g.log, `Votos. ${words(g.pack).ja}: ${list(ja)}. ${words(g.pack).nein}: ${list(nein)}.`], hist: [...g.hist, { k: 'vote', pres: g.pres, chanc: g.chanc, ja }] };
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
    me, role, level: (g.players[me].level || g.level || 'medio') as Level, mood: temper(g.players[me].mood ?? 0, g.players[me].persona), persona: g.players[me].persona || 'centrado', n: g.players.length, alive: g.players.map(p => p.alive), known, fascists: FASCISTS[g.players.length],
    laws: { ...g.laws }, tracker: g.tracker, pres: g.pres, chanc: g.chanc, lastPres: g.lastPres, lastChanc: g.lastChanc,
    ask: q, options: [...options], hand, hist: g.hist.map(e => seenBy(e, me))
  };
}
/** Asks one seat one question, through its view; an answer outside the options is taken as the first option. Comes
 *  back with the answer and the record of it, with the reason the seat gave (D16). */
function ask(g: Game, seat: number, q: Ask, options: number[], rand: () => number): { a: number; t: Trace } {
  const v = viewOf(g, seat, q, options), d = decideWhy(v, rand), a = options.includes(d.a) ? d.a : options[0];
  return { a, t: { seat, ask: q, a, at: g.hist.length, ...(v.hand.length ? { hand: v.hand } : {}), why: d.why } };
}
/** The game with these decisions added to the record of them. */
const traced = (g: Game, ts: Trace[]): Game => (ts.length ? { ...g, trace: [...(g.trace ?? []), ...ts] } : g);

/** What one player run by the app believed of everyone (D16), from the start and after each law, veto, chaos,
 *  investigation, peek or elimination: the chance of each seat being on the hidden side (f) and of being its leader (h),
 *  reckoned from its own seat with what it knew then. `at` is the index in the history (-1, the start). */
export function trail(g: Game, seat: number): { at: number; f: number[]; h: number[] }[] {
  const marks = g.hist.map((e, i) => (e.k === 'gov' || e.k === 'veto' || e.k === 'chaos' || e.k === 'inv' || e.k === 'peek' || e.k === 'exec' ? i : -1)).filter(i => i >= 0);
  return [-1, ...marks].map(at => { const b = believe(viewOf({ ...g, hist: g.hist.slice(0, at + 1) }, seat, 'vote', [1, 0])); return { at, f: b.pF, h: b.pH }; });
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
  const who = talker(g);
  if (who !== null) return { seat: who, ask: 'talk', options: talkOptions(g, who) };
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
  const r = ask(g, t.seat, t.ask, t.options, rand), a = r.a;
  g = traced(g, [r.t]);
  switch (t.ask) {
    case 'pc': case 'cc': case 'inv': case 'peek': return say(g, t.seat, t.ask, a);
    case 'talk': return talk(g, t.seat, a);
    case 'nominate': return nominate(g, a);
    case 'pdiscard': return presidentDiscard(g, a);
    case 'cdiscard': return a === 2 ? askVeto(g) : chancellorDiscard(g, a, rand);
    case 'veto': return answerVeto(g, a === 1, rand);
    case 'investigate': return investigate(g, a);
    case 'special': return specialElect(g, a);
    default: return execute(g, a);
  }
}

/* The players run by the app (D10). Pure, and blind on purpose: every function here gets a View, what one seat could
   know sitting at the table, built by the judge (judge.ts), and answers the one question the judge asked with one of
   the options it offered. Nothing here can see the game itself, so no player run by the app can know more than its
   seat, or do more than it was asked.

   How they think: each one weighs every way the roles could be dealt that fits what it knows ("worlds"), by how well
   each world explains what happened: the laws each government made, what its president and chancellor said they got,
   what investigations were said to show. A liberal then picks governments, votes and targets by those odds. The level
   changes how careful it is, how much it remembers, how much it believes what it hears, and whether it counts the laws
   still in the deck. A fascist knows its team and plays for it, lying about its hand when the truth would give it away;
   Hitler, when he does not know his team, plays like a liberal so he can be elected later. */
import { DECK_F, DECK_L, HITLER_KNOWS_UPTO, HITLER_ZONE, TRACKER_MAX } from './game';
import type { Law, Level, Party, Role, Seen, View, Why } from './types';

/** What each level does differently:
 *  - noise: how often it picks someone or votes without thinking (a random option);
 *  - slip: how often it plays a law from its hand without thinking;
 *  - memory: how many of the last governments, investigations and eliminations it remembers (what it saw itself it
 *    never forgets);
 *  - lie: how often it thinks a fascist lies about a hand or an investigation (0: it believes everything it hears);
 *  - count: whether it counts the laws still in the deck to tell how likely a hand is;
 *  - act: how often, as a fascist, it lies when the truth would give it away;
 *  - trust: how often, as a fascist, it lets a liberal law through to look clean;
 *  - wary: the chance that the nominated chancellor is Hitler above which it votes Nein, from HITLER_ZONE fascist laws;
 *  - plan: as a fascist, plays for the long game: makes Hitler look clean before HITLER_ZONE (puts him in governments
 *    that pass liberal laws) and eliminates the liberals who caught a teammate lying;
 *  - image: as a fascist with a hand to play, how much looking suspicious to the table costs, against a fascist law
 *    worth 1 (0: it does not think about it). It works out how the table would see each way to play the hand, with the
 *    same reasoning the table uses;
 *  - test: as a liberal president with 1 fascist and 2 liberal laws, how often it tests a chancellor it is unsure of by
 *    passing the fascist one with a liberal one (D21), and says so: the chancellor shows its side by what it enacts. */
export interface Knobs { noise: number; memory: number; lie: number; count: boolean; act: number; trust: number; wary: number; plan: boolean; image: number; slip: number; test: number }
export const AI: Record<Level, Knobs> = {
  facil: { noise: 0.3, slip: 0.1, memory: 5, lie: 0.1, count: false, act: 0.4, trust: 0, wary: 0.5, plan: false, image: 0, test: 0 },
  medio: { noise: 0.1, slip: 0.1, memory: 6, lie: 0.3, count: false, act: 0.6, trust: 0.1, wary: 0.3, plan: false, image: 0, test: 0 },
  dificil: { noise: 0.03, slip: 0.03, memory: 99, lie: 0.35, count: false, act: 0.9, trust: 0.15, wary: 0.2, plan: true, image: 1, test: 0.3 },
  extremo: { noise: 0.02, slip: 0.02, memory: 99, lie: 0.4, count: true, act: 0.95, trust: 0.15, wary: 0.15, plan: true, image: 1, test: 0.3 }
};
/** The answer to 'talk' that means keeping quiet (D13). */
export const QUIET = 1000;
/** How far the temper of a player (View.mood, -1 to 1) moves the risk it accepts in a government. */
export const MOOD = 0.2;
/** How often a liberal thinks a fascist lets a liberal law through on purpose (the same at every level). */
const TRUST_GUESS = 0.15;
/** The chancellor test (D21), as everyone reckons it, at every level: how often a liberal president with 1 fascist and
 *  2 liberal laws passes the fascist one on, to see what the chancellor enacts. A liberal who tests says so (its claim
 *  is the truth), so "I drew 2 liberals and passed you one of each" raises suspicion without proving anything. A
 *  fascist can hide behind it too, by telling the truth where it could have lied: that is in the lie rate already,
 *  since a fascist who does not lie tells the truth. */
export const TEST_GUESS = 0.15;
/** What the levels that read the long game (`plan`, D21) know the hidden leader does: before HITLER_ZONE fascist laws
 *  he lets liberal laws through to look clean, and his team hands him liberal laws to pass; this is how often. The
 *  levels below take him for any other fascist (TRUST_GUESS). */
export const BOSS_CLEAN = 0.6;
/** What the extreme level reads in the votes (D21): a fascist who knows the government has a teammate in it votes Ja
 *  this often; anyone else votes Ja about this often, whatever their side. */
export const ALLY_JA = 0.8, ANY_JA = 0.6;
/** How often anyone, liberal or not, plays a law against its own side by mistake (a wrong tap): no single play is
 *  ever taken as proof (D21). */
export const SLIP_GUESS = 0.03;

const fasc = (r: Role): boolean => r !== 'liberal';
const nF = (laws: Law[]): number => laws.filter(l => l === 'F').length;
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
/** The odds of drawing 0, 1, 2 or 3 fascist laws out of f fascist and l liberal. */
export function drawOdds(f: number, l: number): number[] {
  const all = choose(f + l, 3);
  return all ? [0, 1, 2, 3].map(d => (choose(f, d) * choose(l, 3 - d)) / all) : [0.25, 0.25, 0.25, 0.25];
}

/* ---------- what a fascist would say, and what a liberal believes a fascist does ---------- */
/** The president's story that makes the laws he passed look forced: with m fascist laws passed, he says he drew m + 1
 *  (all 3 when a fascist law came out of it); having passed none, he tells the truth. */
export const presStory = (d: number, m: number, law: Law | undefined): number => (m === 0 ? d : Math.min(3, Math.max(m + 1, law === 'F' ? 3 : 0)));
/** The chancellor's story: a fascist law came out, so both were fascist. */
export const chancStory = (m: number, law: Law | undefined): number => (law === 'F' ? 2 : m);

/** The fascist laws a president passes on with d drawn: a liberal throws a fascist one away when he can; a fascist
 *  keeps them, now and then letting a liberal one through. */
function passOdds(d: number, fascist: boolean, trust: number, test: number): [number, number][] {
  const lo = Math.max(0, d - 1), hi = Math.min(2, d);
  if (lo === hi) return [[lo, 1]];
  if (fascist) return [[hi, 1 - trust], [lo, trust]];
  const off = d === 1 ? test : SLIP_GUESS;                                  // one of each from 1F 2L: a test (D21); two F from 2F 1L: a slip
  return [[lo, 1 - off], [hi, off]];
}
/** How likely this law comes out of a hand with m fascist laws. */
function lawOdds(m: number, fascist: boolean, law: Law | undefined, trust: number): number {
  if (m === 0) return law === 'L' ? 1 : 0;
  if (m === 2) return law === 'F' ? 1 : 0;
  return !fascist ? (law === 'L' ? 1 - SLIP_GUESS : SLIP_GUESS) : law === 'F' ? 1 - trust : trust;
}
/** How likely a chancellor asks to veto (and it goes through) with m fascist laws in hand. */
const vetoOdds = (m: number, fascist: boolean): number => (fascist ? (m === 0 ? 0.8 : 0.05) : m === 2 ? 0.8 : 0.02);
/** How likely someone says `said` when the truth is `truth` and the story is `story`. */
function sayOdds(said: number | undefined, truth: number, story: number, fascist: boolean, lie: number): number {
  if (said === undefined || said < 0) return 1;
  if (!fascist) return said === truth ? 1 - SLIP_GUESS : SLIP_GUESS / 3;    // a liberal tells the truth, but a wrong tap is never proof
  if (story === truth) return said === truth ? 1 : 0;
  return (said === truth ? 1 - lie : 0) + (said === story ? lie : 0);
}

/** How well one government (or veto) is explained by who was fascist in it. */
/** `tp` and `tc`: how often the president and the chancellor, if fascist, let a liberal law through in this world. */
function govOdds(e: Extract<Seen, { k: 'gov' | 'veto' }>, fp: boolean, fc: boolean, pd: number[], lie: number, knownD: number | null, tp = TRUST_GUESS, tc = TRUST_GUESS, test = TEST_GUESS): number {
  const D = e.drew && e.drew.length ? [nF(e.drew)] : knownD !== null ? [knownD] : [0, 1, 2, 3];
  const got = e.got && e.got.length ? nF(e.got) : null, law = e.k === 'veto' ? undefined : e.law;
  let sum = 0;
  for (const d of D) {
    const p = D.length === 1 ? 1 : pd[d];
    if (!p) continue;
    for (const [m, pm] of passOdds(d, fp, tp, test)) {
      if (got !== null && m !== got) continue;
      const out = e.k === 'veto' ? vetoOdds(m, fc) : lawOdds(m, fc, law, tc);
      if (!out) continue;
      sum += p * pm * out * sayOdds(e.pc, d, presStory(d, m, law), fp, lie) * sayOdds(e.cc, m, chancStory(m, law), fc, lie);
    }
  }
  return sum;
}

/* ---------- worlds ---------- */
export interface Beliefs { worlds: { roles: Role[]; w: number }[]; pF: number[]; pH: number[] }

/** Every way the roles could be, given what this seat knows (or, `outside`, given nothing but what everyone saw: how
 *  the table sees things, which a fascist needs to know how suspicious its team looks). */
function worlds(v: View, outside: boolean): Role[][] {
  const known = outside ? v.known.map(() => null) : v.known;
  const free = known.map((r, i) => (r === null ? i : -1)).filter(i => i >= 0);
  const need = v.fascists - known.filter(r => r !== null && fasc(r)).length, hitlerKnown = known.includes('hitler');
  const out: Role[][] = [];
  const pick = (from: number, chosen: number[]): void => {
    if (chosen.length === need) {
      const base: Role[] = known.map(r => r || 'liberal');
      if (hitlerKnown) out.push(base.map((r, i) => (chosen.includes(i) ? 'fascista' : r)));
      else for (const h of chosen) out.push(base.map((r, i) => (i === h ? 'hitler' : chosen.includes(i) ? 'fascista' : r)));
      return;
    }
    for (let j = from; j <= free.length - (need - chosen.length); j++) pick(j + 1, [...chosen, free[j]]);
  };
  if (need >= 0 && need <= free.length) pick(0, []);
  return out.length ? out : [known.map(r => r || 'liberal')];
}

/** The weight of every world after what happened, and from them the chance that each seat is a fascist (Hitler
 *  included) and that it is Hitler. */
export function believe(v: View, outside = false): Beliefs {
  const k = AI[v.level], mine = (by: number): boolean => !outside && by === v.me;
  const remember = (() => {
    const idx = v.hist.map((e, i) => (e.k === 'gov' || e.k === 'veto' || e.k === 'inv' || e.k === 'exec' ? i : -1)).filter(i => i >= 0);
    return idx.length > k.memory ? idx[idx.length - k.memory] : 0;
  })();
  const ws = worlds(v, outside).map(roles => {
    let w = 1, L = 0, F = 0, knownD: number | null = null;
    const gone = new Set<number>(), knowsTeam = (j: number): boolean => roles[j] === 'fascista' || (roles[j] === 'hitler' && v.n <= HITLER_KNOWS_UPTO);
    v.hist.forEach((e, i) => {
      const fresh = i >= remember;
      if (e.k === 'vote' && k.count && fresh) {
        // the extreme level reads the votes: a fascist votes Ja for a government with a teammate in it
        const team = fasc(roles[e.pres]) || fasc(roles[e.chanc]);
        for (let j = 0; j < v.n; j++) {
          if (gone.has(j) || j === e.pres || j === e.chanc || mine(j)) continue;
          const ja = e.ja.includes(j), p = knowsTeam(j) && team ? ALLY_JA : ANY_JA;
          w *= ja ? p : 1 - p;
        }
        return;
      }
      if (e.k === 'gov' || e.k === 'veto') {
        const own = mine(e.pres) || mine(e.chanc);
        if (fresh || own) {
          const pd = k.count ? drawOdds(Math.max(0, DECK_F - F), Math.max(0, DECK_L - L)) : drawOdds(DECK_F, DECK_L);
          const ev = outside ? { ...e, drew: undefined, got: undefined } : e;
          // the levels that read the long game know the hidden leader keeps clean early, helped by his team (D21)
          const early = k.plan && F < HITLER_ZONE, boss = (j: number): boolean => roles[j] === 'hitler';
          const tp = early && (boss(e.pres) || (fasc(roles[e.pres]) && boss(e.chanc))) ? BOSS_CLEAN : TRUST_GUESS, tc = early && boss(e.chanc) ? BOSS_CLEAN : TRUST_GUESS;
          const p = govOdds(ev, fasc(roles[e.pres]), fasc(roles[e.chanc]), pd, k.lie, k.count || k.plan ? knownD : null, tp, tc, k.plan ? TEST_GUESS : TEST_GUESS / 2);
          w *= own ? p : 0.03 + 0.97 * p;
          if (F >= HITLER_ZONE && roles[e.chanc] === 'hitler') w *= 0.001;   // Hitler elected there would have won
        }
        knownD = null;
        if (e.law) e.law === 'F' ? F++ : L++;
      } else if (e.k === 'chaos') {
        knownD = null;
        e.law === 'F' ? F++ : L++;
      } else if (e.k === 'peek') {
        if (mine(e.by) && e.saw) knownD = nF(e.saw);
        // what someone else says the next 3 laws are: the truth if they are liberal, which the next president's story
        // then has to match (the levels that read the long game check it)
        else if (k.plan && e.said !== undefined && e.said >= 0 && !fasc(roles[e.by])) knownD = e.said;
      } else if (e.k === 'inv') {
        if (mine(e.by) && e.party) w *= (fasc(roles[e.target]) ? 'F' : 'L') === e.party ? 1 : 0;
        else if (fresh && e.said && e.said !== '-') {
          const truth: Party = fasc(roles[e.target]) ? 'F' : 'L';
          const p = !fasc(roles[e.by]) ? (e.said === truth ? 1 : 0)
            : truth === 'F' ? (e.said === 'L' ? k.lie : 1 - k.lie) : e.said === 'F' ? k.lie / 2 : 1 - k.lie / 2;
          w *= 0.03 + 0.97 * p;
        }
      } else if (e.k === 'exec') {
        gone.add(e.target);
        if (fresh && roles[e.target] === 'hitler') w *= 0.001;                 // the game went on
        // the levels that read the long game: a fascist who knows its team hardly ever eliminates a teammate
        if (fresh && k.plan && !mine(e.by) && knowsTeam(e.by) && fasc(roles[e.target])) w *= 0.15;
      } else if (e.k === 'special' && fresh && k.plan && !mine(e.by) && knowsTeam(e.by) && !fasc(roles[e.target])) {
        w *= 0.5;                                                              // and hands the presidency to a teammate when it can
      }
    });
    return { roles, w };
  });
  let total = ws.reduce((a, x) => a + x.w, 0);
  if (!(total > 0)) { ws.forEach(x => { x.w = 1; }); total = ws.length; }
  ws.forEach(x => { x.w /= total; });
  const pF = Array.from({ length: v.n }, (_, i) => ws.reduce((a, x) => a + (fasc(x.roles[i]) ? x.w : 0), 0));
  const pH = Array.from({ length: v.n }, (_, i) => ws.reduce((a, x) => a + (x.roles[i] === 'hitler' ? x.w : 0), 0));
  return { worlds: ws, pF, pH };
}
/** The chance that at least one of these seats is a fascist. */
export const risk = (b: Beliefs, seats: number[]): number => b.worlds.reduce((a, x) => a + (seats.some(i => fasc(x.roles[i])) ? x.w : 0), 0);

/* ---------- explaining (D16) ----------
   While a decision is made, what weighed in it is written down: the sentences and the options compared. Writing it
   down never changes the decision; outside decideWhy nothing is written. */
let ex: Why | null = null;
const P = (i: number): string => `{p${i}}`;
const pc = (x: number): string => `${Math.round(x * 100)}%`;
const why = (line: string): void => { if (ex) ex.text.push(line); };
const rows = (b: Beliefs, seats: number[], score?: (i: number) => number): void => {
  if (ex) ex.rows = seats.map(i => ({ seat: i, f: b.pF[i], h: b.pH[i], ...(score ? { v: score(i) } : {}) }));
};
const nmF = (n: number, of: number): string => (of === 3 ? ['3 liberais', '1 {f} e 2 liberais', '2 {fs} e 1 liberal', '3 {fs}'] : ['2 liberais', '1 {f} e 1 liberal', '2 {fs}'])[n] ?? `${n}`;

/* ---------- deciding ---------- */
/** The option with the lowest score; ties go to chance. */
function best(options: number[], score: (i: number) => number, rand: () => number): number {
  let top: number[] = [], low = Infinity;
  for (const i of options) {
    const s = score(i);
    if (s < low - 1e-9) { low = s; top = [i]; } else if (Math.abs(s - low) <= 1e-9) top.push(i);
  }
  return top[Math.floor(rand() * top.length)] ?? options[0];
}
/** Whether a liberal (or someone playing like one) votes Ja on this government, by these beliefs. */
function liberalJa(v: View, b: Beliefs): boolean {
  const k = AI[v.level], gov = [v.pres, v.chanc as number];
  const others = v.alive.map((a, i) => (a && i !== v.me ? i : -1)).filter(i => i >= 0);
  let base = 0, pairs = 0;
  for (let x = 0; x < others.length; x++) for (let y = x + 1; y < others.length; y++) { base += risk(b, [others[x], others[y]]); pairs++; }
  base = pairs ? base / pairs : 1;
  // the temper of this player: the wary one wants a government clearly cleaner than most, the trusting one goes along
  // never below zero: even the most wary one accepts a government no riskier than any other pair (D21)
  const slack = Math.max(0, 0.05 + MOOD * v.mood) + (v.tracker === TRACKER_MAX - 1 ? 0.2 : 0);
  rows(b, gov.filter(i => i !== v.me));
  if (v.laws.F >= HITLER_ZONE && b.pH[gov[1]] > k.wary) {
    why(`Já há ${HITLER_ZONE} leis {fs}: eleger o {boss} chanceler perde o jogo. A chance de ${P(gov[1])} ser o {boss} é ${pc(b.pH[gov[1]])}, acima do limite do nível (${pc(k.wary)}): {nein}`);
    return false;
  }
  const r = risk(b, gov.filter(i => i !== v.me)), ok = r <= base + slack;
  why(`Chance de ter alguém do lado escondido neste governo: ${pc(r)}. Num par qualquer da mesa: ${pc(base)}. Aceita até ${pc(base + slack)} (folga de 5%, ${v.mood >= 0 ? '+' : ''}${pc(MOOD * v.mood)} do temperamento${0.05 + MOOD * v.mood < 0 ? ', nunca abaixo de zero' : ''}${v.tracker === TRACKER_MAX - 1 ? ', +20% porque mais uma rejeição traz o caos' : ''}): ${ok ? '{ja}' : '{nein}'}`);
  return ok;
}

/** The last government (or investigation, or spying) this seat was part of, for what it says about it. */
function lastOwn<K extends Seen['k']>(v: View, kinds: K[], who: (e: Extract<Seen, { k: K }>) => boolean): Extract<Seen, { k: K }> | undefined {
  for (let i = v.hist.length - 1; i >= 0; i--) {
    const e = v.hist[i];
    if ((kinds as string[]).includes(e.k) && who(e as Extract<Seen, { k: K }>)) return e as Extract<Seen, { k: K }>;
  }
  return undefined;
}

/** The answer of this player to the question in its view: always one of `v.options`. */
export function decide(v: View, rand: () => number): number {
  return decideWhy(v, rand).a;
}
/** The same answer, with why it was given (D16). The decision is the same as decide's, draw for draw. */
export function decideWhy(v: View, rand: () => number): { a: number; why: Why } {
  ex = { text: [] };
  try {
    const a = decideIn(v, rand);
    return { a, why: ex };
  } finally { ex = null; }
}
function decideIn(v: View, rand: () => number): number {
  const k = AI[v.level], o = v.options;
  if (!o.length) return -1;
  if (v.ask === 'talk') return speak(v, rand);
  const talk = v.ask === 'pc' || v.ask === 'cc' || v.ask === 'inv' || v.ask === 'peek';
  const hand = v.ask === 'pdiscard' || v.ask === 'cdiscard' || v.ask === 'veto';
  if (!talk && rand() < (hand ? k.slip : k.noise)) { why(`Decidiu sem pensar: o nível erra ${pc(hand ? k.slip : k.noise)} das vezes ${hand ? 'na lei que descarta' : 'em quem escolhe e como vota'}.`); return o[Math.floor(rand() * o.length)]; }
  const team = fasc(v.role), all = team && v.known.every(r => r !== null);
  const allies = all ? v.known.map((r, i) => (r && fasc(r) && i !== v.me ? i : -1)).filter(i => i >= 0) : [];
  const hitler = v.known.indexOf('hitler');
  const ans = all ? fascist(v, rand, allies, hitler) : v.role === 'hitler' ? hidden(v, rand) : liberal(v, rand);
  return o.includes(ans) ? ans : o[0];
}

/** What a player says between rounds (D13). A liberal (and Hitler, who plays like one) says what it believes: whom it
 *  suspects most, or, if nobody stands out, whom it trusts. A fascist piles on the liberal the table already doubts, or
 *  vouches for a teammate. The easy level talks less. */
function speak(v: View, rand: () => number): number {
  const k = AI[v.level], o = v.options, others = v.alive.map((a, i) => (a && i !== v.me ? i : -1)).filter(i => i >= 0);
  if (!others.length || rand() < (v.level === 'facil' ? 0.5 : 0.15)) { why('Ficou calada desta vez.'); return QUIET; }
  const base = v.fascists / Math.max(1, v.n - 1), all = fasc(v.role) && v.known.every(r => r !== null);
  const pick = (i: number, trust: boolean): number => { const a = 2 * i + (trust ? 1 : 0); return o.includes(a) ? a : QUIET; };
  if (all) {
    const pub = believe(v, true), libs = others.filter(i => v.known[i] === 'liberal'), mates = others.filter(i => v.known[i] !== 'liberal');
    const target = best(libs, i => -pub.pF[i], rand);
    rows(pub, others);
    if (libs.length && (pub.pF[target] >= base || rand() < k.act * 0.5)) { why(`É do lado escondido e sabe quem é liberal. Engrossou a desconfiança sobre ${P(target)}, o liberal de quem a mesa mais desconfia (${pc(pub.pF[target])}, pelo que todos viram).`); return pick(target, false); }
    if (mates.length && rand() < 0.5) { const m = best(mates, i => pub.pF[i], rand); why(`É do lado escondido: abonou ${P(m)}, um aliado.`); return pick(m, true); }
    why('É do lado escondido e preferiu não chamar atenção.');
    return QUIET;
  }
  const b = believe(v), free = others.filter(i => v.known[i] === null);
  if (!free.length) return QUIET;
  const worst = best(free, i => -b.pF[i], rand), clean = best(free, i => b.pF[i], rand);
  rows(b, free);
  if (b.pF[worst] >= base + 0.2) { why(`Disse o que acha: ${P(worst)} é de quem mais desconfia (${pc(b.pF[worst])}; num lugar qualquer seria ${pc(base)}).`); return pick(worst, false); }
  if (b.pF[clean] <= base * 0.5) { why(`Disse o que acha: ${P(clean)} é quem parece mais limpo (${pc(b.pF[clean])}; num lugar qualquer seria ${pc(base)}).`); return pick(clean, true); }
  why('Ninguém se destaca o bastante para acusar ou abonar: ficou calada.');
  return QUIET;
}

/** A liberal: plays its side by what it believes. */
function liberal(v: View, rand: () => number): number {
  const o = v.options;
  if (v.ask === 'pdiscard') {
    // the chancellor test (D21): with one fascist law in three, pass it on with a liberal one to a chancellor it is
    // unsure of, while a fascist law still costs little (before the fascists' Hitler zone)
    const k = AI[v.level];
    if (k.test && nF(v.hand) === 1 && v.chanc !== null && v.laws.F < HITLER_ZONE - 1) {
      const c = believe(v).pF[v.chanc];
      if (c >= 0.25 && c <= 0.75 && rand() < k.test) { why(`Testou ${P(v.chanc)}: passou uma {f} e uma liberal para ver qual ${P(v.chanc)} aprova (tinha ${pc(c)} de dúvida sobre ele). Vai contar a verdade.`); rows(believe(v), [v.chanc]); return v.hand.indexOf('L'); }
    }
    why(v.hand.includes('F') ? 'É liberal: jogou fora uma lei {f} e passou o melhor que tinha.' : 'Só tinha liberais: qualquer uma.'); return Math.max(0, v.hand.indexOf('F'));
  }
  if (v.ask === 'cdiscard') {
    if (nF(v.hand) === 2) { const veto = o.includes(2) && v.tracker < TRACKER_MAX - 1; why(veto ? 'Recebeu 2 {fs}: pediu veto (o caos ainda não está perto).' : `Recebeu 2 {fs}: não tinha como evitar${o.includes(2) ? ' (veto arriscaria o caos)' : ''}.`); return veto ? 2 : 0; }
    why(v.hand.includes('L') ? 'É liberal: aprovou a liberal.' : 'Sem escolha.'); return Math.max(0, v.hand.indexOf('F'));
  }
  if (v.ask === 'veto') { const yes = nF(v.hand) === 2 && v.tracker < TRACKER_MAX - 1; why(nF(v.hand) === 2 ? (yes ? 'Passou 2 {fs} mesmo: aceitou o veto.' : 'Passou 2 {fs}, mas o veto traria o caos: recusou.') : 'Sabe que passou uma liberal: o chanceler quer vetar sem motivo. Recusou.'); return yes ? 1 : 0; }
  if (v.ask === 'pc') { const e = lastOwn(v, ['gov', 'veto'], e => e.pres === v.me); why(`É liberal: disse a verdade${e?.drew ? `, ${nmF(nF(e.drew), 3)}` : ''}.`); return e?.drew ? nF(e.drew) : -1; }
  if (v.ask === 'cc') { const e = lastOwn(v, ['gov', 'veto'], e => e.chanc === v.me); why(`É liberal: disse a verdade${e?.got ? `, ${nmF(nF(e.got), 2)}` : ''}.`); return e?.got ? nF(e.got) : -1; }
  if (v.ask === 'inv') { const e = lastOwn(v, ['inv'], e => e.by === v.me); why('É liberal: disse o que viu.'); return e?.party === 'F' ? 1 : 0; }
  if (v.ask === 'peek') { const e = lastOwn(v, ['peek'], e => e.by === v.me); why('É liberal: disse o que viu.'); return e?.saw ? nF(e.saw) : -1; }
  const b = believe(v);
  if (v.ask === 'vote') { if (v.pres === v.me || v.chanc === v.me) { why('Está no governo: {ja}'); return 1; } return liberalJa(v, b) ? 1 : 0; }
  if (v.ask === 'nominate') {
    const zone = v.laws.F >= HITLER_ZONE, score = (i: number): number => b.pF[i] + (zone ? 2 * b.pH[i] : 0);
    rows(b, o, score); why(`Indicou quem parece mais limpo: menor chance de ser do lado escondido${zone ? ', contando em dobro a chance de ser o {boss} (já há 3 leis {fs})' : ''}.`);
    return best(o, score, rand);
  }
  if (v.ask === 'investigate') {
    const score = (i: number): number => -(b.pF[i] * (1 - b.pF[i])) - b.pF[i] / 100;
    rows(b, o, i => b.pF[i] * (1 - b.pF[i]));
    why('Investigou de quem tinha mais dúvida: a chance mais perto de 50%, onde ver o partido ensina mais (investigar quem já parece limpo ou culpado quase não muda o que ela sabe). No empate, pende para o mais suspeito.');
    return best(o, score, rand);
  }
  if (v.ask === 'special') { rows(b, o); why('Escolheu para presidente quem parece mais limpo.'); return best(o, i => b.pF[i], rand); }
  rows(b, o, i => b.pH[i] + 0.3 * b.pF[i]); why('Eliminou quem tem mais chance de ser o {boss} (e, depois, de ser do lado escondido).');
  return best(o, i => -(b.pH[i] + 0.3 * b.pF[i]), rand);                   // execute
}

/** What a fascist says about its own hand, investigation or spying: the truth, unless it gives it away. */
function fascistTalk(v: View, rand: () => number, isAlly: (i: number) => boolean): number {
  const act = AI[v.level].act;
  if (v.ask === 'pc') {
    const e = lastOwn(v, ['gov', 'veto'], e => e.pres === v.me);
    if (!e?.drew || !e.got) return -1;
    const d = nF(e.drew), m = nF(e.got), law = e.k === 'veto' ? undefined : e.law, story = presStory(d, m, law);
    // the chancellor enacted the liberal law it was handed: a planning fascist can own up to "a test" instead of lying (D21)
    if (AI[v.level].plan && d === 1 && m === 1 && law === 'L' && rand() < 0.5) { why('Passou uma {f} e uma liberal e o chanceler aprovou a liberal: disse a verdade, como se tivesse sido um teste.'); return d; }
    const lie = story !== d && rand() < act;
    why(story === d ? `Disse a verdade (${nmF(d, 3)}): não a entrega.` : lie ? `Tirou ${nmF(d, 3)} e passou ${nmF(m, 2)}; a verdade a entregaria. Mentiu: ${nmF(story, 3)}, a história que faz o que passou parecer forçado.` : `A verdade (${nmF(d, 3)}) a entrega, mas ela não mentiu desta vez (o nível mente ${pc(act)} das vezes).`);
    return lie ? story : d;
  }
  if (v.ask === 'cc') {
    const e = lastOwn(v, ['gov', 'veto'], e => e.chanc === v.me);
    if (!e?.got) return -1;
    const m = nF(e.got), story = chancStory(m, e.k === 'veto' ? undefined : e.law);
    const lie = story !== m && rand() < act;
    why(story === m ? `Disse a verdade (${nmF(m, 2)}).` : lie ? `Recebeu ${nmF(m, 2)} e aprovou a {f}. Mentiu: ${nmF(story, 2)}, para parecer que não teve escolha.` : `A verdade a entrega, mas não mentiu desta vez (o nível mente ${pc(act)} das vezes).`);
    return lie ? story : m;
  }
  if (v.ask === 'inv') {
    const e = lastOwn(v, ['inv'], e => e.by === v.me);
    if (!e?.party) return 0;
    if (e.party === 'F' || isAlly(e.target)) { const cover = rand() < act; why(cover ? `Viu que ${P(e.target)} é do lado escondido e mentiu: disse liberal, para cobrir o aliado.` : `Viu que ${P(e.target)} é do lado escondido e não mentiu desta vez.`); return cover ? 0 : 1; }   // covers a teammate
    const frame = rand() < act / 2; why(frame ? `Viu que ${P(e.target)} é liberal e mentiu: disse {f}, para incriminar.` : `Viu que ${P(e.target)} é liberal e disse a verdade.`); return frame ? 1 : 0;   // frames a liberal, now and then
  }
  const e = lastOwn(v, ['peek'], e => e.by === v.me);
  why('Disse a verdade sobre as próximas leis.');
  return e?.saw ? nF(e.saw) : -1;
}

/** The best way for a fascist to play a hand, thinking about how the table will see it: each way is a law (worth 1 if
 *  fascist) and what will be said about it; it costs `image` times how much more the table would suspect this player,
 *  and Hitler. Returns the index of the best way. */
function weigh(v: View, ways: { law?: Law; pc?: number; cc?: number }[], hitler: number): number {
  const k = AI[v.level], now = believe(v, true), gov = { k: 'gov' as const, pres: v.pres, chanc: v.chanc as number };
  const watch = (b: Beliefs): number => b.pF[v.me] + (hitler >= 0 && hitler !== v.me ? b.pH[hitler] : 0) + (v.me === hitler ? b.pH[v.me] : 0);
  const base = watch(now);
  let top = 0, best = -Infinity;
  const told: string[] = [];
  ways.forEach((w, i) => {
    const after = believe({ ...v, hist: [...v.hist, { ...gov, ...(w.law ? { law: w.law } : { k: 'veto' as const }), pc: w.pc, cc: w.cc }] }, true);
    const score = (w.law === 'F' ? 1 : 0) - k.image * (watch(after) - base);
    told.push(`lei ${w.law === 'F' ? '{f}' : 'liberal'}: a desconfiança da mesa sobre ela${hitler >= 0 && hitler !== v.me ? ' e o {boss}' : ''} iria de ${pc(base)} para ${pc(watch(after))}, valor ${score.toFixed(2)}`);
    if (score > best + 1e-9) { best = score; top = i; }
  });
  why(`Pesou como a mesa veria cada jeito (lei {f} vale 1; cada ponto de desconfiança custa ${k.image}): ${told.join('; ')}. Ficou com a lei ${ways[top].law === 'F' ? '{f}' : 'liberal'}.`);
  return top;
}
/** The fascist laws a president who sees a hand with d of them passes on: as many as possible, or one fewer. */
const passes = (d: number): number[] => [...new Set([Math.min(2, d), Math.max(0, d - 1)])];

/** A fascist who knows its team (and Hitler at a small table): plays for it, and looks like a liberal when it can. */
function fascist(v: View, rand: () => number, allies: number[], hitler: number): number {
  const o = v.options, k = AI[v.level], isAlly = (i: number): boolean => allies.includes(i);
  const early = v.laws.F < HITLER_ZONE, clean = (): boolean => rand() < k.trust && early;
  const groom = k.plan && early && hitler >= 0 && v.alive[hitler];
  if (v.ask === 'pc' || v.ask === 'cc' || v.ask === 'inv' || v.ask === 'peek') return fascistTalk(v, rand, isAlly);
  if (v.ask === 'pdiscard') {
    const L = v.hand.indexOf('L'), F = Math.max(0, v.hand.indexOf('F'));
    if (L < 0) { why('Só tinha {fs}: qualquer uma.'); return 0; }
    if (groom && v.chanc === hitler) { why(`O chanceler é o {boss}: passou uma liberal para ele aprovar e parecer limpo antes da ${HITLER_ZONE}ª lei {f}.`); return F; }   // Hitler gets a liberal law to pass
    if (isAlly(v.chanc as number)) { why('O chanceler é aliado: jogou fora a liberal e passou {fs}.'); return L; }
    if (k.image) {                                                           // the chancellor is a liberal: what will the table think?
      const d = nF(v.hand), ms = passes(d);
      const m = ms[weigh(v, ms.map(m => { const law: Law = m === 2 ? 'F' : 'L'; return { law, pc: presStory(d, m, law), cc: m }; }), hitler)];
      return m === Math.min(2, d) ? L : F;
    }
    // passing two fascist laws out of a hand with one liberal means saying "I drew 3 fascist": the one who counts the
    // laws only says it when it is believable
    if (k.count && nF(v.hand) === 2 && drawOdds(Math.max(0, DECK_F - v.laws.F), Math.max(0, DECK_L - v.laws.L))[3] < 0.2) { why('Contando o baralho, dizer "tirei 3 {fs}" não seria crível: passou uma liberal.'); return F; }
    const c = clean(); why(c ? 'Deixou passar uma liberal para parecer limpa.' : 'Jogou fora a liberal e passou {fs}.'); return c ? F : L;
  }
  if (v.ask === 'cdiscard') {
    if (nF(v.hand) === 0) { why(o.includes(2) ? 'Recebeu 2 liberais: pediu veto, para não aprovar liberal.' : 'Recebeu 2 liberais: sem escolha.'); return o.includes(2) ? 2 : 0; }
    if (nF(v.hand) === 2) { why('Recebeu 2 {fs}: aprovou uma.'); return 0; }
    if (groom && v.me === hitler) { why(`É o {boss}: aprovou a liberal para parecer limpo antes da ${HITLER_ZONE}ª lei {f}.`); return v.hand.indexOf('F'); }   // Hitler stays clean until it pays
    if (k.image && !isAlly(v.pres)) {                                        // a liberal president passed one of each
      const ways: { law: Law; pc: number; cc: number }[] = [{ law: 'F', pc: 2, cc: 2 }, { law: 'L', pc: 2, cc: 1 }];
      return weigh(v, ways, hitler) === 0 ? v.hand.indexOf('L') : v.hand.indexOf('F');
    }
    const c = !isAlly(v.pres) && clean(); why(c ? 'Aprovou a liberal para parecer limpa.' : 'Aprovou a {f}.'); return c ? v.hand.indexOf('F') : v.hand.indexOf('L');
  }
  if (v.ask === 'veto') { why(nF(v.hand) === 0 ? 'Sabe que passou 2 liberais: aceitou o veto, para não sair liberal.' : 'Passou {fs}: recusou o veto, para sair lei {f}.'); return nF(v.hand) === 0 ? 1 : 0; }
  const pub = believe(v, true);
  if (v.ask === 'vote') {
    if (v.chanc === hitler && v.laws.F >= HITLER_ZONE) { why(`O chanceler é o {boss} e já há ${HITLER_ZONE} leis {fs}: elegê-lo ganha o jogo. {ja}`); return 1; }
    if (v.pres === v.me || v.chanc === v.me) { why('Está no governo: {ja}'); return 1; }
    if (isAlly(v.pres) || isAlly(v.chanc as number)) {
      // the extreme level knows its votes are read (D21): on a government the table already doubts, it votes like a
      // liberal would, now and then, so as not to stand out next to its teammate
      if (k.count && !liberalJa(v, pub) && rand() < 0.8) { why('Há um aliado no governo, mas a mesa desconfia dele: votou {nein} para não aparecer junto.'); return 0; }
      why('Há um aliado no governo: {ja}'); return 1;
    }
    if (v.tracker === TRACKER_MAX - 1 && rand() < 0.5) { why('Mais uma rejeição traz o caos, que costuma tirar lei {f}: {nein}'); return 0; }   // the chaos plays for the fascists
    why('Nenhum aliado no governo: votou como um liberal votaria pelo que a mesa viu, para não destoar.');
    return liberalJa(v, pub) ? 1 : 0;
  }
  if (v.ask === 'nominate') {
    rows(pub, o);
    if (v.laws.F >= HITLER_ZONE && o.includes(hitler) && (k.plan || pub.pH[hitler] < 0.5)) { why(`Já há ${HITLER_ZONE} leis {fs}: indicou o {boss}, ${P(hitler)}, para ganhar se a mesa o eleger.`); return hitler; }
    if (groom && o.includes(hitler) && rand() < 0.5) { why(`Indicou o {boss}, ${P(hitler)}, para ele aprovar uma liberal e parecer limpo.`); return hitler; }
    const mates = o.filter(isAlly);
    if (mates.length && rand() < 0.6) { const m = best(mates, i => pub.pF[i], rand); why(`Indicou um aliado, ${P(m)}, o que a mesa menos desconfia.`); return m; }
    const libs = o.filter(i => !isAlly(i)).length ? o.filter(i => !isAlly(i)) : o, pick = best(libs, i => pub.pF[i], rand);
    why(`Indicou ${P(pick)}, quem a mesa acha mais limpo, para parecer liberal.`); return pick;
  }
  if (v.ask === 'investigate') {
    rows(pub, o);
    if (k.plan && o.includes(hitler) && hitler !== v.me) { why(`Investigou o {boss}, ${P(hitler)}, para depois dizer que ele é liberal e abonar.`); return hitler; }    // to vouch for him afterwards
    const mates = o.filter(isAlly);
    if (mates.length && rand() < 0.4) { const m = best(mates, i => -pub.pF[i], rand); why(`Investigou um aliado sob suspeita, ${P(m)}, para limpar a barra dele.`); return m; }
    const libs = o.filter(i => !isAlly(i)), pick = best(libs.length ? libs : o, i => pub.pF[i], rand);
    why(`Investigou ${P(pick)}, o liberal que a mesa acha mais limpo, e pode incriminá-lo depois.`); return pick;
  }
  if (v.ask === 'special') { const mates = o.filter(isAlly), pick = best(mates.length ? mates : o, i => pub.pF[i], rand); rows(pub, o); why(mates.length ? `Deu a presidência a um aliado, ${P(pick)}.` : `Deu a presidência a ${P(pick)}.`); return pick; }
  // execute: a liberal who knows a teammate lied (it investigated one, or got caught by one), or else the one the
  // table trusts most
  const libs = o.filter(i => !isAlly(i)), saw = (i: number): number => k.plan ? v.hist.filter(e =>
    (e.k === 'inv' && e.by === i && isAlly(e.target)) || ((e.k === 'gov' || e.k === 'veto') && e.pres === i && isAlly(e.chanc) && (e.pc ?? -1) >= 0 && (e.cc ?? -1) >= 0 && Math.max(0, (e.pc as number) - 1) !== e.cc)).length : 0;
  const pick = best(libs.length ? libs : o, i => pub.pF[i] - saw(i), rand); rows(pub, o, i => pub.pF[i] - saw(i));
  why(saw(pick) ? `Eliminou ${P(pick)}, que sabe que um aliado mentiu.` : `Eliminou ${P(pick)}, o liberal em quem a mesa mais confia.`);
  return pick;
}

/** Hitler who does not know his team: plays like a liberal to be trusted, lets liberal laws through early, and once
 *  enough fascist laws are on the table, keeps the fascist ones. */
function hidden(v: View, rand: () => number): number {
  const early = v.laws.F < HITLER_ZONE, k = AI[v.level];
  const seen = new Set(v.hist.flatMap(e => (e.k === 'inv' && e.by === v.me && e.party === 'F' ? [e.target] : [])));
  if (k.image && v.ask === 'pdiscard' && v.hand.includes('L') && v.hand.includes('F')) {   // weighs his image, as a fascist does
    const d = nF(v.hand), ms = passes(d);
    const m = ms[weigh(v, ms.map(m => { const law: Law = m === 2 ? 'F' : 'L'; return { law, pc: presStory(d, m, law), cc: m }; }), v.me)];
    return m === Math.min(2, d) ? v.hand.indexOf('L') : v.hand.indexOf('F');
  }
  if (k.image && v.ask === 'cdiscard' && nF(v.hand) === 1) return weigh(v, [{ law: 'F', pc: 2, cc: 2 }, { law: 'L', pc: 2, cc: 1 }], v.me) === 0 ? v.hand.indexOf('L') : v.hand.indexOf('F');
  if (v.ask === 'pdiscard') { const L = v.hand.indexOf('L'), keep = L >= 0 && !(early && rand() < 0.5 + k.trust); why(keep ? 'É o {boss}: jogou fora a liberal.' : 'É o {boss}: passou o melhor que tinha, para parecer liberal.'); return keep ? L : Math.max(0, v.hand.indexOf('F')); }
  if (v.ask === 'cdiscard') { const L = v.hand.indexOf('L'); if (nF(v.hand) === 1 && !(early && rand() < 0.5 + k.trust)) { why('É o {boss}: aprovou a {f}.'); return L; } return liberal(v, rand); }
  if (v.ask === 'veto') { why(nF(v.hand) === 0 ? 'É o {boss} e passou 2 liberais: aceitou o veto.' : 'É o {boss}: recusou o veto.'); return nF(v.hand) === 0 ? 1 : 0; }
  if (v.ask === 'pc' || v.ask === 'cc' || v.ask === 'inv' || v.ask === 'peek') return fascistTalk(v, rand, i => seen.has(i));
  if (v.ask === 'execute') { const b = believe(v); rows(b, v.options); why('É o {boss}: eliminou quem tem mais cara de liberal.'); return best(v.options, i => b.pF[i], rand); }   // the one most surely liberal
  return liberal(v, rand);
}

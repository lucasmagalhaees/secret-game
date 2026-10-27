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
import { DECK_F, DECK_L, HITLER_ZONE, TRACKER_MAX } from './game';
import type { Law, Level, Party, Role, Seen, View } from './types';

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
 *    same reasoning the table uses. */
export interface Knobs { noise: number; memory: number; lie: number; count: boolean; act: number; trust: number; wary: number; plan: boolean; image: number; slip: number }
export const AI: Record<Level, Knobs> = {
  facil: { noise: 0.3, slip: 0.1, memory: 5, lie: 0.1, count: false, act: 0.25, trust: 0, wary: 0.5, plan: false, image: 0 },
  medio: { noise: 0.1, slip: 0.1, memory: 6, lie: 0.3, count: false, act: 0.6, trust: 0.1, wary: 0.3, plan: false, image: 0 },
  dificil: { noise: 0.03, slip: 0.03, memory: 99, lie: 0.35, count: false, act: 0.9, trust: 0.15, wary: 0.2, plan: true, image: 1 },
  extremo: { noise: 0.02, slip: 0.02, memory: 99, lie: 0.4, count: true, act: 0.95, trust: 0.15, wary: 0.15, plan: true, image: 1 }
};
/** How far the temper of a player (View.mood, -1 to 1) moves the risk it accepts in a government. */
export const MOOD = 0.2;
/** How often a liberal thinks a fascist lets a liberal law through on purpose (the same at every level). */
const TRUST_GUESS = 0.15;

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
function passOdds(d: number, fascist: boolean): [number, number][] {
  const lo = Math.max(0, d - 1), hi = Math.min(2, d);
  if (!fascist || lo === hi) return [[fascist ? hi : lo, 1]];
  return [[hi, 1 - TRUST_GUESS], [lo, TRUST_GUESS]];
}
/** How likely this law comes out of a hand with m fascist laws. */
function lawOdds(m: number, fascist: boolean, law: Law | undefined): number {
  if (m === 0) return law === 'L' ? 1 : 0;
  if (m === 2) return law === 'F' ? 1 : 0;
  return !fascist ? (law === 'L' ? 1 : 0) : law === 'F' ? 1 - TRUST_GUESS : TRUST_GUESS;
}
/** How likely a chancellor asks to veto (and it goes through) with m fascist laws in hand. */
const vetoOdds = (m: number, fascist: boolean): number => (fascist ? (m === 0 ? 0.8 : 0.05) : m === 2 ? 0.8 : 0.02);
/** How likely someone says `said` when the truth is `truth` and the story is `story`. */
function sayOdds(said: number | undefined, truth: number, story: number, fascist: boolean, lie: number): number {
  if (said === undefined || said < 0) return 1;
  if (!fascist || story === truth) return said === truth ? 1 : 0;
  return (said === truth ? 1 - lie : 0) + (said === story ? lie : 0);
}

/** How well one government (or veto) is explained by who was fascist in it. */
function govOdds(e: Extract<Seen, { k: 'gov' | 'veto' }>, fp: boolean, fc: boolean, pd: number[], lie: number, knownD: number | null): number {
  const D = e.drew && e.drew.length ? [nF(e.drew)] : knownD !== null ? [knownD] : [0, 1, 2, 3];
  const got = e.got && e.got.length ? nF(e.got) : null, law = e.k === 'veto' ? undefined : e.law;
  let sum = 0;
  for (const d of D) {
    const p = D.length === 1 ? 1 : pd[d];
    if (!p) continue;
    for (const [m, pm] of passOdds(d, fp)) {
      if (got !== null && m !== got) continue;
      const out = e.k === 'veto' ? vetoOdds(m, fc) : lawOdds(m, fc, law);
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
    v.hist.forEach((e, i) => {
      const fresh = i >= remember;
      if (e.k === 'gov' || e.k === 'veto') {
        const own = mine(e.pres) || mine(e.chanc);
        if (fresh || own) {
          const pd = k.count ? drawOdds(Math.max(0, DECK_F - F), Math.max(0, DECK_L - L)) : drawOdds(DECK_F, DECK_L);
          const ev = outside ? { ...e, drew: undefined, got: undefined } : e;
          const p = govOdds(ev, fasc(roles[e.pres]), fasc(roles[e.chanc]), pd, k.lie, k.count ? knownD : null);
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
      } else if (e.k === 'inv') {
        if (mine(e.by) && e.party) w *= (fasc(roles[e.target]) ? 'F' : 'L') === e.party ? 1 : 0;
        else if (fresh && e.said && e.said !== '-') {
          const truth: Party = fasc(roles[e.target]) ? 'F' : 'L';
          const p = !fasc(roles[e.by]) ? (e.said === truth ? 1 : 0)
            : truth === 'F' ? (e.said === 'L' ? k.lie : 1 - k.lie) : e.said === 'F' ? k.lie / 2 : 1 - k.lie / 2;
          w *= 0.03 + 0.97 * p;
        }
      } else if (e.k === 'exec' && fresh && roles[e.target] === 'hitler') w *= 0.001;   // the game went on
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
  const slack = 0.05 + MOOD * v.mood + (v.tracker === TRACKER_MAX - 1 ? 0.2 : 0);
  if (v.laws.F >= HITLER_ZONE && b.pH[gov[1]] > k.wary) return false;
  return risk(b, gov.filter(i => i !== v.me)) <= base + slack;
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
  const k = AI[v.level], o = v.options;
  if (!o.length) return -1;
  const talk = v.ask === 'pc' || v.ask === 'cc' || v.ask === 'inv' || v.ask === 'peek';
  const hand = v.ask === 'pdiscard' || v.ask === 'cdiscard' || v.ask === 'veto';
  if (!talk && rand() < (hand ? k.slip : k.noise)) return o[Math.floor(rand() * o.length)];
  const team = fasc(v.role), all = team && v.known.every(r => r !== null);
  const allies = all ? v.known.map((r, i) => (r && fasc(r) && i !== v.me ? i : -1)).filter(i => i >= 0) : [];
  const hitler = v.known.indexOf('hitler');
  const ans = all ? fascist(v, rand, allies, hitler) : v.role === 'hitler' ? hidden(v, rand) : liberal(v, rand);
  return o.includes(ans) ? ans : o[0];
}

/** A liberal: plays its side by what it believes. */
function liberal(v: View, rand: () => number): number {
  const o = v.options;
  if (v.ask === 'pdiscard') return Math.max(0, v.hand.indexOf('F'));
  if (v.ask === 'cdiscard') return nF(v.hand) === 2 ? (o.includes(2) && v.tracker < TRACKER_MAX - 1 ? 2 : 0) : Math.max(0, v.hand.indexOf('F'));
  if (v.ask === 'veto') return nF(v.hand) === 2 && v.tracker < TRACKER_MAX - 1 ? 1 : 0;
  if (v.ask === 'pc') { const e = lastOwn(v, ['gov', 'veto'], e => e.pres === v.me); return e?.drew ? nF(e.drew) : -1; }
  if (v.ask === 'cc') { const e = lastOwn(v, ['gov', 'veto'], e => e.chanc === v.me); return e?.got ? nF(e.got) : -1; }
  if (v.ask === 'inv') { const e = lastOwn(v, ['inv'], e => e.by === v.me); return e?.party === 'F' ? 1 : 0; }
  if (v.ask === 'peek') { const e = lastOwn(v, ['peek'], e => e.by === v.me); return e?.saw ? nF(e.saw) : -1; }
  const b = believe(v);
  if (v.ask === 'vote') return v.pres === v.me || v.chanc === v.me || liberalJa(v, b) ? 1 : 0;
  if (v.ask === 'nominate') return best(o, i => b.pF[i] + (v.laws.F >= HITLER_ZONE ? 2 * b.pH[i] : 0), rand);
  if (v.ask === 'investigate') return best(o, i => -(b.pF[i] * (1 - b.pF[i])) - b.pF[i] / 100, rand);
  if (v.ask === 'special') return best(o, i => b.pF[i], rand);
  return best(o, i => -(b.pH[i] + 0.3 * b.pF[i]), rand);                   // execute
}

/** What a fascist says about its own hand, investigation or spying: the truth, unless it gives it away. */
function fascistTalk(v: View, rand: () => number, isAlly: (i: number) => boolean): number {
  const act = AI[v.level].act;
  if (v.ask === 'pc') {
    const e = lastOwn(v, ['gov', 'veto'], e => e.pres === v.me);
    if (!e?.drew || !e.got) return -1;
    const d = nF(e.drew), m = nF(e.got), law = e.k === 'veto' ? undefined : e.law, story = presStory(d, m, law);
    return story !== d && rand() < act ? story : d;
  }
  if (v.ask === 'cc') {
    const e = lastOwn(v, ['gov', 'veto'], e => e.chanc === v.me);
    if (!e?.got) return -1;
    const m = nF(e.got), story = chancStory(m, e.k === 'veto' ? undefined : e.law);
    return story !== m && rand() < act ? story : m;
  }
  if (v.ask === 'inv') {
    const e = lastOwn(v, ['inv'], e => e.by === v.me);
    if (!e?.party) return 0;
    if (e.party === 'F' || isAlly(e.target)) return rand() < act ? 0 : 1;   // covers a teammate
    return rand() < act / 2 ? 1 : 0;                                          // frames a liberal, now and then
  }
  const e = lastOwn(v, ['peek'], e => e.by === v.me);
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
  ways.forEach((w, i) => {
    const after = believe({ ...v, hist: [...v.hist, { ...gov, ...(w.law ? { law: w.law } : { k: 'veto' as const }), pc: w.pc, cc: w.cc }] }, true);
    const score = (w.law === 'F' ? 1 : 0) - k.image * (watch(after) - base);
    if (score > best + 1e-9) { best = score; top = i; }
  });
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
    if (L < 0) return 0;
    if (groom && v.chanc === hitler) return F;                               // Hitler gets a liberal law to pass
    if (isAlly(v.chanc as number)) return L;
    if (k.image) {                                                           // the chancellor is a liberal: what will the table think?
      const d = nF(v.hand), ms = passes(d);
      const m = ms[weigh(v, ms.map(m => { const law: Law = m === 2 ? 'F' : 'L'; return { law, pc: presStory(d, m, law), cc: m }; }), hitler)];
      return m === Math.min(2, d) ? L : F;
    }
    // passing two fascist laws out of a hand with one liberal means saying "I drew 3 fascist": the one who counts the
    // laws only says it when it is believable
    if (k.count && nF(v.hand) === 2 && drawOdds(Math.max(0, DECK_F - v.laws.F), Math.max(0, DECK_L - v.laws.L))[3] < 0.2) return F;
    return clean() ? F : L;
  }
  if (v.ask === 'cdiscard') {
    if (nF(v.hand) === 0) return o.includes(2) ? 2 : 0;
    if (nF(v.hand) === 2) return 0;
    if (groom && v.me === hitler) return v.hand.indexOf('F');               // Hitler stays clean until it pays
    if (k.image && !isAlly(v.pres)) {                                        // a liberal president passed one of each
      const ways: { law: Law; pc: number; cc: number }[] = [{ law: 'F', pc: 2, cc: 2 }, { law: 'L', pc: 2, cc: 1 }];
      return weigh(v, ways, hitler) === 0 ? v.hand.indexOf('L') : v.hand.indexOf('F');
    }
    return !isAlly(v.pres) && clean() ? v.hand.indexOf('F') : v.hand.indexOf('L');
  }
  if (v.ask === 'veto') return nF(v.hand) === 0 ? 1 : 0;
  const pub = believe(v, true);
  if (v.ask === 'vote') {
    if (v.chanc === hitler && v.laws.F >= HITLER_ZONE) return 1;
    if (isAlly(v.pres) || isAlly(v.chanc as number) || v.pres === v.me || v.chanc === v.me) return 1;
    if (v.tracker === TRACKER_MAX - 1 && rand() < 0.5) return 0;            // the chaos plays for the fascists
    return liberalJa(v, pub) ? 1 : 0;
  }
  if (v.ask === 'nominate') {
    if (v.laws.F >= HITLER_ZONE && o.includes(hitler) && (k.plan || pub.pH[hitler] < 0.5)) return hitler;
    if (groom && o.includes(hitler) && rand() < 0.5) return hitler;
    const mates = o.filter(isAlly);
    if (mates.length && rand() < 0.6) return best(mates, i => pub.pF[i], rand);
    return best(o.filter(i => !isAlly(i)).length ? o.filter(i => !isAlly(i)) : o, i => pub.pF[i], rand);
  }
  if (v.ask === 'investigate') {
    if (k.plan && o.includes(hitler) && hitler !== v.me) return hitler;    // to vouch for him afterwards
    const mates = o.filter(isAlly);
    if (mates.length && rand() < 0.4) return best(mates, i => -pub.pF[i], rand);
    const libs = o.filter(i => !isAlly(i));
    return best(libs.length ? libs : o, i => pub.pF[i], rand);
  }
  if (v.ask === 'special') { const mates = o.filter(isAlly); return best(mates.length ? mates : o, i => pub.pF[i], rand); }
  // execute: a liberal who knows a teammate lied (it investigated one, or got caught by one), or else the one the
  // table trusts most
  const libs = o.filter(i => !isAlly(i)), saw = (i: number): number => k.plan ? v.hist.filter(e =>
    (e.k === 'inv' && e.by === i && isAlly(e.target)) || ((e.k === 'gov' || e.k === 'veto') && e.pres === i && isAlly(e.chanc) && (e.pc ?? -1) >= 0 && (e.cc ?? -1) >= 0 && Math.max(0, (e.pc as number) - 1) !== e.cc)).length : 0;
  return best(libs.length ? libs : o, i => pub.pF[i] - saw(i), rand);
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
  if (v.ask === 'pdiscard') { const L = v.hand.indexOf('L'); return L >= 0 && !(early && rand() < 0.5 + k.trust) ? L : Math.max(0, v.hand.indexOf('F')); }
  if (v.ask === 'cdiscard') { const L = v.hand.indexOf('L'); return nF(v.hand) === 1 && !(early && rand() < 0.5 + k.trust) ? L : liberal(v, rand); }
  if (v.ask === 'veto') return nF(v.hand) === 0 ? 1 : 0;
  if (v.ask === 'pc' || v.ask === 'cc' || v.ask === 'inv' || v.ask === 'peek') return fascistTalk(v, rand, i => seen.has(i));
  if (v.ask === 'execute') { const b = believe(v); return best(v.options, i => b.pF[i], rand); }   // the one most surely liberal
  return liberal(v, rand);
}

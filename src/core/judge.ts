/* The judge between the game and the players run by the app (D10). It is the only code that holds the whole game and
   asks them anything: for the seat whose turn it is, it builds what that seat may know (`viewOf`: its own role, its
   team if it knows it, the laws that passed through its hands, what it saw with its own powers, and what everyone saw
   and heard), asks one question with the answers allowed, and plays the answer through the rules. An answer outside
   what was offered is not played: the first allowed option is. So no player run by the app sees more than its seat or
   does more than its turn. It also takes the votes, one by one, where the app plays some of the seats, and what each
   player tells the table about its hand. */
import { backed, earlyGov, believe, claimRepeats, socialMemory, decideWhy, drawOdds, QUIET, REACT, temper } from './ai';
import { WIN, answerVeto, askVeto, canNominate, canTarget, canVeto, chancellorDiscard, DECK_F, DECK_L, endPower, execute, FASCISTS, HITLER_KNOWS_UPTO, HITLER_ZONE, investigate, knows, nominate, partyOf, presidentDiscard, revealNext, SMALL_TABLE, specialElect, vote } from './game';
import { words } from './words';
import type { Ask, Defense, Event, Game, Gov, Law, Level, Party, Persona, Role, Seen, Talk, Trace, View } from './types';

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
  const campaigning = g.phase === 'vote';
  if ((!campaigning && g.phase !== 'nominate') || (!campaigning && !g.hist.some(e => e.k === 'gov' || e.k === 'rej' || e.k === 'chaos' || e.k === 'veto'))) return null;
  // what a person said (D26) does not take the turn of an app player
  const mark = roundMark(g), said = g.hist.slice(mark + 1).filter((e): e is Talk => e.k === 'talk' && isAi(g, e.by) && (campaigning ? e.stage === 'campaign' : e.stage !== 'campaign'));
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
  // the app players take the court too (D40): an accusation with a proof that holds is made as one; a fascist who has
  // only a weak hint against a liberal may wave it as a proof all the same (a bluff that costs it if the table looks)
  const ev = kind === 'acc' ? evidence(g, about) : [], strong = ev.find(x => x.hit), weak = ev[0];
  const bluff = !strong && !!weak && g.players[by].role !== 'liberal' && g.players[about].role === 'liberal';
  const court = strong ? { tone: 'proof' as const, proof: strong.at, hit: true } : bluff ? { tone: 'proof' as const, proof: weak.at } : {};
  const line = quiet ? [] : [`${g.players[by].name}: "${strong || bluff ? `${(strong || weak).text}. ${g.players[about].name}, explica isso.` : npcStatement(g, by, about, kind === 'trust')}"`];
  return { ...g, log: [...g.log, ...line], hist: [...g.hist, { k: 'talk', by, about, say: kind, ...(g.phase === 'vote' ? { stage: 'campaign' as const } : {}), ...court }] };
}
/** The accusation against `me` still waiting for an answer this round (D40), if any: its index in the history. */
export function pendingAccusation(g: Game, me: number): number {
  const mark = lastIndex(g, ['vote', 'rej', 'gov', 'veto', 'chaos', 'inv', 'peek', 'special', 'exec']);
  for (let i = g.hist.length - 1; i > mark; i--) { const e = g.hist[i]; if (e.k === 'talk' && e.about === me && e.say === 'acc' && e.by !== me && !e.def) return i; }
  return -1;
}
/** The accused answers (D40). Whether the answer holds is worked out from the record the whole table saw: "the deck
 *  came like that" holds when the government passed a law of the hidden side and the stories add up; "it was a test"
 *  holds when, as president, one said 1 of each and a liberal law came out; "they lie" holds when the accusation had no
 *  proof that holds; silence never does. A defence that holds takes the weight off the accusation for the app players. */
export function defend(g: Game, me: number, kind: Defense): Game {
  const at = pendingAccusation(g, me);
  if (at < 0) return g;
  const t = g.hist[at] as Talk, gov = t.proof !== undefined ? g.hist[t.proof] : undefined;
  const isGov = !!gov && (gov.k === 'gov' || gov.k === 'veto');
  const clash = isGov && gov.pc !== undefined && gov.cc !== undefined && gov.pc >= 0 && gov.cc >= 0 && Math.max(0, gov.pc - 1) !== gov.cc && !(gov.pc === 1 && gov.cc === 1);
  const ok = kind === 'deck' ? isGov && !clash && gov.k === 'gov' && gov.law === 'F'
    : kind === 'test' ? isGov && gov.pres === me && gov.pc === 1 && gov.k === 'gov' && gov.law === 'L'
    : kind === 'lie' ? !t.hit : false;
  const words_: Record<Defense, string> = { deck: 'O baralho veio assim, não tive escolha.', test: 'Foi teste do chanceler, e eu contei.', lie: `${g.players[t.by].name} está mentindo.`, quiet: '…' };
  const hist = [...g.hist]; hist[at] = { ...t, def: kind, ok };
  return { ...g, hist, log: [...g.log, `${g.players[me].name}: "${words_[kind]}"`, ...(ok ? [] : kind === 'quiet' ? [] : ['A mesa não comprou a defesa.'])] };
}

/** NPC statements use a public target and recorded context, never a private party or hand. */
function npcStatement(g: Game, by: number, about: number, trust: boolean): string {
  const n = g.players[about].name, prior = g.hist.filter(e => e.k === 'talk' && e.by === by && e.say !== 'quiet');
  if (g.phase === 'vote') return speech(trust ? [`Eu daria uma chance a ${n} nesse governo. Quem vem comigo?`, `Antes de rejeitar, considerem ${n}. Esse governo pode ajudar a mesa.`, `Estou defendendo ${n} nesta votação. Vamos comparar com as alternativas.`] : [`Não aprovem só por pressa. Ainda desconfio de ${n} nesse governo.`, `Quero que ${n} explique melhor antes de ganhar nosso voto.`, `Quem está pensando em aprovar, revisa o risco de colocar ${n} nesse governo.`], g, by, g.hist.length, 'talk');
  const vote = [...g.hist].reverse().find(e => e.k === 'vote');
  if (vote?.k === 'vote' && !trust && vote.ja.includes(about) && ![vote.pres, vote.chanc].includes(about)) return speech([`${n} apoiou aquele governo. Quero ouvir o motivo desse voto.`, `Guardei o voto de ${n} a favor. Isso ainda precisa de explicação.`, `Não é prova de papel, mas o voto de ${n} me chamou atenção.`], g, by, g.hist.length, 'talk');
  if (!prior.length) return `${trust ? 'Confio em' : 'Desconfio de'} ${n}.`;
  const tone: Record<Persona, [string, string]> = {
    certinho: [`Quero entender melhor as escolhas de ${n}.`, `Por enquanto, a leitura de ${n} me parece razoável.`],
    desconfiado: [`Estou de olho em ${n}. Essa história ainda não me convenceu.`, `De todos aqui, ${n} me deixa menos desconfiado por enquanto.`],
    cetico: [`Não compro a versão de ${n} tão fácil.`, `Ainda não vi motivo suficiente para ir contra ${n}.`],
    critico: [`Vamos cobrar de ${n} uma explicação para as escolhas.`, `Quero comparar as próximas jogadas com o que ${n} está dizendo.`],
    centrado: [`Minha maior dúvida agora é sobre ${n}.`, `Hoje eu daria um voto de confiança a ${n}.`],
    blefador: [`Estou falando: prestem atenção em ${n}!`, `Eu ficaria do lado de ${n} nessa discussão.`],
    caotico: [`Meu radar apitou em ${n} de novo!`, `Minha aposta da rodada é confiar em ${n}.`]
  };
  const options = [tone[persona(g, by)][trust ? 1 : 0], trust ? `${n} ainda me parece uma escolha melhor. Vou conferir as próximas decisões.` : `Quero ouvir ${n} antes de deixar essa suspeita de lado.`, trust ? `Não vou acusar ${n} sem algo mais concreto.` : `Não consigo tirar ${n} da minha lista de suspeitos.`];
  const relevant = [...g.hist].reverse().find(e => e.k === 'gov' && (e.pres === about || e.chanc === about));
  if (relevant?.k === 'gov' && relevant.law === (trust ? 'L' : 'F')) options.push(trust ? `${n} participou de um governo que aprovou liberal. Isso conta a favor, mas não prova o papel.` : `${n} estava naquele governo que aprovou lei do lado escondido. Quero uma explicação, não uma condenação automática.`);
  return speech(options, g, by, g.hist.length, 'talk');
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
export function denounce(g: Game, by: number, about: number, trust: boolean, rand: () => number, as?: Talk): Game {
  if (!canDenounce(g, by, about)) return g;
  const said: Talk = as ?? { k: 'talk', by, about, say: trust ? 'trust' : 'acc' };
  // a claim (D30): what the person says someone is, true or a bluff
  const line = `${g.players[by].name}: "${g.players[about].name} é ${trust ? 'liberal' : words(g.pack).f}."`;
  const heard: Game = { ...g, hist: [...g.hist, said] }, ts: Trace[] = [], re: [number, number][] = [];
  for (let i = 0; i < g.players.length; i++) {
    if (!isAi(g, i) || !g.players[i].alive || i === about) continue;
    const r = ask(heard, i, 'react', [REACT.agree, REACT.unsure, REACT.disagree], rand);
    ts.push(r.t); re.push([i, r.a]);
  }
  const at = g.hist.length, lines = [line, ...re.map(([i, a]) => `${g.players[i].name}: "${reply(heard, i, a, at)}"`), ...(isAi(g, about) ? [`${g.players[about].name}: "${answer(g, about, !trust, at)}"`] : [])];
  return { ...traced(g, ts), log: [...g.log, ...lines], hist: [...g.hist, { ...said, ...(re.length ? { re } : {}) }] };
}

/** What the record holds against a seat (D39), for an accusation with a proof: only what the whole table saw. A
 *  government it sat in whose story did not add up, or that passed a law of the hidden side, holds ("hit"); a Ja!
 *  vote for such a government is a weaker hint and does not hold by itself. Newest first. */
export interface Proof { at: number; kind: 'clash' | 'law' | 'vote' | 'inv' | 'exec' | 'count'; hit: boolean; title: string; text: string; pc?: number; cc?: number; law?: Law }
export function evidence(g: Game, about: number): Proof[] {
  const out: Proof[] = [], f = words(g.pack).f, nm = (i: number): string => g.players[i]?.name ?? '?';
  let n = 0;
  g.hist.forEach((e, at) => {
    if (e.k === 'gov' || e.k === 'chaos') n++;
    if ((e.k === 'gov' || e.k === 'veto') && (e.pres === about || e.chanc === about)) {
      const pres = e.pres === about, clash = e.pc !== undefined && e.cc !== undefined && e.pc >= 0 && e.cc >= 0 && Math.max(0, e.pc - 1) !== e.cc && !(e.pc === 1 && e.cc === 1);
      const lawF = e.k === 'gov' && e.law === 'F', said = pres ? e.pc : e.cc;
      if (clash) out.push({ at, kind: 'clash', hit: true, title: `${n}º governo · ${pres ? 'presidente' : 'chanceler'}`, text: pres ? `Disse que tirou ${said} ${f}${said === 1 ? '' : 's'}, e o chanceler disse outra coisa` : `Disse que recebeu ${said} ${f}${said === 1 ? '' : 's'}, e não bate com o presidente`, pc: e.pc, cc: e.cc, law: e.k === 'gov' ? e.law : undefined });
      else if (lawF) out.push({ at, kind: 'law', hit: !earlyGov(g.hist as Seen[], at), title: `${n}º governo · ${pres ? 'presidente' : 'chanceler'}`, text: `Governou com ${nm(pres ? e.chanc : e.pres)} e saiu lei ${f}${earlyGov(g.hist as Seen[], at) ? ' (no começo do jogo: prova fraca)' : ''}`, pc: e.pc, cc: e.cc, law: 'F' });
    }
    if (e.k === 'vote' && e.ja.includes(about) && e.pres !== about && e.chanc !== about) {
      const next = g.hist[at + 1];
      if (next && next.k === 'gov' && next.law === 'F') out.push({ at, kind: 'vote', hit: false, title: `Votação · ${n + 1}º governo`, text: `Votou ${words(g.pack, g.region).ja} em ${nm(e.pres)} + ${nm(e.chanc)}, e saiu lei ${f}` });
    }
    // D54: what an investigation was said to show, and who someone eliminated. Both are words or choices the table saw,
    // not facts: the investigator may lie, the one who eliminated may have guessed. They back an accusation, weakly.
    if (e.k === 'inv' && e.target === about && e.said === 'F') out.push({ at, kind: 'inv', hit: false, title: `Investigação · ${nm(e.by)}`, text: `${nm(e.by)} investigou e disse que é ${f}` });
    if (e.k === 'exec' && e.by === about) out.push({ at, kind: 'exec', hit: false, title: `Eliminação · ${n}º governo`, text: `Eliminou ${nm(e.target)}, que não era o ${words(g.pack).boss}` });
  });
  // D54: how many laws of the hidden side came out of the governments it sat in; two or more hold
  const govF = g.hist.map((e, i) => (e.k === 'gov' && e.law === 'F' && (e.pres === about || e.chanc === about) ? i : -1)).filter(i => i >= 0);
  if (govF.length >= 2) out.push({ at: 100000 + govF[govF.length - 1], kind: 'count', hit: true, title: 'Na conta', text: `Esteve em ${govF.length} governos que aprovaram lei ${f}` });
  out.sort((a, b) => (a.at % 100000) - (b.at % 100000) || a.at - b.at);
  return out.reverse();
}
/** An accusation with a tone and maybe a proof (D39): the claim is made as usual, and it carries how firmly it was made
 *  and whether the proof holds; the accused, when the proof holds, stammers. */
export function accuse(g: Game, by: number, about: number, tone: 'soft' | 'firm' | 'proof', proof: number | null, rand: () => number): Game {
  const p = proof === null ? undefined : evidence(g, about).find(x => x.at === proof), hit = tone === 'proof' && !!p?.hit;
  const tagged = (x: Game): Game => {
    const i = x.hist.length - 1, e = x.hist[i];
    if (!e || e.k !== 'talk') return x;
    const hist = [...x.hist]; hist[i] = { ...e, tone, ...(p ? { proof: p.at } : {}), ...(hit ? { hit: true } : {}) };
    return { ...x, hist };
  };
  const pre = tagged({ ...g, hist: [...g.hist, { k: 'talk', by, about, say: 'acc' }] });
  const t = pre.hist[pre.hist.length - 1] as Talk;
  // the reactions are asked with the tone and proof already known to the table
  const next = denounce({ ...g, hist: g.hist }, by, about, false, rand, t);
  if (next === g) return g;
  const out = tagged(next);
  if (hit && isAi(g, about)) { const log = [...out.log]; log[log.length - 1] = `${g.players[about].name}: "${STAMMER[(about * 7 + g.hist.length) % STAMMER.length]}"`; return { ...out, log }; }
  return out;
}
const STAMMER = ['Eu… devo ter contado errado. Não, espera—', 'Isso… isso foi um mal-entendido!', 'Tá, mas… o baralho, sabe como é…', 'Eu ia explicar isso… depois.'];

/** Explain only visible reactions: this feedback never uses actual roles or secret investigations. */
export function accusationFeedback(g: Game, at: number): string {
  const e = g.hist[at];
  if (!e || e.k !== 'talk' || e.say === 'quiet') return '';
  const v = viewOf({ ...g, hist: g.hist.slice(0, at + 1) }, e.by, 'react', [0, 1, 2]);
  const prior = socialMemory({ ...v, hist: v.hist.slice(0, -1) }, e.by), now = socialMemory(v, e.by);
  if (now.reversals > prior.reversals || e.say === 'acc' && claimRepeats(v.hist, at) > 1 && !backed(v.hist, 0, at, e.about, true)) return 'A insistência sem fatos novos prejudicou sua credibilidade.';
  const agree = (e.re || []).filter(([, a]) => a === REACT.agree).length, disagree = (e.re || []).filter(([, a]) => a === REACT.disagree).length;
  return agree > disagree ? 'Sua fala convenceu mais gente do que recebeu oposição.' : disagree > agree ? 'Sua fala recebeu mais oposição do que apoio.' : 'A mesa ainda não se convenceu: as reações ficaram divididas.';
}

/** A short, public reputation notice. No universal score and no access to actual hidden roles. */
export function reputationNotice(g: Game, at: number): { title: string; detail: string; tone: 'up' | 'down' | 'neutral' } | null {
  const e = g.hist[at];
  if (!e || e.k !== 'talk' || e.say === 'quiet' || !e.re?.length) return null;
  const detail = accusationFeedback(g, at);
  if (detail.startsWith('A insistência')) return { title: 'Credibilidade caiu', detail, tone: 'down' };
  const yes = e.re.filter(([, a]) => a === REACT.agree).length, no = e.re.filter(([, a]) => a === REACT.disagree).length;
  return yes > no ? { title: 'Sua fala ganhou apoio', detail, tone: 'up' }
    : no > yes ? { title: 'Sua fala encontrou resistência', detail, tone: 'down' }
    : { title: 'A mesa está dividida', detail, tone: 'neutral' };
}

/** End-only turning points, supported by recorded events rather than invented counterfactuals. */
export function highlights(g: Game): { at: number; kind: string; weight: number; title: string; text: string }[] {
  if (g.phase !== 'over') return [];
  const out: { at: number; kind: string; weight: number; title: string; text: string }[] = [];
  const laws = { L: 0, F: 0 };
  const count = (n: number): string => n === 0 ? 'nenhuma lei {f}' : n === 1 ? 'uma lei {f}' : `${n} leis {fs}`;
  g.hist.forEach((e, at) => {
    if ((e.k === 'gov' || e.k === 'veto') && e.pc !== undefined && e.cc !== undefined && e.pc >= 0 && e.cc >= 0 && (e.cc > e.pc || e.cc < e.pc - 1)) {
      out.push({ at, kind: 'contradiction', weight: 3, title: 'Duas versões para a mesma mão', text: `{p${e.pres}} disse que comprou ${count(e.pc)}, mas {p${e.chanc}} afirmou ter recebido ${count(e.cc)}. As duas versões não cabem na mesma compra.` });
    }
    if ((e.k === 'gov' || e.k === 'chaos') && e.law) {
      laws[e.law]++;
      const won = laws[e.law] === WIN[e.law], side = e.law === 'L' ? 'os liberais' : 'os {fs}';
      if (won) out.push({ at, kind: 'victory', weight: 6, title: e.k === 'chaos' ? 'O caos decidiu' : 'A lei que fechou o placar', text: e.k === 'chaos' ? `A mesa chegou ao limite de rejeições e perdeu a escolha da lei. O topo do baralho deu a vitória para ${side}.` : `{p${e.pres}} e {p${e.chanc}} aprovaram a última lei que faltava. Com o placar em ${laws.L} a ${laws.F}, ${side} venceram.` });
      else if (e.k === 'chaos') out.push({ at, kind: 'chaos', weight: 2, title: 'O baralho tomou a decisão', text: `As rejeições deixaram a lei nas mãos do baralho. Saiu uma lei ${e.law === 'L' ? 'liberal' : '{f}'}, e o placar foi para ${laws.L} a ${laws.F}.` });
      else if (e.law === 'F' && laws.F === HITLER_ZONE) out.push({ at, kind: 'law', weight: 2, title: 'A votação ficou perigosa', text: `{p${e.pres}} e {p${e.chanc}} aprovaram a ${HITLER_ZONE}ª lei {f}. Dali em diante, eleger o {boss} chanceler já bastava para dar a vitória aos {fs}.` });
    }
    if (e.k === 'exec') {
      const leader = g.players[e.target].role === 'hitler', liberal = g.players[e.target].role === 'liberal';
      out.push({ at, kind: leader ? 'victory' : 'power', weight: leader ? 6 : 1, title: leader ? 'O tiro que encerrou o jogo' : 'A saída de {p' + e.target + '}', text: leader ? `{p${e.by}} acertou o alvo: {p${e.target}} era o {boss}. A eliminação deu a vitória aos liberais.` : `{p${e.by}} eliminou {p${e.target}}. ${liberal ? 'Os liberais perderam' : 'O lado escondido perdeu'} um voto para as próximas decisões.` });
    }
    if (e.k === 'vote' && at === g.hist.length - 1 && g.winner === 'F' && g.players[e.chanc].role === 'hitler' && laws.F >= HITLER_ZONE && e.ja.length > g.players.filter(p => p.alive).length / 2) out.push({ at, kind: 'victory', weight: 6, title: 'A confiança no jogador errado', text: `{p${e.chanc}} recebeu ${e.ja.length} votos e virou chanceler. Era o {boss}: a eleição encerrou o jogo antes mesmo de comprar leis.` });
  });
  return out.sort((a, b) => b.weight - a.weight || a.at - b.at).slice(0, 3);
}

/** How each personality takes a claim (D30), in its own words: agreeing, unsure, disagreeing. Words only. */
const REPLY: Record<Persona, [string[], string[], string[]]> = {
  certinho: [['Faz sentido, eu também acho.', 'Concordo, as jogadas batem.'], ['Ainda não dá para dizer.', 'Prefiro esperar mais uma lei.'], ['Acho que não, viu.', 'Não foi isso que eu vi.']],
  desconfiado: [['Eu sabia!', 'Tava na cara.'], ['Hmm, de você eu também desconfio.', 'Todo mundo aqui é suspeito.'], ['Por que tanta certeza?', 'Estranho você dizer isso.']],
  cetico: [['Pode ser.', 'Tá, pode ser.'], ['Fala é fácil.', 'Mostra que eu acredito.'], ['Duvido.', 'Não me convenceu.']],
  critico: [['Dá para conferir essa hipótese na ata.', 'Quero comparar isso com os governos dele.'], ['Sem prova na ata, não sei.', 'Cadê a lei que mostra isso?'], ['Não cheguei a essa conclusão pela ata.', 'Quero conferir os votos antes de aceitar isso.']],
  centrado: [['Concordo.', 'É o que parece.'], ['Pode ser, pode não ser.', 'Ainda tô no meio.'], ['Não concordo.', 'Acho que é o contrário.']],
  blefador: [['Óbvio! Eu falei isso antes.', 'Finalmente alguém viu.'], ['Sei lá, tô de olho em todo mundo.', 'Eu confio mais em mim.'], ['Nada a ver!', 'Que viagem.']],
  caotico: [['Bora!', 'Elimina logo!'], ['Cara ou coroa?', '¯\\_(ツ)_/¯'], ['Mentira!', 'Você é que é!']]
};
// Extra lines are selected by public speaking history, without drawing randomness or changing a decision.
const MORE_REPLY: Record<Persona, [string[], string[], string[]]> = {
  "certinho": [
    [
      "Estou com você nessa.",
      "Essa leitura combina com o que vi.",
      "Faz sentido olhar para esse jogador.",
      "Também fiquei com essa impressão."
    ],
    [
      "Vou esperar a próxima jogada.",
      "Não quero acusar sem entender.",
      "Ainda falta uma peça nessa história.",
      "Prefiro conferir antes de tomar partido."
    ],
    [
      "Essa acusação me parece apressada.",
      "Eu não cheguei à mesma conclusão.",
      "Não vi motivo suficiente para isso.",
      "Precisa de mais do que essa fala."
    ]
  ],
  "desconfiado": [
    [
      "Também estou de olho.",
      "Essa história nunca me convenceu.",
      "Você percebeu isso também?",
      "Tem coisa aí que merece atenção."
    ],
    [
      "Quero ouvir a resposta primeiro.",
      "Não sei se confio na acusação ou na defesa.",
      "Vou guardar essa fala.",
      "Deixa eu ver quem aparece defendendo."
    ],
    [
      "Você está tentando desviar de quê?",
      "Essa certeza toda me incomoda.",
      "Explica melhor antes de apontar o dedo.",
      "Por que esse alvo agora?"
    ]
  ],
  "cetico": [
    [
      "É uma hipótese razoável.",
      "Dessa vez eu consigo acompanhar.",
      "Isso merece ser levado a sério.",
      "Concordo com a dúvida, sem cravar o papel."
    ],
    [
      "Uma fala não resolve isso.",
      "Vou olhar as próximas decisões.",
      "Por enquanto é só uma hipótese.",
      "Quero algo além de impressão."
    ],
    [
      "A conclusão foi longe demais.",
      "Ainda não compro essa história.",
      "Tem outra explicação possível.",
      "Você pulou umas etapas aí."
    ]
  ],
  "critico": [
    [
      "Essa leitura merece uma conferida na ata.",
      "O argumento tem fundamento.",
      "Dá para acompanhar esse raciocínio.",
      "Vale comparar isso com os próximos governos."
    ],
    [
      "Qual jogada sustenta essa conclusão?",
      "Quero separar o fato do palpite.",
      "Diz exatamente o que você observou.",
      "Vamos conferir a sequência antes."
    ],
    [
      "A explicação não fecha para mim.",
      "Isso ainda não sustenta a acusação.",
      "Uma suspeita não resolve quem mentiu.",
      "Mostra o passo que levou a essa conclusão."
    ]
  ],
  "centrado": [
    [
      "Também acho que vale investigar.",
      "Estou mais para concordar.",
      "Entendi seu ponto.",
      "Essa leitura parece razoável."
    ],
    [
      "Ainda quero ouvir os dois lados.",
      "Não tenho certeza suficiente.",
      "Vou esperar mais um governo.",
      "Pode haver mais de uma explicação."
    ],
    [
      "Não cheguei lá ainda.",
      "Para mim falta uma peça.",
      "Estou vendo de outro jeito.",
      "Eu teria mais cuidado com essa certeza."
    ]
  ],
  "blefador": [
    [
      "Finalmente alguém prestando atenção!",
      "Eu sabia que você ia perceber.",
      "Agora estamos falando a mesma língua.",
      "Pois é, não sou só eu pensando isso."
    ],
    [
      "Quero ver a resposta antes de apostar.",
      "Essa mesa está escondendo jogo.",
      "Vou deixar essa no ar por enquanto.",
      "Não vou entregar minha leitura tão fácil."
    ],
    [
      "Você quer que a gente acredite nisso?",
      "Essa história está conveniente demais.",
      "Vai precisar caprichar mais no argumento.",
      "Eu não cairia nessa tão rápido."
    ]
  ],
  "caotico": [
    [
      "Agora a mesa acordou!",
      "Ih, também senti esse cheiro.",
      "Essa eu quero ver desenrolar.",
      "Pronto, começou o interrogatório!"
    ],
    [
      "Minha teoria muda a cada governo.",
      "Tenho três suspeitos e duas certezas erradas.",
      "Vou esperar alguém se enrolar.",
      "Essa mesa está um quebra-cabeça."
    ],
    [
      "Opa, essa conclusão veio voando!",
      "Calma com esse dedo apontado!",
      "Você soltou essa e saiu correndo?",
      "Quero a versão com explicação agora."
    ]
  ]
};
/** What the one claimed says back (D30): denying it when accused, in its own way; thanking when vouched for. */
const DENY: Record<Persona, string[]> = {
  certinho: ['Pode olhar meus governos, joguei limpo.', 'Eu passei liberal quando pude.'],
  desconfiado: ['Engraçado você me acusar logo agora…', 'Quem acusa primeiro é que costuma ser.'],
  cetico: ['Prova.', 'E de onde você tirou isso?'],
  critico: ['Mostra na ata onde eu errei.', 'Minhas leis estão aí, confere.'],
  centrado: ['Entendo a dúvida, mas não sou.', 'Tá enganado, mas tudo bem.'],
  blefador: ['Eu? Sou o mais liberal dessa mesa!', 'Isso é desespero seu.'],
  caotico: ['Talvez eu seja, talvez não.', 'Me elege e descobre.']
};
const MORE_DENY: Record<Persona, string[]> = {
  "certinho": [
    "Não fiz o que você está insinuando.",
    "Me pergunta sobre a jogada, eu explico.",
    "Olha a sequência antes de decidir.",
    "Não quero ser condenado por impressão."
  ],
  "desconfiado": [
    "Você está desviando a conversa para mim?",
    "Quem ganha com essa acusação agora?",
    "Não vou aceitar esse rótulo de graça.",
    "Quero entender por que virou para mim."
  ],
  "cetico": [
    "Acusar é fácil. Sustenta isso.",
    "Qual parte foi prova e qual foi chute?",
    "Essa conclusão ainda precisa de argumento.",
    "Eu quero ouvir um motivo concreto."
  ],
  "critico": [
    "Vamos comparar as duas versões.",
    "Uma lei sozinha não conta a história toda.",
    "Diz qual jogada minha você quer discutir.",
    "Você está falando da ata ou do seu palpite?"
  ],
  "centrado": [
    "Pode perguntar, eu respondo.",
    "Eu entendo a suspeita, mas discordo.",
    "Não precisa decidir meu papel agora.",
    "Vamos olhar o que aconteceu de fato."
  ],
  "blefador": [
    "Me acusar assim está fácil demais!",
    "Essa tentativa de me queimar foi fraca.",
    "Você está apostando alto nessa história.",
    "Não vai me tirar da mesa só no grito."
  ],
  "caotico": [
    "Olha a perseguição!",
    "Fui promovido a suspeito oficial?",
    "Calma que eu também estou tentando entender.",
    "Quero meu direito a uma teoria absurda também."
  ]
};
const THANKS = ['Valeu pela confiança.', 'Obrigado, finalmente alguém.', 'É isso aí.', 'Viu? Eu falei.', 'Bom saber que alguém acompanhou meu raciocínio.', 'Vamos ver o que o próximo governo mostra.', 'Quero manter essa confiança nas próximas jogadas.', 'Pode me cobrar coerência depois.'];
function speech(xs: string[], g: Game, seat: number, at: number, mode: 'reply' | 'answer' | 'talk'): string {
  const prior = g.hist.slice(0, at).filter(e => e.k === 'talk' && (mode === 'talk' ? e.by === seat : mode === 'answer' ? e.about === seat : e.re?.some(([i]) => i === seat))).length;
  return xs[(seat * 7 + prior) % xs.length];
}
const persona = (g: Game, i: number): Persona => g.players[i].persona || 'centrado';
export const reply = (g: Game, i: number, a: number, at: number): string => {
  const t = g.hist[at];
  if (t?.k === 'talk' && t.about >= 0 && t.say !== 'quiet') {
    const v = viewOf({ ...g, hist: g.hist.slice(0, at + 1) }, i, 'react', [0, 1, 2]);
    if (socialMemory(v, t.by).reversals > socialMemory({ ...v, hist: v.hist.slice(0, -1) }, t.by).reversals) return speech(['Antes você dizia o contrário. Qual fato fez você mudar de ideia?', 'Você estava defendendo essa pessoa. O que mudou?', 'Quero entender essa troca de lado antes de concordar.', 'Você mudou de versão sem um fato novo. Explica isso.'], g, i, at, 'reply');
  }
  if (t?.k === 'talk' && t.say === 'acc' && claimRepeats(g.hist, at) > 1 && !backed(g.hist, 0, at, t.about, true)) {
    return speech(['Você já acusou essa pessoa. Qual é o fato novo?', 'Repetir não é prova. Essa insistência me faz desconfiar de você.', 'Essa acusação eu já ouvi. O que você descobriu desde então?', 'Você voltou no mesmo alvo, mas ainda falta um fato novo.', 'A insistência não está me convencendo. Quero uma jogada concreta.', 'Sem fato novo, repetir só enfraquece seu argumento.'], g, i, at, 'reply');
  }
  if (t?.k === 'talk' && t.about >= 0 && a === REACT.agree) {
    const event = [...g.hist.slice(0, at)].reverse().find(e => (e.k === 'gov' || e.k === 'veto') && (e.pres === t.about || e.chanc === t.about));
    if (event && (event.k === 'gov' || event.k === 'veto') && event.pc !== undefined && event.cc !== undefined && event.pc >= 0 && event.cc >= 0 && (event.cc > event.pc || event.cc < event.pc - 1) && t.say === 'acc') return speech(['As duas versões daquele governo não cabem na mesma mão. Vamos cobrar explicação.', 'Também quero saber qual das duas histórias daquele governo é verdadeira.', 'Essa contradição da ata merece uma resposta.'], g, i, at, 'reply');
  }
  return speech([...(REPLY[persona(g, i)][a] || ['Ainda não sei.']), ...(MORE_REPLY[persona(g, i)][a] || [])], g, i, at, 'reply');
};
export const answer = (g: Game, i: number, accused: boolean, at: number): string => speech(accused ? [...DENY[persona(g, i)], ...MORE_DENY[persona(g, i)]] : THANKS, g, i, at, 'answer');

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
  // the accusations (D45): judged by who the accused turned out to be, and by whether the record backed them then
  g.hist.forEach((e, i) => {
    if (e.k !== 'talk' || e.by !== me || e.say !== 'acc' || e.about < 0) return;
    const hidden = side(e.about) === 'F', who = P(e.about);
    if (lib && e.hit && hidden) add(i, true, 2, `Você acusou ${who} com uma prova que a ata sustentava, e era {f}: CONTRADIÇÃO! na hora certa.`);
    else if (lib && hidden) add(i, true, 1, `Você acusou ${who}, e era {f}.`);
    else if (lib && (e.tone === 'firm' || e.tone === 'proof') && !e.hit) add(i, false, 1.5, `Você acusou ${who} com firmeza sem prova que segurasse, e era liberal: queimou a sua credibilidade e jogou a mesa contra um aliado.`);
    else if (lib) add(i, false, 1, `Você acusou ${who}, que era liberal.`);
    else if (!hidden && e.hit) add(i, true, 2, `Você acusou ${who}, um liberal, com uma prova que a ata sustentava: a mesa comprou.`);
    else if (!hidden) add(i, (e.tone === 'firm' || e.tone === 'proof') ? false : true, 1, (e.tone === 'firm' || e.tone === 'proof') ? `Você acusou ${who}, um liberal, com firmeza e sem prova: a mesa pode ter desconfiado de você.` : `Você jogou a desconfiança em ${who}, um liberal.`);
    else add(i, false, 2, `Você acusou ${who}, que era do seu time.`);
  });
  g.hist.forEach((e, i) => {
    if (e.k !== 'talk' || e.about !== me || !e.def) return;
    if (e.ok) add(i, true, 1.5, `Acusado por ${P(e.by)}, você se defendeu com o que a ata sustentava, e a acusação perdeu o peso.`);
    else if (e.def !== 'quiet') add(i, false, 1, `Acusado por ${P(e.by)}, você deu uma defesa que a ata não sustentava.`);
  });
  // the notebook (D28): every seat marked right, that this seat did not know for sure, is a deduction well made
  const notes = notesScore(g, me);
  for (const i of notes.right) add(g.hist.length - 1, true, 1, `Nas anotações, você marcou ${P(i)} como ${side(i) === 'L' ? 'liberal' : g.players[i].role === 'hitler' ? '{f} (era o {boss})' : '{f}'}, e acertou.`);
  // the hidden leader elected chancellor at the end, nominated by this seat
  if (g.phase === 'over' && g.winner === 'F' && g.chanc !== null && g.pres === me && g.players[g.chanc].role === 'hitler' && g.why.includes('eleito chanceler')) {
    const at = g.hist.length - 1;
    if (lib) add(at, false, 5, `Você indicou ${P(g.chanc)} para chanceler com ${HITLER_ZONE} leis {fs} na mesa. Era o {boss}, e os {fs} ganharam.`);
    else add(at, true, 3, `Você indicou o {boss}, ${P(g.chanc)}, para chanceler com ${HITLER_ZONE} leis {fs} na mesa, e a mesa elegeu: vitória.`);
  }
  return out;
}

/** How the notebook of seat `me` did (D28), once the roles are open: the seats it marked right and wrong. What it knew
 *  for sure (its team by rule 3, what its own investigations showed) does not count: that was no deduction. */
export function notesScore(g: Game, me: number): { right: number[]; wrong: number[] } {
  const sure = new Set<number>([...knows(g, me).map(k => g.players.findIndex(p => p.name === k.name)), ...g.hist.flatMap(e => (e.k === 'inv' && e.by === me ? [e.target] : []))]);
  const right: number[] = [], wrong: number[] = [];
  for (const [k, mark] of Object.entries(g.notes || {})) {
    const i = Number(k);
    if (i === me || sure.has(i) || !g.players[i]) continue;
    (partyOf(g.players[i].role) === mark ? right : wrong).push(i);
  }
  return { right, wrong };
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
  const n: Game = { ...traced(g, ts), log: [...g.log, `Votos. ${words(g.pack, g.region).ja}: ${list(ja)}. ${words(g.pack, g.region).nein}: ${list(nein)}.`], hist: [...g.hist, { k: 'vote', pres: g.pres, chanc: g.chanc, ja }] };
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
    case 'exec': return { k: 'exec', by: e.by, target: e.target, ...(e.why ? { why: e.why } : {}) };
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
    phase: g.phase, ask: q, options: [...options], hand, hist: g.hist.map(e => seenBy(e, me))
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
    default: return justify(g, execute(g, a));
  }
}
/** D53: an app player says why it eliminated someone, from what the whole table saw: the strongest proof in the record,
 *  an accusation it had made, or that it was the one it suspected most. A hidden-side player gives a reason the same way:
 *  the reason is public, never its private reckoning. */
export function execReason(g: Game, by: number, t: number): string {
  const p = evidence(g, t), hit = p.find(x => x.hit) ?? p[0];
  if (hit) return hit.text.replace(/^./, c => c.toLowerCase());
  if (g.hist.some(e => e.k === 'talk' && e.by === by && e.about === t && e.say === 'acc')) return 'eu já tinha dito que não confiava';
  return 'era de quem eu mais desconfiava';
}
function justify(before: Game, g: Game): Game {
  const i = g.hist.length - 1, e = g.hist[i];
  if (g === before || !e || e.k !== 'exec') return g;
  const why = execReason(before, e.by, e.target);
  return { ...g, hist: g.hist.map((x, j) => (j === i ? { ...e, why } : x)), log: [...g.log, `${g.players[e.by].name}: "Eliminei ${g.players[e.target].name}: ${why}."`] };
}

/* ---------- achievements (D41) ---------- */
/** The achievements there are, with a name and how to earn them. */
export const ACHIEVEMENTS: Record<string, [string, string]> = {
  win: ['Primeira vitória', 'Vencer uma partida'],
  boss: ['Líder invisível', 'Vencer sendo o líder escondido'],
  hunter: ['Caçador', 'Eliminar o líder escondido'],
  perfect: ['Caderno perfeito', 'Acertar todas as anotações, com pelo menos 3'],
  contra: ['CONTRADIÇÃO!', 'Acusar com uma prova que bate'],
  hard: ['Mesa dura', 'Vencer contra a IA no difícil ou no extremo'],
  ghost: ['Sem rastro', 'Vencer do lado escondido sem nenhuma prova que bata contra você']
};
/** What the person in seat `me` earned in this finished game (D41). Only from what happened. */
export function achievements(g: Game, me: number): string[] {
  if (g.phase !== 'over' || !g.winner || !g.players[me]) return [];
  const role = g.players[me].role, won = partyOf(role) === g.winner, out: string[] = [];
  if (won) out.push('win');
  if (won && role === 'hitler') out.push('boss');
  if (g.hist.some(e => e.k === 'exec' && e.by === me && g.players[e.target]?.role === 'hitler')) out.push('hunter');
  const sc = notesScore(g, me);
  if (sc.right.length >= 3 && !sc.wrong.length) out.push('perfect');
  if (g.hist.some(e => e.k === 'talk' && e.by === me && e.hit)) out.push('contra');
  if (won && (g.level === 'dificil' || g.level === 'extremo') && g.players.some(p => p.ai)) out.push('hard');
  if (won && role !== 'liberal' && !g.hist.some(e => e.k === 'talk' && e.about === me && e.hit)) out.push('ghost');
  return out;
}

/** Reputation at the table (D43): 1 to 3 stars, from what everyone saw: stories that did not add up, firm accusations
 *  the record did not back, and changing one's mind about someone with nothing new in between. Never a role. */
export function reputation(g: Game, seat: number): 1 | 2 | 3 {
  const m = socialMemory(viewOf(g, seat, 'vote', [1, 0]), seat), bad = m.contradictions + 0.5 * m.reversals;
  return bad < 1 ? 3 : bad < 2 ? 2 : 1;
}

// The cases of the pure core, in one file. Two runners use them: tests/unit.py, in the browser, against the page that
// ships (window.__APP.Core), and tests/core.mjs, in Node, against src/core built by itself. Plain JavaScript on purpose:
// many cases pass data on purpose that the compiler would refuse. A new rule of the core gets its case here first.
export default function cases(Core) {
  const fails = []; let n = 0;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const eq = (name, got, want) => { n++; if (!same(got, want)) fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
  const NAMES = ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gil'];
  const rand = Core.seeded(42);
  const count = (list, x) => list.filter(y => y === x).length;

  /* chance */
  const r1 = Core.seeded(7), r2 = Core.seeded(7), xs = [r1(), r1(), r1()];
  eq('seeded: the same seed gives the same numbers, all in [0, 1)', [same(xs, [r2(), r2(), r2()]), xs.every(x => x >= 0 && x < 1)], [true, true]);
  const sh = Core.shuffle([1, 2, 3, 4, 5], Core.seeded(1));
  eq('shuffle: a copy with the same things', [[...sh].sort(), sh.length], [[1, 2, 3, 4, 5], 5]);

  /* the table */
  eq('names: trimmed and checked', [Core.checkNames(['  a ', 'b', 'c', 'd', 'e']).names, Core.checkNames(['a', 'b', 'c', 'd']).why, Core.checkNames(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']).why, Core.checkNames(['a', ' ', 'c', 'd', 'e']).why, Core.checkNames(['a', 'A', 'c', 'd', 'e']).why], [['a', 'b', 'c', 'd', 'e'], 'count', 'count', 'name', 'dup']);
  eq('names: at most NAME_MAX letters', Core.checkNames(['x'.repeat(30), 'b', 'c', 'd', 'e']).names[0].length, Core.NAME_MAX);
  eq('add name: trimmed; empty, repeated or one too many says why', [Core.addName(['Ana'], '  Bia ').names, Core.addName(['Ana'], ' ').why, Core.addName(['Ana'], 'ana').why, Core.addName('abcdefghij'.split(''), 'k').why], [['Ana', 'Bia'], 'name', 'dup', 'count']);
  for (let p = Core.MIN_PLAYERS; p <= Core.MAX_PLAYERS; p++) {
    const g = Core.newGame(NAMES.concat(['H', 'I', 'J']).slice(0, p), Core.seeded(p)).game, roles = g.players.map(x => x.role);
    eq(`new game with ${p}: one Hitler, the fascists of the table, the rest liberal`, [count(roles, 'hitler'), count(roles, 'hitler') + count(roles, 'fascista'), count(roles, 'liberal')], [1, Core.FASCISTS[p], p - Core.FASCISTS[p]]);
  }
  const g0 = Core.newGame(NAMES, rand).game;
  eq('new game: 17 laws, 11 fascist and 6 liberal, nothing on the table, everyone seeing their role', [g0.deck.length, count(g0.deck, 'F'), count(g0.deck, 'L'), g0.laws, g0.phase, g0.reveal, g0.players.every(p => p.alive), g0.pres >= 0 && g0.pres < 7], [17, 11, 6, { L: 0, F: 0 }, 'reveal', 0, true, true]);
  eq('new game: a bad table says why', Core.newGame(['a', 'b'], rand), { ok: false, why: 'count' });

  // a table of 7 with known roles: Ana Hitler, Bia and Caio fascists, the rest liberal; Duda president
  const base = { ...g0, players: NAMES.map((name, i) => ({ name, role: i === 0 ? 'hitler' : i < 3 ? 'fascista' : 'liberal', alive: true })), pres: 3, phase: 'nominate', reveal: 7 };
  const deck = (s) => s.split('');

  /* who knows whom */
  eq('knows: a fascist sees the other fascist and Hitler', Core.knows(base, 1), [{ name: 'Ana', role: 'hitler' }, { name: 'Caio', role: 'fascista' }]);
  eq('knows: at a table of 7 Hitler and the liberals see no one', [Core.knows(base, 0), Core.knows(base, 4)], [[], []]);
  const five = { ...base, players: base.players.slice(0, 5).map((p, i) => i === 2 ? { ...p, role: 'liberal' } : p) };
  eq('knows: at a table of 5 or 6 Hitler sees the fascist', [Core.knows(five, 0), Core.knows(five, 1), Core.knows(five, 2), Core.HITLER_KNOWS_UPTO], [[{ name: 'Bia', role: 'fascista' }], [{ name: 'Ana', role: 'hitler' }], [], 6]);
  let r = { ...g0 };
  for (let i = 0; i < 6; i++) r = Core.revealNext(r);
  eq('reveal: one by one, and after the last the first round begins', [r.phase, r.reveal, Core.revealNext(r).phase, Core.revealNext(Core.revealNext(r)).phase], ['reveal', 6, 'nominate', 'nominate']);

  /* election */
  eq('nominate: not the president, not the dead, only when nominating', [Core.nominate(base, 3) === base, Core.nominate({ ...base, players: base.players.map((p, i) => i === 4 ? { ...p, alive: false } : p) }, 4).phase, Core.nominate(base, 4).phase, Core.nominate(base, 4).chanc, Core.nominate(g0, 4) === g0], [true, 'nominate', 'vote', 4, true]);
  const v = Core.nominate({ ...base, deck: deck('FFLLFLFLFLFLFLFLF') }, 4);
  eq('vote: only when the table is voting', Core.vote(base, true, rand) === base, true);
  const el = Core.vote(v, true, rand);
  eq('vote: elected; the president draws 3', [el.phase, el.hand, el.deck.length, el.tracker], ['president', ['F', 'F', 'L'], 14, 0]);
  const rej = Core.vote(v, false, rand);
  eq('vote: rejected, the presidency moves on', [rej.phase, rej.pres, rej.chanc, rej.tracker], ['nominate', 4, null, 1]);
  const deadNext = Core.vote({ ...v, players: v.players.map((p, i) => i === 4 ? { ...p, alive: false } : p), chanc: 5 }, false, rand);
  eq('the presidency skips the dead', deadNext.pres, 5);
  const chaos = Core.vote({ ...v, tracker: 2 }, false, rand);
  eq('the third rejection enacts the top law, with no power, and the presidency moves on once', [chaos.laws, chaos.tracker, chaos.phase, chaos.pres, chaos.deck.length], [{ L: 0, F: 1 }, 0, 'nominate', 4, 16]);
  const chaosPower = Core.vote({ ...v, tracker: 2, laws: { L: 0, F: 1 } }, false, rand);
  eq('a law from the tracker gives no power even on the 2nd fascist law', [chaosPower.laws.F, chaosPower.phase], [2, 'nominate']);
  const chaosWin = Core.vote({ ...v, tracker: 2, laws: { L: 0, F: 5 } }, false, rand);
  eq('a law from the tracker can win the game', [chaosWin.phase, chaosWin.winner], ['over', 'F']);

  /* Hitler */
  const st = Core.nominate({ ...base, laws: { L: 0, F: 3 } }, 0);
  eq('Hitler elected chancellor with 3 fascist laws: the fascists win', [Core.vote(st, true, rand).phase, Core.vote(st, true, rand).winner], ['over', 'F']);
  eq('Hitler elected before that: nothing special', Core.vote(Core.nominate(base, 0), true, rand).phase, 'president');

  /* the laws */
  eq('president: discards one of the 3', [Core.presidentDiscard(el, 2).hand, Core.presidentDiscard(el, 2).discard, Core.presidentDiscard(el, 2).phase, Core.presidentDiscard(el, 5) === el, Core.presidentDiscard(v, 0) === v], [['F', 'F'], ['L'], 'chancellor', true, true]);
  const ch = { ...el, phase: 'chancellor', hand: ['L', 'F'], discard: ['F'] };
  const lib = Core.chancellorDiscard(ch, 1, rand);
  eq('chancellor: discards one, the other is enacted, next president', [lib.laws, lib.discard, lib.phase, lib.pres, lib.hand], [{ L: 1, F: 0 }, ['F', 'F'], 'nominate', 4, []]);
  eq('chancellor: a bad card changes nothing', [Core.chancellorDiscard(ch, 2, rand) === ch, Core.chancellorDiscard(el, 0, rand) === el], [true, true]);
  const fas = (c) => Core.chancellorDiscard({ ...ch, laws: { L: 0, F: c } }, 0, rand);
  eq('powers at a table of 7: none, investigate, special election, execute, execute, win', [fas(0).phase, fas(1).phase, fas(2).phase, fas(3).phase, fas(4).phase, fas(5).phase, fas(5).winner], ['nominate', 'investigate', 'special', 'execute', 'execute', 'over', 'F']);
  const powers = (n) => [1, 2, 3, 4, 5].map(k => Core.powerAt({ players: Array(n).fill(base.players[4]) }, k) || null);
  eq('the boards of the original: 5-6, 7-8 and 9-10 players', [powers(5), powers(6), powers(8), powers(9), powers(10), Core.boardOf(7)], [[null, null, 'peek', 'execute', 'execute'], [null, null, 'peek', 'execute', 'execute'], [null, 'investigate', 'special', 'execute', 'execute'], ['investigate', 'investigate', 'special', 'execute', 'execute'], ['investigate', 'investigate', 'special', 'execute', 'execute'], 'medium']);
  eq('5 liberal laws win for the liberals, 4 do not; 6 fascist laws for the fascists', [Core.WIN, Core.chancellorDiscard({ ...ch, laws: { L: 4, F: 0 } }, 1, rand).winner, Core.chancellorDiscard({ ...ch, laws: { L: 3, F: 0 } }, 1, rand).phase], [{ L: 5, F: 6 }, 'L', 'nominate']);
  const low = Core.chancellorDiscard({ ...ch, deck: ['L', 'F'], discard: ['F', 'L', 'F'] }, 1, rand);
  eq('fewer than 3 to draw: the discards go back in', [low.deck.length, low.discard.length], [6, 0]);

  /* term limits */
  eq('elected: the government is remembered', [el.lastPres, el.lastChanc], [3, 4]);
  const tl = { ...base, lastPres: 2, lastChanc: 5 };
  eq('term limits: the last president and chancellor cannot be chancellor', [Core.canNominate(tl, 2), Core.canNominate(tl, 5), Core.canNominate(tl, 6)], [false, false, true]);
  const small = { ...tl, players: tl.players.map((p, i) => i === 0 || i === 1 ? { ...p, alive: false } : p) };
  eq('term limits with 5 alive: only the last chancellor is barred', [Core.canNominate(small, 2), Core.canNominate(small, 5)], [true, false]);
  eq('chaos forgets the term limits', [chaos.lastPres, chaos.lastChanc, Core.vote({ ...v, lastPres: 1 }, false, rand).lastPres], [null, null, 1]);

  /* veto */
  const vt = { ...ch, laws: { L: 0, F: 5 }, tracker: 0 };
  eq('veto: only from the 5th fascist law, in the hand of the chancellor', [Core.canVeto(ch), Core.canVeto(vt), Core.askVeto(ch) === ch, Core.askVeto(vt).phase], [false, true, true, 'veto']);
  const asked = Core.askVeto(vt), yes = Core.answerVeto(asked, true, rand), no = Core.answerVeto(asked, false, rand);
  eq('veto accepted: both laws discarded, counts as a failed government', [yes.phase, yes.laws, yes.discard.length, yes.tracker, yes.pres], ['nominate', { L: 0, F: 5 }, 3, 1, 4]);
  eq('veto refused: back to the chancellor, who cannot ask again', [no.phase, no.vetoed, Core.canVeto(no), Core.answerVeto(vt, true, rand) === vt], ['chancellor', true, false, true]);
  const yes3 = Core.answerVeto({ ...asked, tracker: 2 }, true, rand);
  eq('a third failure by veto enacts the top law', [yes3.laws.L + yes3.laws.F, yes3.tracker], [6, 0]);
  eq('a new government may veto again', Core.answerVeto(asked, true, rand).vetoed, false);

  /* powers */
  const inv = fas(1);
  eq('investigate: not self, not dead', [Core.investigate(inv, inv.pres) === inv, Core.canTarget(inv, 0), Core.canTarget(base, 0)], [true, true, false]);
  const seen = Core.investigate(inv, 0);
  eq('investigate: Hitler shows as fascist; a liberal as liberal', [seen.phase, Core.investigated(seen), Core.investigated(Core.investigate(inv, 5)), Core.investigated(inv)], ['investigated', 'F', 'L', null]);
  eq('no one is investigated twice', [Core.canTarget({ ...inv, seen: [0] }, 0), seen.seen], [false, [0]]);
  eq('after seeing, the next round', [Core.endPower(seen).phase, Core.endPower(seen).pres, Core.endPower(base) === base], ['nominate', 4, true]);
  const sp = fas(2), se = Core.specialElect(sp, 6);
  eq('special election: the president picks the next president, not self, term limits do not apply', [sp.phase, Core.specialElect(sp, 3) === sp, Core.specialElect(sp, 4).pres, se.phase, se.pres, se.back, Core.specialElect(base, 6) === base], ['special', true, 4, 'nominate', 6, 3, true]);
  const after = Core.vote(Core.nominate(se, 1), false, rand);
  eq('after the special round the order goes on from the one who called it', [after.pres, after.back], [4, null]);
  const pk = Core.chancellorDiscard({ ...ch, players: five.players, laws: { L: 0, F: 2 } }, 0, rand);
  eq('peek: the 3 laws on top stay where they are', [Core.endPower(pk).phase, Core.endPower(pk).deck.slice(0, 3), Core.endPower(pk).log.at(-1)], ['nominate', pk.deck.slice(0, 3), 'Duda olhou as próximas 3 leis.']);
  const ex = fas(3);
  const ex1 = Core.execute(ex, 5);
  eq('execute: the player is out, the game goes on', [ex1.players[5].alive, ex1.phase, Core.execute(ex, 3) === ex, Core.execute(ex1, 5) === ex1], [false, 'nominate', true, true]);
  eq('execute Hitler: the liberals win', [Core.execute(ex, 0).winner, Core.execute(ex, 0).phase], ['L', 'over']);

  /* the history, for the end-of-game summary */
  eq('history: a government and its law, and a rejection', [lib.hist.at(-1), rej.hist.at(-1)], [{ k: 'gov', pres: 3, chanc: 4, law: 'L', drew: ['F', 'F', 'L'], got: ['L', 'F'] }, { k: 'rej', pres: 3, chanc: 4 }]);
  eq('history: the chaos law is recorded as chaos', chaos.hist.at(-1), { k: 'chaos', law: 'F' });
  eq('history: an investigation keeps the party really seen', [seen.hist.at(-1), Core.investigate(inv, 5).hist.at(-1)], [{ k: 'inv', by: 3, target: 0, party: 'F' }, { k: 'inv', by: 3, target: 5, party: 'L' }]);
  eq('history: peek, special election, elimination, veto', [Core.endPower(pk).hist.at(-1).k, se.hist.at(-1), ex1.hist.at(-1), yes.hist.at(-1)], ['peek', { k: 'special', by: 3, target: 6 }, { k: 'exec', by: 3, target: 5, role: 'liberal' }, { k: 'veto', pres: 3, chanc: 4, drew: ['F', 'F', 'L'], got: ['L', 'F'] }]);
  eq('history: a game saved before the history existed reads with an empty one; a broken one is dropped', [Core.readGame((({ hist, ...rest }) => rest)(el)).hist, Core.readGame({ ...el, hist: 'x' }), Core.readGame({ ...el, hist: [1] })], [[], null, null]);

  eq('history: a peek keeps the 3 laws seen', Core.endPower(pk).hist.at(-1).saw, pk.deck.slice(0, 3));
  const short = Core.answerVeto(Core.askVeto(Core.presidentDiscard(Core.vote({ ...base, phase: 'vote', chanc: 4, laws: { L: 0, F: 5 }, deck: deck('FFL'), discard: deck('LLLFFFLFFFLF') }, true, rand), 0)), true, rand);
  eq('a vetoed session ends like any other: fewer than 3 laws left, the discards go back in', [short.deck.length, short.discard.length, Core.vote(Core.nominate(short, 1), true, rand).hand.length], [15, 0, 3]);
  eq('a nomination is said to the table', Core.nominate(base, 4).log.at(-1), 'Duda indicou Edu para chanceler.');

  /* players run by the app (D10) */
  eq('levels, easiest first; names for the app players skip those at the table', [Core.LEVELS, Core.botName(['churchill', 'Roosevelt']), Core.botName([])], [['facil', 'medio', 'dificil', 'extremo'], 'Mussolini', 'Churchill']);
  const BN = Core.BOT_NAMES.fascismo;
  eq('names for the app players: well-known politicians, at random among the free ones; Hitler is a role, not a name', [BN.length >= Core.MAX_PLAYERS - 1, BN.includes('Hitler'), BN.includes(Core.botName(['Churchill'], Core.seeded(4))), Core.botName(['Churchill'], () => 0), Core.botName(BN)], [true, false, true, 'Mussolini', `IA ${BN.length + 1}`]);
  /* the communist theme (D12): the same rules, other words */
  eq('themes: the words of each; an unknown theme is the original', [Core.PACKS, Core.words().boss, Core.words('comunismo').boss, Core.words('comunismo').f, Core.words('comunismo').ja, Core.words('x').f], [['fascismo', 'comunismo'], 'Hitler', 'Stalin', 'comunista', 'Da!', 'fascista']);
  eq('themes: names of liberals and communists, Stalin left out; the theme picks the list', [Core.BOT_NAMES.comunismo.length >= Core.MAX_PLAYERS - 1, Core.BOT_NAMES.comunismo.includes('Stalin'), Core.botName([], () => 0, 'comunismo'), Core.BOT_NAMES.comunismo.includes(Core.botName(['Lenin'], Core.seeded(2), 'comunismo'))], [true, false, 'Kennedy', true]);
  const red = Core.newGame(NAMES, Core.seeded(3), { pack: 'comunismo' }).game;
  const redStacked = { ...red, players: base.players, pres: 3, phase: 'vote', chanc: 4, reveal: 7, deck: deck('FFFLLL') };
  const redLaw = Core.chancellorDiscard(Core.presidentDiscard(Core.vote(redStacked, true, rand), 0), 0, rand);
  eq('themes: the game keeps its theme and speaks it; the rules are the same', [red.pack, 'pack' in g0, redLaw.log.at(-1).startsWith('Lei comunista aprovada'), redLaw.laws, Core.vote({ ...redStacked, chanc: 0, laws: { L: 0, F: 3 } }, true, rand).why, Core.execute({ ...redStacked, phase: 'execute' }, 0).why], ['comunismo', false, true, { L: 0, F: 1 }, 'Stalin (Ana) foi eleito chanceler: os comunistas vencem.', 'Stalin (Ana) foi eliminado: os liberais vencem.']);
  eq('read state: the theme and the notes are kept; nonsense is dropped', [Core.readState({ pack: 'comunismo', notes: { 1: 'F', 2: 'L', x: 'F', 3: 'Q' } }).pack, Core.readState({ notes: { 1: 'F', 2: 'L', x: 'F', 3: 'Q' } }).notes, 'pack' in Core.readState({ pack: 'monarquia' }), 'notes' in Core.readState({ notes: { a: 1 } }), Core.readGame({ ...el, pack: 'monarquia' }), !!Core.readGame({ ...el, pack: 'comunismo' })], ['comunismo', { 1: 'F', 2: 'L' }, false, false, null, true]);
  const solo = (train, seed) => Core.newGame(NAMES, Core.seeded(seed), { ai: [false, true, true, true, true, true, true], level: 'medio', train }).game;
  eq('training: the one person gets the role chosen, the table keeps its roles, and the game remembers the choice', ['liberal', 'fascista', 'hitler'].flatMap(r => [1, 2, 3].map(sd => { const g = solo(r, sd), roles = g.players.map(p => p.role); return g.players[0].role === r && g.train === r && roles.filter(x => x === 'hitler').length === 1 && roles.filter(x => x === 'liberal').length === 4; })).every(Boolean), true);
  eq('training: without app players, with more than one person, or with a role that does not exist, the role is dealt as usual', ['train' in Core.newGame(NAMES, Core.seeded(1), { train: 'hitler' }).game, 'train' in Core.newGame(NAMES, Core.seeded(1), { ai: [false, false, true, true, true, true, true], train: 'hitler' }).game, 'train' in solo('rei', 1)], [false, false, false]);
  const aiG = Core.newGame(NAMES, Core.seeded(3), { ai: [false, true, true, true, true, true, true], level: 'extremo' }).game;
  eq('new game with app players: seats marked, level kept; without them no level; a bad level falls to medium', [aiG.players.map(p => !!p.ai), aiG.level, 'level' in g0, Core.newGame(NAMES, rand, { ai: [true], level: 'x' }).game.level, Core.hasAi(aiG), Core.hasAi(g0), Core.humansAlive(aiG)], [[false, true, true, true, true, true, true], 'extremo', false, 'medio', true, false, [0]]);
  const ai7 = (over) => ({ ...base, players: base.players.map((p, i) => (i ? { ...p, ai: true } : p)), level: 'medio', ...over });
  // a history with every secret in it: Duda (3) president with Edu (4), Duda investigated Ana (Hitler), Fê (5) spied, Gil (6) eliminated
  const secrets = [{ k: 'gov', pres: 3, chanc: 4, law: 'F', drew: deck('FFL'), got: deck('FF') }, { k: 'inv', by: 3, target: 0, party: 'F' }, { k: 'peek', by: 5, saw: deck('LFF') }, { k: 'exec', by: 3, target: 6, role: 'liberal' }];
  const sg = ai7({ hist: secrets });
  const v4 = Core.viewOf(sg, 4, 'vote', [1, 0]), v3 = Core.viewOf(sg, 3, 'vote', [1, 0]), v1 = Core.viewOf(sg, 1, 'vote', [1, 0]), v0 = Core.viewOf(sg, 0, 'vote', [1, 0]);
  eq('view: a liberal knows its own role only', v4.known, [null, null, null, null, 'liberal', null, null]);
  eq('view: a fascist knows every role; Hitler at a table of 7 only his own', [v1.known, v0.known], [['hitler', 'fascista', 'fascista', 'liberal', 'liberal', 'liberal', 'liberal'], ['hitler', null, null, null, null, null, null]]);
  eq('view: the chancellor sees what it got, not what the president drew; no one sees the role of who was eliminated', [v4.hist[0], v4.hist[3]], [{ k: 'gov', pres: 3, chanc: 4, law: 'F', got: ['F', 'F'] }, { k: 'exec', by: 3, target: 6 }]);
  eq('view: the president sees its hand and its investigation; the others see neither, nor the spied laws', [v3.hist[0].drew, v3.hist[1].party, 'party' in v4.hist[1], 'saw' in v4.hist[2], v1.hist[2].saw, Core.viewOf(sg, 5, 'vote', [1, 0]).hist[2].saw], [['F', 'F', 'L'], 'F', false, false, undefined, ['L', 'F', 'F']]);
  const blind = JSON.stringify(Core.viewOf(sg, 6, 'vote', [1, 0]));
  eq('view: nothing secret of others anywhere in what a liberal gets', ['hitler', 'fascista', 'drew', 'got', 'party', 'saw'].map(w => blind.includes(w)), [false, false, false, false, false, false]);
  eq('view: the question, the answers allowed, and the hand only when asked about it', [v4.ask, v4.options, v4.hand, Core.viewOf({ ...sg, phase: 'president', hand: deck('FLF') }, 3, 'pdiscard', [0, 1, 2]).hand], ['vote', [1, 0], [], ['F', 'L', 'F']]);

  // deciding: rand near 1 means no careless moment and no trick
  const hi = () => 0.99;
  const view = (over) => ({ me: 4, role: 'liberal', level: 'medio', mood: 0, n: 7, alive: Array(7).fill(true), known: [null, null, null, null, 'liberal', null, null], fascists: 3, laws: { L: 0, F: 0 }, tracker: 0, pres: 3, chanc: 4, lastPres: null, lastChanc: null, ask: 'vote', options: [1, 0], hand: [], hist: [], ...over });
  eq('a liberal president throws a fascist law away; a liberal chancellor makes the liberal one', [Core.decide(view({ me: 3, known: [null, null, null, 'liberal', null, null, null], ask: 'pdiscard', options: [0, 1, 2], hand: deck('LFF') }), hi), Core.decide(view({ ask: 'cdiscard', options: [0, 1], hand: deck('FL') }), hi)], [1, 0]);
  const knowAll = ['hitler', 'fascista', 'fascista', 'liberal', 'liberal', 'liberal', 'liberal'];
  eq('a fascist chancellor makes the fascist law, and asks to veto two liberal ones', [Core.decide(view({ me: 1, role: 'fascista', known: knowAll, ask: 'cdiscard', options: [0, 1], hand: deck('FL') }), hi), Core.decide(view({ me: 1, role: 'fascista', known: knowAll, ask: 'cdiscard', options: [0, 1, 2], hand: deck('LL'), laws: { L: 0, F: 5 } }), hi)], [1, 2]);
  eq('from the 3rd fascist law, a fascist president nominates Hitler', Core.decide(view({ me: 1, role: 'fascista', known: knowAll, pres: 1, chanc: null, ask: 'nominate', options: [0, 2, 3, 4], laws: { L: 1, F: 3 } }), hi), 0);
  eq('an answer is always one of the options, even when the option the player would pick is not there', Core.decide(view({ me: 1, role: 'fascista', known: knowAll, pres: 1, chanc: null, ask: 'nominate', options: [5], laws: { L: 1, F: 3 } }), hi), 5);
  eq('a liberal tells the truth about its hand and its investigation', [Core.decide(view({ me: 3, ask: 'pc', options: [0, 1, 2, 3], hist: [secrets[0]] }), hi), Core.decide(view({ ask: 'cc', options: [0, 1, 2], hist: [secrets[0]] }), hi), Core.decide(view({ me: 3, ask: 'inv', options: [0, 1], hist: [secrets[1]] }), hi)], [2, 2, 1]);
  eq('a fascist president who passed two fascist laws out of a hand with a liberal says it drew 3 fascist', Core.decide(view({ me: 1, role: 'fascista', known: knowAll, ask: 'pc', options: [0, 1, 2, 3], hist: [{ k: 'gov', pres: 1, chanc: 4, law: 'F', drew: deck('FLF'), got: deck('FF') }] }), () => 0), 3);
  // believing: a liberal president passed a liberal and a fascist law; the chancellor made the fascist one and said both were fascist
  const caught = Core.believe(view({ me: 3, known: [null, null, null, 'liberal', null, null, null], level: 'extremo', hist: [{ k: 'gov', pres: 3, chanc: 5, law: 'F', drew: deck('FFL'), got: deck('FL'), pc: 2, cc: 2 }] }));
  eq('believing: the president who was lied to knows the chancellor is a fascist', caught.pF[5] > 0.99, true);
  const told = Core.believe(view({ level: 'extremo', hist: [{ k: 'inv', by: 4, target: 2, party: 'F' }] }));
  eq('believing: what it investigated itself is certain; the odds of each seat add up to the fascists of the table', [Math.round(told.pF[2] * 1e9) / 1e9, Math.round(told.pF.reduce((a, x) => a + x, 0) * 1000) / 1000, Math.round(told.pH.reduce((a, x) => a + x, 0) * 1000) / 1000, told.pF[4]], [1, 3, 1, 0]);
  const zoned = Core.believe(view({ level: 'extremo', laws: { L: 0, F: 4 }, hist: [{ k: 'chaos', law: 'F' }, { k: 'chaos', law: 'F' }, { k: 'chaos', law: 'F' }, { k: 'gov', pres: 2, chanc: 6, law: 'F' }] }));
  eq('believing: someone elected chancellor with 3 fascist laws already on the table is not Hitler', [zoned.pH[6] < 0.01, zoned.pH[2] > 0.1], [true, true]);
  eq('the odds of a hand: 0 to 3 fascist laws, adding up to 1', [Core.drawOdds(11, 6).length, Math.round(Core.drawOdds(11, 6).reduce((a, x) => a + x, 0) * 1e6), Math.round(Core.drawOdds(11, 6)[3] * 1000), Core.drawOdds(1, 1)], [4, 1e6, 243, [0.25, 0.25, 0.25, 0.25]]);
  eq('a seat may have a level of its own (the measurements use it); a bad one is damage', [Core.viewOf({ ...sg, players: sg.players.map((p, i) => (i === 4 ? { ...p, level: 'facil' } : p)) }, 4, 'vote', [1, 0]).level, Core.viewOf(sg, 4, 'vote', [1, 0]).level, Core.readGame({ ...el, players: el.players.map(p => ({ ...p, level: 'x' })) })], ['facil', 'medio', null]);
  eq('the levels: fascists who think about how the table sees them only from the hard level up', Core.LEVELS.map(l => Core.AI[l].image > 0 && Core.AI[l].plan), [false, false, true, true]);
  eq('the levels: careless to careful, believing to doubting, and only the extreme counts the laws', [Core.LEVELS.map(l => Core.AI[l].noise > Core.AI.extremo.noise), Core.LEVELS.map(l => Core.AI[l].count), Core.AI.facil.lie < Core.AI.medio.lie && Core.AI.medio.lie < Core.AI.dificil.lie && Core.AI.dificil.lie < Core.AI.extremo.lie], [[true, true, true, false], [false, false, false, true], true]);

  // the votes, one by one, where the app plays some seats
  const vg = ai7({ phase: 'vote', chanc: 4, reveal: 7 });
  eq('votes: without the vote of the person at the table nothing happens', Core.castVotes(vg, {}, rand), vg);
  const voted = Core.castVotes(vg, { 0: true }, Core.seeded(5));
  eq('votes: every vote is recorded for all to see, and more Ja! than Nein! elects', [voted.hist.at(-1).k, voted.hist.at(-1).ja.includes(0), voted.hist.at(-1).ja.includes(3), voted.hist.at(-1).ja.includes(4), voted.log.some(l => l.startsWith('Votos. Ja!: Ana')), (voted.phase === 'president') === (voted.hist.at(-1).ja.length > 3)], ['vote', true, true, true, true, true]);
  const tie = ai7({ phase: 'vote', chanc: 4, players: ai7().players.map((p, i) => (i === 6 ? { ...p, alive: false } : p)) });
  eq('votes: a tie rejects', ((t) => t.hist.at(-1).ja.length === 3 ? t.phase : 'nominate')(Core.castVotes(tie, { 0: false }, Core.seeded(8))), 'nominate');
  // what each seat tells the table
  const said = ai7({ phase: 'nominate', pres: 4, hist: [{ k: 'gov', pres: 0, chanc: 3, law: 'L', drew: deck('FFL'), got: deck('FL') }] });
  const s1 = Core.say(said, 0, 'pc', 2);
  eq('telling the table: the president may say what it drew, once; the log says it', [Core.claims(said, 0), Core.claims(said, 3), s1.hist[0].pc, s1.log.at(-1), Core.say(s1, 0, 'pc', 3) === s1, Core.claims(s1, 0)], [['pc'], ['cc'], 2, 'Ana (presidente) disse que tirou 2 fascistas e 1 liberal.', true, []]);
  eq('telling the table: only who was there, only possible numbers; keeping quiet is -1', [Core.say(said, 4, 'pc', 1) === said, Core.say(said, 0, 'pc', 4) === said, Core.say(said, 3, 'cc', -1).hist[0].cc, Core.say(said, 3, 'cc', -1).log.at(-1)], [true, true, -1, 'Duda não disse o que recebeu.']);
  eq('telling the table: a new election closes it', Core.claims({ ...said, hist: [...said.hist, { k: 'rej', pres: 4, chanc: 1 }] }, 0), []);
  const invd = ai7({ phase: 'nominate', hist: [{ k: 'inv', by: 0, target: 1, party: 'F' }, { k: 'peek', by: 0, saw: deck('FFL') }] });
  eq('telling the table: an investigation and a spying', [Core.claims(invd, 0), Core.say(invd, 0, 'inv', 0).log.at(-1), Core.say(invd, 0, 'peek', 2).log.at(-1), Core.claims({ ...invd, phase: 'investigated' }, 0)], [['inv', 'peek'], 'Ana disse que Bia é liberal.', 'Ana disse que as próximas 3 leis são 2 fascistas e 1 liberal.', ['peek']]);
  // whose turn
  eq('whose turn: players run by the app see their roles by themselves; a person sees theirs', [Core.botTurn(ai7({ phase: 'reveal', reveal: 0 })), Core.botTurn(ai7({ phase: 'reveal', reveal: 2 })).ask, Core.botStep(ai7({ phase: 'reveal', reveal: 2 }), rand).reveal], [null, 'reveal', 3]);
  eq('whose turn: the president tells first, then the chancellor, before the game goes on', [Core.botTurn(ai7({ phase: 'nominate', pres: 2, hist: [{ k: 'gov', pres: 5, chanc: 6, law: 'L', drew: deck('LLF'), got: deck('LL') }] })).seat, Core.botTurn(ai7({ phase: 'nominate', pres: 2, hist: [{ k: 'gov', pres: 5, chanc: 6, law: 'L', drew: deck('LLF'), got: deck('LL'), pc: 0 }] })).seat], [5, 6]);
  eq('whose turn: the vote waits for the person; with no person left, the app votes alone', [Core.botTurn(ai7({ phase: 'vote', chanc: 4 })), Core.botTurn(ai7({ phase: 'vote', chanc: 4, players: ai7().players.map((p, i) => (i ? p : { ...p, alive: false })) })).ask], [null, 'votes']);
  eq('whose turn: a question with no possible answer is never asked', Core.botTurn(ai7({ phase: 'nominate', pres: 1, lastChanc: 2, players: ai7().players.map((p, i) => (i === 1 || i === 2 ? p : { ...p, alive: false })) })), null);
  eq('whose turn: nobody at a table of people only, nobody after the end', [Core.botTurn(base), Core.botTurn(ai7({ phase: 'over' })), Core.botStep(base, rand)], [null, null, null]);
  // whole games with only players run by the app: every step is a move the rules accept, and every game ends
  let ended = 0, played = 0, moved = true, kept = true, honest = true, explained = true;
  for (const level of Core.LEVELS) for (let n = Core.MIN_PLAYERS; n <= Core.MAX_PLAYERS; n++) {
    const r = Core.seeded(n * 31 + level.length), names = Core.BOT_NAMES.fascismo.slice(0, n);
    let g = Core.newGame(names, r, { ai: names.map(() => true), level }).game;
    for (let step = 0; step < 600 && g.phase !== 'over'; step++) {
      const next = Core.botStep(g, r);
      if (!next || next === g || JSON.stringify(next) === JSON.stringify(g)) { moved = false; break; }
      g = next;
      if (!Core.readGame(JSON.parse(JSON.stringify(g)))) kept = false;
    }
    played++; if (g.phase === 'over' && g.winner) ended++;
    const back = Core.readGame(JSON.parse(JSON.stringify(g)));
    if (!g.trace || !g.trace.length || !back || !back.trace || back.trace.length !== g.trace.length || !g.trace.every(t => g.players[t.seat].ai && t.why.text.length && t.why.text.every(l => typeof l === 'string' && l.length && !l.includes('undefined') && !l.includes('NaN')))) explained = false;
    for (const e of g.hist) if ((e.k === 'gov' || e.k === 'veto') && g.players[e.pres].role === 'liberal' && e.pc !== undefined && e.pc !== e.drew.filter(l => l === 'F').length) honest = false;
  }
  eq('games with only app players, every level, every table size: every step moves, every state can be saved, every game ends, liberals never lie', [ended, moved, kept, honest], [played, true, true, true]);
  eq('reasoning (D16): every decision of an app player is recorded with its reason, in words, and the record is saved', explained, true);
  const wv = Core.viewOf(ai7({ phase: 'vote', pres: 3, chanc: 4 }), 5, 'vote', [1, 0]), r3 = Core.seeded(3), r4 = Core.seeded(3), w = Core.decideWhy(wv, r3);
  eq('reasoning: the answer with a reason is the same answer, draw for draw; a vote tells the risk it weighed, with the government in the rows', [w.a, w.a === Core.decide(wv, r4), r3() === r4(), w.why.text.some(l => l.includes('Chance de ter alguém do lado escondido')) || w.why.text.some(l => l.includes('sem pensar')), (w.why.rows || []).map(x => x.seat).sort()], [w.a, true, true, true, [3, 4]]);
  const iv = Core.decideWhy(Core.viewOf(ai7({ phase: 'investigate', pres: 5, hist: [{ k: 'gov', pres: 3, chanc: 4, law: 'L', pc: 1, cc: 0 }] }), 5, 'investigate', [0, 1, 2, 3, 4, 6]), () => 0.99);
  eq('reasoning: a liberal investigating says it picks the one it doubts the most, and shows that doubt for each', [Core.viewOf(ai7({}), 5, 'vote', [1, 0]).role, iv.why.text.some(l => l.includes('mais dúvida')), iv.why.rows.length, iv.why.rows.every(x => typeof x.v === 'number')], ['liberal', true, 6, true]);
  const tg = ai7({ phase: 'nominate', hist: [{ k: 'gov', pres: 3, chanc: 4, law: 'L', pc: 1, cc: 0 }, { k: 'rej', pres: 4, chanc: 6 }, { k: 'gov', pres: 0, chanc: 5, law: 'F', pc: 3, cc: 1 }] }), tr = Core.trail(tg, 6);
  eq('belief trail: from the start and after each law, what the seat believed of each, from its own seat (a liberal is sure only of itself)', [tr.map(x => x.at), tr.every(x => x.f.length === 7 && x.f.every(f => f >= 0 && f <= 1)), tr[0].f[6], tr[2].f[0] > tr[0].f[0]], [[-1, 0, 2], true, 0, true]);
  // the review of a person's plays (D19): Ana Hitler, Bia and Caio fascists, the rest liberal
  const rv = (hist, me, over = {}) => Core.review(ai7({ phase: 'over', hist, ...over }), me);
  const tossed = rv([{ k: 'gov', pres: 3, chanc: 4, law: 'F', drew: deck('FFL'), got: deck('FF'), pc: 3, cc: 2 }], 3);
  eq('review: a liberal president who threw the liberal law away and lied about it: two bad plays', [tossed.length, tossed.every(x => !x.good), tossed[0].weight, tossed.some(x => x.text.includes('jogando fora a liberal')), tossed.some(x => x.text.includes('mente'))], [2, true, 3, true, true]);
  const keptL = rv([{ k: 'gov', pres: 4, chanc: 3, law: 'L', drew: deck('FFL'), got: deck('FL'), pc: 2, cc: 1 }], 3);
  eq('review: a liberal chancellor who passed the liberal law with a fascist one in hand: a good play', keptL.map(x => [x.good, x.weight]), [[true, 1]]);
  eq('review: a liberal eliminating Hitler wins the game; a fascist eliminating a liberal does well; Bia eliminating Caio does not', [rv([{ k: 'exec', by: 4, target: 0, role: 'hitler' }], 4).map(x => [x.good, x.weight]), rv([{ k: 'exec', by: 1, target: 5, role: 'liberal' }], 1).map(x => x.good), rv([{ k: 'exec', by: 1, target: 2, role: 'fascista' }], 1).map(x => x.good)], [[[true, 5]], [true], [false]]);
  const pushed = rv([{ k: 'gov', pres: 1, chanc: 2, law: 'F', drew: deck('FFL'), got: deck('FF'), pc: 3, cc: 2 }], 1);
  eq('review: a fascist law pushed through is judged by how much the table caught on, with the numbers', [pushed.some(x => x.text.includes('lei {f}') && /\d+% → \d+%/.test(x.text)), pushed.every(x => typeof x.good === 'boolean')], [true, true]);
  const firstVote = rv([{ k: 'vote', pres: 3, chanc: 0, ja: [3, 4, 5, 6, 0] }, { k: 'gov', pres: 3, chanc: 0, law: 'L', drew: deck('LLF'), got: deck('LL') }], 5);
  eq('review: voting Ja! for a government with Hitler in the first round, with nothing to go on, is not called bad', firstVote.filter(x => !x.good).length, 0);
  eq('review: names come as {pN}, never as text that could hold markup; no undefined or NaN', [tossed, keptL, pushed].flat().every(x => !/undefined|NaN/.test(x.text) && !NAMES.some(nm => x.text.includes(nm))), true);
  eq('read state: closing a secret with the phone face down is kept only when turned on (D20)', [Core.readState({ flip: true }).flip, 'flip' in Core.readState({ flip: 'yes' }), 'flip' in Core.readState({})], [true, false, false]);
  // the chancellor test (D22): Duda (3, liberal) drew 1F 2L, passed one of each to Edu (4), said so; Edu enacted the liberal
  const tested = ai7({ phase: 'nominate', level: 'dificil', hist: [{ k: 'vote', pres: 3, chanc: 4, ja: [0, 1, 2, 3, 4, 5, 6] }, { k: 'gov', pres: 3, chanc: 4, law: 'L', drew: deck('FLL'), got: deck('FL'), pc: 1, cc: 1 }] });
  const fromChanc = Core.believe(Core.viewOf(tested, 4, 'vote', [1, 0])).pF[3], fromOut = Core.believe(Core.viewOf(tested, 5, 'vote', [1, 0])).pF[3], prior = Core.believe(Core.viewOf(ai7({ level: 'dificil' }), 4, 'vote', [1, 0])).pF[3];
  eq('chancellor test: the tested chancellor, and the table, suspect the tester more, but never take one play as proof', [fromChanc > prior + 0.1, fromChanc < 0.9, fromOut > prior, fromOut < 0.9], [true, true, true, true]);
  const tc = Core.coach(tested, 6);
  eq('chancellor test: the trainer calls it a test, not a story that does not hold together', [tc.test, tc.clash], [true, false]);
  const tv = (level) => Core.viewOf(ai7({ phase: 'president', level, pres: 3, chanc: 4, hand: deck('FLL') }), 3, 'pdiscard', [0, 1, 2]);
  eq('chancellor test: a liberal of the hard levels tests a chancellor it is unsure of (throws a liberal law away); easier levels never do', [deck('FLL')[Core.decide(tv('dificil'), () => 0.1)], deck('FLL')[Core.decide(tv('medio'), () => 0.1)], deck('FLL')[Core.decide(tv('dificil'), () => 0.9)]], ['L', 'F', 'F']);
  const rt = rv([{ k: 'gov', pres: 3, chanc: 4, law: 'L', drew: deck('FLL'), got: deck('FL'), pc: 1, cc: 1 }], 3), rf = rv([{ k: 'gov', pres: 3, chanc: 1, law: 'F', drew: deck('FLL'), got: deck('FL'), pc: 1, cc: 2 }], 3);
  eq('review: a test that showed a liberal is a small good play; one that cost a fascist law is a bad one; neither is called throwing a liberal away or lying', [rt.every(x => x.good) && rt.some(x => x.text.includes('testou')), rf.some(x => !x.good && x.text.includes('custou')), [...rt, ...rf].some(x => x.text.includes('mente'))], [true, true, false]);
  // not naive (D22): the levels that read the long game know Hitler keeps clean early, check spied hands, read votes
  const at = (level, hist, seat = 6) => Core.believe(Core.viewOf(ai7({ level, hist }), seat, 'vote', [1, 0]));
  const clean = [{ k: 'gov', pres: 3, chanc: 0, law: 'L', pc: 1, cc: 1 }, { k: 'gov', pres: 4, chanc: 0, law: 'L', pc: 1, cc: 1 }];
  eq('not naive: a chancellor who let liberal laws through early is still a Hitler suspect for the hard levels, cleared for the easy ones', at('dificil', clean).pH[0] > at('medio', clean).pH[0], true);
  const spied = [{ k: 'peek', by: 5, said: 0 }, { k: 'gov', pres: 3, chanc: 4, law: 'F', pc: 3, cc: 2 }];
  eq('not naive: a president whose hand does not match what someone spied is caught by the hard levels', at('dificil', spied).pF[3] + at('dificil', spied).pF[5] > at('medio', spied).pF[3] + at('medio', spied).pF[5], true);
  const picks = [{ k: 'rej', pres: 1, chanc: 2 }, { k: 'rej', pres: 1, chanc: 2 }];
  eq('not naive: the hard levels read who a president keeps nominating', at('dificil', picks).pF[2] > at('medio', picks).pF[2], true);
  const votes = [{ k: 'vote', pres: 3, chanc: 1, ja: [0, 1, 2, 3] }, { k: 'gov', pres: 3, chanc: 1, law: 'F', pc: 2, cc: 2 }];
  eq('not naive: the extreme level reads who voted Ja for a government that turned out fascist', at('extremo', votes).pF[2] > at('dificil', votes).pF[2], true);
  const tr1 = { seat: 1, ask: 'vote', a: 1, at: 0, why: { text: ['x'] } };
  eq('read game: the record of reasons comes back; damaged, only it is dropped; the reasoning panel switch is kept', [Core.readGame({ ...el, trace: [tr1] }).trace.length, 'trace' in Core.readGame({ ...el, trace: [{ ...tr1, seat: 99 }] }), 'trace' in Core.readGame({ ...el, trace: 'x' }), Core.readState({ debug: true }).debug, 'debug' in Core.readState({ debug: 1 })], [1, false, false, true, false]);
  eq('read state: the training role and the assistance are kept; nonsense is dropped', [Core.readState({ train: 'hitler', assist: true }).train, Core.readState({ assist: true }).assist, 'train' in Core.readState({ train: 'rei' }), 'assist' in Core.readState({ assist: 'yes' }), Core.readGame({ ...el, train: 'rei' }), !!Core.readGame({ ...el, train: 'liberal' })], ['hitler', true, false, false, null, true]);
  eq('read state: which seats the app plays and the level are kept; nonsense is dropped', [Core.readState({ names: ['a', 3, 'b'], ai: [false, true, true] }).ai, 'ai' in Core.readState({ names: ['a'], ai: [false] }), Core.readState({ level: 'extremo' }).level, 'level' in Core.readState({ level: 'x' })], [[false, true], false, 'extremo', false]);
  eq('read game: a bad app seat, level or hand drawn is damage', [Core.readGame({ ...el, players: el.players.map(p => ({ ...p, ai: 1 })) }), Core.readGame({ ...el, level: 'x' }), Core.readGame({ ...el, drew: ['X'] }), !!Core.readGame({ ...el, level: 'dificil', drew: deck('FFL') })], [null, null, null, true]);

  eq('themes: what the table says and the votes use the words of the theme', [Core.castVotes({ ...ai7({ phase: 'vote', chanc: 4 }), pack: 'comunismo' }, { 0: true }, Core.seeded(5)).log.find(l => l.startsWith('Votos.')).startsWith('Votos. Da!: Ana'), Core.say({ ...ai7({ phase: 'nominate', pres: 4, hist: [{ k: 'gov', pres: 0, chanc: 3, law: 'L', drew: deck('FFL'), got: deck('FL') }] }), pack: 'comunismo' }, 0, 'pc', 2).log.at(-1)], [true, 'Ana (presidente) disse que tirou 2 comunistas e 1 liberal.']);
  /* the app players talk between rounds; the trainer; what they thought (D13) */
  const chat = ai7({ phase: 'nominate', pres: 0, hist: [{ k: 'rej', pres: 3, chanc: 4 }] });
  const first = Core.talker(chat);
  eq('talk: once something happened, at the start of a round, an app player speaks; nobody before anything happened, nor out of the nomination', [first !== null && chat.players[first].ai === true, Core.talker(ai7({ phase: 'nominate', hist: [] })), Core.talker({ ...chat, phase: 'vote', chanc: 4 }), Core.botTurn(chat).ask], [true, null, null, 'talk']);
  const t1 = Core.talk(chat, first, 2 * 5), t2 = Core.talk(t1, Core.talker(t1), Core.QUIET);
  eq('talk: what is said goes in the log and the history; quiet leaves no line; at most TALKS a round, each once', [t1.log.at(-1), t1.hist.at(-1), t2.hist.at(-1).say, t2.log.length === t1.log.length, Core.talker(t2), Core.TALKS], [`${chat.players[first].name}: "Desconfio de Fê."`, { k: 'talk', by: first, about: 5, say: 'acc' }, 'quiet', true, null, 2]);
  eq('talk: only the one whose turn it is, about someone else in the game', [Core.talk(chat, first === 1 ? 2 : 1, 10) === chat, Core.talk(chat, first, 2 * first) === chat, Core.talk(chat, first, 2 * 5 + 1).log.at(-1).includes('Confio em Fê')], [true, true, true]);
  /* telling the table, personalities and reactions (D26) */
  const pg = Core.newGame(NAMES, Core.seeded(11), { ai: [false, true, true, true, true, true, true] }).game;
  eq('personality: every app player gets one, all different at a table of 7, people none; drawn anew each game', [pg.players.slice(1).every(p => Core.PERSONAS.includes(p.persona)), new Set(pg.players.slice(1).map(p => p.persona)).size, 'persona' in pg.players[0], [12, 13, 14].some(sd => Core.newGame(NAMES, Core.seeded(sd), { ai: [false, true, true, true, true, true, true] }).game.players.slice(1).map(p => p.persona).join() !== pg.players.slice(1).map(p => p.persona).join())], [true, 6, false, true]);
  eq('personality: kept when saved; one that does not exist is damage', [!!Core.readGame({ ...el, players: el.players.map(p => ({ ...p, persona: 'cetico' })) }), Core.readGame({ ...el, players: el.players.map(p => ({ ...p, persona: 'rei' })) })], [true, null]);
  eq('personality: the temper sits where the personality puts it, moved a little by the one drawn', [Core.temper(0, 'desconfiado'), Core.temper(1, 'centrado'), Core.temper(-1, 'desconfiado'), Core.temper(0.5)], [-0.7, 0.4, -1, 0.2]);
  const d1 = Core.denounce(chat, 0, 1, false, Core.seeded(2));
  const d1t = d1.hist.at(-1);
  eq('denounce: a person accuses; it goes in the log and the history, with how each app player still in the game took it, and the accused denies it', [d1.log.at(-3), d1.log.at(-2).startsWith('Reações: '), d1.log.at(-1), d1t.k, d1t.by, d1t.about, d1t.say, d1t.re.map(r => r[0]), d1t.re.every(r => [0, 1, 2].includes(r[1]))], ['Ana: "Desconfio de Bia."', true, 'Bia: "Não sou eu!"', 'talk', 0, 1, 'acc', [2, 3, 4, 5, 6], true]);
  eq('denounce: once a round for each one, only a person still in the game, about someone else in it; a new round opens it again', [Core.denounce(d1, 0, 1, true, Core.seeded(1)) === d1, Core.canDenounce(d1, 0, 2), Core.canDenounce(chat, 1, 2), Core.canDenounce(chat, 0, 0), Core.canDenounce({ ...chat, players: chat.players.map((p, i) => (i === 2 ? { ...p, alive: false } : p)) }, 0, 2), Core.canDenounce({ ...d1, hist: [...d1.hist, { k: 'rej', pres: 1, chanc: 2 }] }, 0, 1), Core.canDenounce({ ...chat, phase: 'over' }, 0, 1)], [true, true, false, false, false, true, false]);
  eq('denounce: vouching has no denial; what a person says does not take the turn of an app player to talk', [Core.denounce(chat, 0, 3, true, Core.seeded(2)).log.at(-1).startsWith('Reações'), Core.talker(d1) !== null], [true, true]);
  const heard = (persona, about, hist) => Core.believe({ ...Core.viewOf(ai7({ hist }), 6, 'vote', [1, 0]), persona }).pF[about];
  const r0 = [{ k: 'rej', pres: 3, chanc: 4 }], acc5 = [...r0, { k: 'talk', by: 4, about: 5, say: 'acc' }];
  eq('talk weighs (D26): an accusation makes the one accused look more fascist, a vouch less; the sceptic moves less than the centred', [heard('centrado', 5, acc5) > heard('centrado', 5, r0), heard('centrado', 5, [...r0, { k: 'talk', by: 4, about: 5, say: 'trust' }]) < heard('centrado', 5, r0), heard('cetico', 5, acc5) - heard('centrado', 5, r0) < heard('centrado', 5, acc5) - heard('centrado', 5, r0)], [true, true, true]);
  const fgov = [{ k: 'gov', pres: 5, chanc: 2, law: 'F', pc: 3, cc: 2 }, { k: 'talk', by: 4, about: 5, say: 'acc' }];
  eq('talk weighs double when the record backs it: the one accused was in a government that passed a fascist law', [Core.backed(fgov, 0, 1, 5, true), Core.backed(fgov, 0, 1, 3, true), Core.backed(fgov, 0, 1, 5, false), heard('critico', 5, fgov) - heard('critico', 5, fgov.slice(0, 1)) > heard('critico', 3, [...fgov.slice(0, 1), { k: 'talk', by: 4, about: 3, say: 'acc' }]) - heard('critico', 3, fgov.slice(0, 1))], [true, false, false, true]);
  const fv = (about, say, sd) => Core.decide({ ...Core.viewOf(ai7({ hist: [...r0, { k: 'talk', by: 0, about, say }] }), 1, 'react', [0, 1, 2]), persona: 'centrado' }, Core.seeded(sd));
  eq('react: a fascist never disagrees with an accusation of a liberal, nor agrees with one of its teammate (but a bluffer may)', [[1, 2, 3, 4, 5, 6, 7, 8].every(sd => fv(4, 'acc', sd) !== 2), [1, 2, 3, 4, 5, 6, 7, 8].every(sd => fv(2, 'acc', sd) !== 0)], [true, true]);
  eq('talk: a new round opens the talk again', Core.talker({ ...t2, hist: [...t2.hist, { k: 'rej', pres: 0, chanc: 1 }] }) !== null, true);
  eq('talk: a liberal app player says what it believes, never about itself; the answer is always an option', [0, 1, 2, 3].map(sd => { const v = Core.viewOf({ ...chat, hist: [{ k: 'gov', pres: 5, chanc: 6, law: 'F', pc: 3, cc: 2 }] }, 4, 'talk', [2, 3, 10, 11, 12, 13, Core.QUIET]); const a = Core.decide(v, Core.seeded(sd)); return v.options.includes(a) && (a === Core.QUIET || a >> 1 !== 4); }).every(Boolean), true);
  const coached = Core.coach(ai7({ phase: 'nominate', hist: [{ k: 'gov', pres: 5, chanc: 6, law: 'F', drew: deck('FFL'), got: deck('FF'), pc: 3, cc: 1 }] }), 0);
  eq('trainer: the chance of the hand the president said, the story that does not hold, the most suspected first', [Math.round(coached.odds.p * 1000), coached.odds.who, coached.clash, coached.suspects.length, coached.suspects[0].f >= coached.suspects[2].f, coached.suspects.some(x => x.seat === 0)], [243, 5, true, 3, true, false]);
  eq('trainer: a fascist is not shown what it knows; the table\'s view of the seat is there', [Core.coach(ai7({ phase: 'nominate' }), 1).suspects.length, typeof Core.coach(ai7({ phase: 'nominate' }), 1).seen], [0, 'number']);
  const told2 = ai7({ phase: 'over', hist: [{ k: 'gov', pres: 0, chanc: 3, law: 'F', pc: 3, cc: 2 }, { k: 'rej', pres: 3, chanc: 4 }, { k: 'gov', pres: 4, chanc: 0, law: 'F', pc: 2, cc: 2 }] });
  const th = Core.thoughts(told2, 0);
  eq('what they thought: only app players that did not know the person, from the start and after each law', [th.map(x => x.seat), th.every(x => x.series.length === 3 && x.series.every(v => v >= 0 && v <= 1))], [[3, 4, 5, 6], true]);
  const live = Core.suspicion({ ...told2, phase: 'nominate' }, 0);
  eq('live suspicion: every app player in the game, a chance each; one that knows the role reckons as if it did not', [live.map(x => x.seat), live.every(x => x.f >= 0 && x.f <= 1), live.some(x => x.seat === 1 && x.f > 0 && x.f < 1)], [[1, 2, 3, 4, 5, 6], true, true]);
  const cruxG = ai7({ phase: 'nominate', hist: [{ k: 'gov', pres: 3, chanc: 4, law: 'L', pc: 1, cc: 0 }, { k: 'gov', pres: 0, chanc: 5, law: 'F', pc: 3, cc: 1 }, { k: 'rej', pres: 4, chanc: 6 }] });
  const cEnd = Core.crux(cruxG, 0, 'end'), cLive = Core.crux(cruxG, 0, 'live');
  eq('crucial point: the moment that raised the suspicion the most, with the average before and after; at the end and live', [cEnd.at, cEnd.after > cEnd.before, cLive.at, Core.crux(ai7({ phase: 'nominate' }), 0, 'end')], [1, true, 1, null]);
  eq('read state: tips, speed and the open notebook are kept; nonsense is dropped', [Core.readState({ notesOpen: true, live: true }).notesOpen && Core.readState({ live: true }).live, 'notesOpen' in Core.readState({ notesOpen: 1 }), Core.readState({ coach: true, speed: 'rapida' }).coach, Core.readState({ speed: 'lenta' }).speed, 'speed' in Core.readState({ speed: 'normal' }), 'coach' in Core.readState({ coach: 1 })], [true, false, true, 'lenta', false, false]);

  /* the names of the app players by continent (D24) */
  const lists = Core.PACKS.flatMap(p => Core.REGIONS.map(r => Core.NAMES_BY[p][r]));
  eq('names by continent: every theme and continent has enough different names for a full table', lists.every(l => new Set(l).size === l.length && l.length >= Core.MAX_PLAYERS - 1), true);
  eq('names by continent: Lula goes by Polvo; the Americas have Fidel, Chávez, Maduro and Pinochet', [lists.some(l => l.includes('Lula')), Core.NAMES_BY.comunismo.americas.includes('Polvo'), ['Fidel', 'Chávez', 'Maduro'].every(x => Core.NAMES_BY.comunismo.americas.includes(x)), Core.NAMES_BY.fascismo.americas.includes('Pinochet')], [false, true, true, true]);
  const nm = Array.from({ length: 9 }).reduce((acc) => [...acc, Core.botName(acc, Core.seeded(acc.length + 1), 'comunismo', 'americas')], ['Lu']);
  eq('names by continent: a table filled from one continent takes names from its list only, never twice', [nm.slice(1).every(x => Core.NAMES_BY.comunismo.americas.includes(x)), new Set(nm).size], [true, 10]);
  const rg = Core.newGame(NAMES, Core.seeded(2), { ai: [false, true, true, true, true, true, true], region: 'africa' }).game;
  eq('names by continent: the game keeps its continent (for the drawings); the whole world or nonsense keeps none', [rg.region, 'region' in Core.newGame(NAMES, Core.seeded(2), { region: 'mundo' }).game, 'region' in Core.newGame(NAMES, Core.seeded(2), { region: 'marte' }).game, Core.readGame({ ...el, region: 'marte' }), Core.readGame({ ...el, region: 'asia' }).region], ['africa', false, false, null, 'asia']);
  eq('read state: the continent of the names is kept; the whole world or nonsense is the default', [Core.readState({ region: 'africa' }).region, 'region' in Core.readState({ region: 'mundo' }), 'region' in Core.readState({ region: 'marte' })], ['africa', false, false]);

  /* the finished games kept on the device (D23) */
  const done = { ...el, phase: 'over', winner: 'L' };
  const hs = Core.readHistory([{ at: 1, game: done }, { at: 2, game: el }, { at: 'x', game: done }, null, { at: 3, game: { ...done, deck: ['X'] } }]);
  eq('history: only finished games that hold together, with when they ended; anything else is dropped', [hs.length, hs[0].at, Core.readHistory('x'), Core.readHistory(Array.from({ length: Core.HISTORY_MAX + 5 }, (_, i) => ({ at: i, game: done }))).length], [1, 1, [], Core.HISTORY_MAX]);
  const hf = Core.historyFile(hs, 'abc', 9);
  eq('history: the exported file says the app, the format, the version and when', [hf.app, hf.format, hf.version, hf.exported, hf.games.length], ['secret-hitler', 1, 'abc', 9, 1]);

  /* what is saved */
  eq('read state: a saved state comes back as it was', Core.readState(JSON.parse(JSON.stringify({ v: 1, names: NAMES, game: el, theme: 'dark' }))), { v: 1, names: NAMES, game: el, theme: 'dark' });
  eq('read state: what is not a state reads as an empty one', [null, 'x', 7, { names: 'no' }].map(x => Core.readState(x)), Array(4).fill({ v: 1, names: [], game: null }));
  eq('read state: a damaged game is dropped, the names stay; an unknown theme is dropped', Core.readState({ names: ['a', 3, ' ', 'b'], game: { ...el, deck: ['X'] }, theme: 'pink' }), { v: 1, names: ['a', 'b'], game: null });
  eq('read state: sound and vibration off is kept; anything else means on', [Core.readState({ quiet: true }).quiet, 'quiet' in Core.readState({ quiet: 'yes' })], [true, false]);
  eq('read state: the art deco style is kept, an unknown style is dropped', [Core.readState({ look: 'deco' }).look, 'look' in Core.readState({ look: 'neon' }), 'look' in Core.readState({ look: 'poster' })], ['deco', false, false]);
  const broken = [{ ...el, players: [] }, { ...el, players: [{ name: 'a', role: 'rei', alive: true }] }, { ...el, phase: 'dance' }, { ...el, pres: 9 }, { ...el, tracker: 3 }, { ...el, log: [1] }, { ...el, phase: 'vote', chanc: null }, { ...el, phase: 'investigated', target: null }, { ...el, laws: { L: 7, F: 0 } }, { ...el, winner: 'X' }, { ...el, seen: [9] }, { ...el, vetoed: 1 }, { ...el, lastChanc: -1 }, { ...el, back: 9 }];
  eq('read game: what does not hold together is null', broken.map(Core.readGame), broken.map(() => null));

  /* the reader of the source: invented data here; real answers go in tests/fixtures/source/ and through tests/contract.py */
  eq('source: an entry read', Core.normEntry({ id: 7, name: ' Um ', value: '2.5', extra: true }), { id: '7', name: 'Um', value: 2.5 });
  eq('source: what is not an entry reads as null', [null, 'x', {}, { id: 1 }, { id: 1, name: 'x', value: 'abc' }, { name: 'x', value: 1 }].map(Core.normEntry), [null, null, null, null, null, null]);
  eq('source: a list, leaving out what cannot be read', [Core.normEntries({ items: [{ id: 1, name: 'a', value: 1 }, { id: 2 }] }), Core.normEntries({}), Core.normEntries(null)], [[{ id: '1', name: 'a', value: 1 }], [], []]);
  return { n, fails };
}

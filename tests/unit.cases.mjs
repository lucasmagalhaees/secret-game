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
  eq('knows: Hitler and the liberals see no one', [Core.knows(base, 0), Core.knows(base, 4)], [[], []]);
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
  eq('powers by fascist law: none, investigate, peek, execute, execute, win', [fas(0).phase, fas(1).phase, fas(2).phase, fas(3).phase, fas(4).phase, fas(5).phase, fas(5).winner], ['nominate', 'investigate', 'peek', 'execute', 'execute', 'over', 'F']);
  eq('6 liberal laws win for the liberals, 5 do not', [Core.WIN, Core.chancellorDiscard({ ...ch, laws: { L: 5, F: 0 } }, 1, rand).winner, Core.chancellorDiscard({ ...ch, laws: { L: 4, F: 0 } }, 1, rand).phase], [{ L: 6, F: 6 }, 'L', 'nominate']);
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
  const pk = fas(2);
  eq('peek: the 3 laws on top stay where they are', [Core.endPower(pk).phase, Core.endPower(pk).deck.slice(0, 3), Core.endPower(pk).log.at(-1)], ['nominate', pk.deck.slice(0, 3), 'Duda olhou as próximas 3 leis.']);
  const ex = fas(3);
  const ex1 = Core.execute(ex, 5);
  eq('execute: the player is out, the game goes on', [ex1.players[5].alive, ex1.phase, Core.execute(ex, 3) === ex, Core.execute(ex1, 5) === ex1], [false, 'nominate', true, true]);
  eq('execute Hitler: the liberals win', [Core.execute(ex, 0).winner, Core.execute(ex, 0).phase], ['L', 'over']);

  /* what is saved */
  eq('read state: a saved state comes back as it was', Core.readState(JSON.parse(JSON.stringify({ v: 1, names: NAMES, game: el, theme: 'dark' }))), { v: 1, names: NAMES, game: el, theme: 'dark' });
  eq('read state: what is not a state reads as an empty one', [null, 'x', 7, { names: 'no' }].map(x => Core.readState(x)), Array(4).fill({ v: 1, names: [], game: null }));
  eq('read state: a damaged game is dropped, the names stay; an unknown theme is dropped', Core.readState({ names: ['a', 3, ' ', 'b'], game: { ...el, deck: ['X'] }, theme: 'pink' }), { v: 1, names: ['a', 'b'], game: null });
  const broken = [{ ...el, players: [] }, { ...el, players: [{ name: 'a', role: 'rei', alive: true }] }, { ...el, phase: 'dance' }, { ...el, pres: 9 }, { ...el, tracker: 3 }, { ...el, log: [1] }, { ...el, phase: 'vote', chanc: null }, { ...el, phase: 'investigated', target: null }, { ...el, laws: { L: 7, F: 0 } }, { ...el, winner: 'X' }, { ...el, seen: [9] }, { ...el, vetoed: 1 }, { ...el, lastChanc: -1 }];
  eq('read game: what does not hold together is null', broken.map(Core.readGame), broken.map(() => null));

  /* the reader of the source: invented data here; real answers go in tests/fixtures/source/ and through tests/contract.py */
  eq('source: an entry read', Core.normEntry({ id: 7, name: ' Um ', value: '2.5', extra: true }), { id: '7', name: 'Um', value: 2.5 });
  eq('source: what is not an entry reads as null', [null, 'x', {}, { id: 1 }, { id: 1, name: 'x', value: 'abc' }, { name: 'x', value: 1 }].map(Core.normEntry), [null, null, null, null, null, null]);
  eq('source: a list, leaving out what cannot be read', [Core.normEntries({ items: [{ id: 1, name: 'a', value: 1 }, { id: 2 }] }), Core.normEntries({}), Core.normEntries(null)], [[{ id: '1', name: 'a', value: 1 }], [], []]);
  return { n, fails };
}

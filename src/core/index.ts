// The pure core, as one object: what the page uses and what the tests exercise (tests/unit.cases.mjs).
import { boardOf, HITLER_KNOWS_UPTO, powerAt, specialElect, addName, answerVeto, askVeto, canNominate, canVeto, SMALL_TABLE, VETO_FROM, canTarget, chancellorDiscard, checkNames, FASCISTS, DECK_F, DECK_L, endPower, execute, investigate, investigated, knows, lawName, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, newGame, nominate, partyOf, POWERS, presidentDiscard, revealNext, seeded, shuffle, HITLER_ZONE, TRACKER_MAX, vote, WIN } from './game';
import { readGame, readState } from './save';
import { normEntries, normEntry } from './source';

export const Core = {
  MIN_PLAYERS, MAX_PLAYERS, NAME_MAX, DECK_F, DECK_L, WIN, TRACKER_MAX, HITLER_ZONE, VETO_FROM, SMALL_TABLE, FASCISTS, POWERS, HITLER_KNOWS_UPTO, boardOf, powerAt,
  seeded, shuffle, partyOf, lawName, addName, checkNames, newGame, knows, revealNext, canNominate, nominate, vote,
  presidentDiscard, chancellorDiscard, canVeto, askVeto, answerVeto, canTarget, specialElect, investigate, investigated, endPower, execute,
  readGame, readState, normEntry, normEntries
};
export type * from './types';

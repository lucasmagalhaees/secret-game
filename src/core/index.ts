// The pure core, as one object: what the page uses and what the tests exercise (tests/unit.cases.mjs).
import { BOT_NAMES, botName, LEVELS, boardOf, HITLER_KNOWS_UPTO, powerAt, specialElect, addName, answerVeto, askVeto, canNominate, canVeto, SMALL_TABLE, VETO_FROM, canTarget, chancellorDiscard, checkNames, FASCISTS, DECK_F, DECK_L, endPower, execute, investigate, investigated, knows, lawName, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, newGame, nominate, partyOf, POWERS, presidentDiscard, revealNext, seeded, shuffle, HITLER_ZONE, TRACKER_MAX, vote, WIN } from './game';
import { AI, believe, decide, drawOdds, QUIET } from './ai';
import { botStep, botTurn, castVotes, claims, coach, suspicion, hasAi, humansAlive, say, talk, talker, TALKS, thoughts, turn, viewOf } from './judge';
import { readGame, readState } from './save';
import { PACKS, WORDS, words } from './words';
import { normEntries, normEntry } from './source';

export const Core = {
  MIN_PLAYERS, MAX_PLAYERS, NAME_MAX, DECK_F, DECK_L, WIN, TRACKER_MAX, HITLER_ZONE, VETO_FROM, SMALL_TABLE, FASCISTS, POWERS, HITLER_KNOWS_UPTO, boardOf, powerAt,
  seeded, shuffle, partyOf, lawName, addName, checkNames, newGame, knows, revealNext, canNominate, nominate, vote,
  presidentDiscard, chancellorDiscard, canVeto, askVeto, answerVeto, canTarget, specialElect, investigate, investigated, endPower, execute,
  LEVELS, BOT_NAMES, botName, AI, believe, decide, drawOdds, QUIET, TALKS, talker, talk, coach, thoughts, suspicion, viewOf, turn, botTurn, botStep, castVotes, claims, say, hasAi, humansAlive,
  PACKS, WORDS, words,
  readGame, readState, normEntry, normEntries
};
export type * from './types';

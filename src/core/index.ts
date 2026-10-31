// The pure core, as one object: what the page uses and what the tests exercise (tests/unit.cases.mjs).
import { BOT_NAMES, NAMES_BY, PERSONAS, DLC_KEY, REGIONS, REGION_NAMES, botName, freshPick, REPEAT_KEEP, LEVELS, boardOf, HITLER_KNOWS_UPTO, powerAt, specialElect, addName, answerVeto, askVeto, canNominate, canVeto, SMALL_TABLE, VETO_FROM, canTarget, chancellorDiscard, checkNames, FASCISTS, DECK_F, DECK_L, endPower, execute, investigate, investigated, knows, lawName, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX, newGame, nominate, partyOf, POWERS, presidentDiscard, revealNext, seeded, shuffle, HITLER_ZONE, TRACKER_MAX, vote, WIN } from './game';
import { BOSS_STYLE, AI, socialMemory, governmentPlan, believe, decide, decideWhy, drawOdds, QUIET, TALK_W, backed, ZONE_SURE, EARLY_CLEAN, PERSONA, REACT, temper } from './ai';
import { reputation, ACHIEVEMENTS, achievements, pendingAccusation, defend, canSelfClaim, selfClaim, canPlea, plea, canAsk, askTable, canWhy, askWhy, canSwear, swear, blocOf, formBloc, BLOC_ROUNDS, evidence, proofEarly, execReason, ELOQ, eloq, debateNext, debateArgs, debateSay, debateBot, debateVerdict, accuse, reputationNotice, accusationFeedback, highlights, reply, answer, notesScore, canDenounce, denounce, botStep, botTurn, castVotes, claims, coach, crux, suspicion, hasAi, humansAlive, say, talk, review, talker, TALKS, thoughts, trail, turn, viewOf } from './judge';
import { HISTORY_MAX, historyFile, readGame, readHistory, readState } from './save';
import { PACKS, VOTES, WORDS, words } from './words';
import { normEntries, normEntry } from './source';

export const Core = {
  BOSS_STYLE,
  MIN_PLAYERS, MAX_PLAYERS, NAME_MAX, DECK_F, DECK_L, WIN, TRACKER_MAX, HITLER_ZONE, VETO_FROM, SMALL_TABLE, FASCISTS, POWERS, HITLER_KNOWS_UPTO, boardOf, powerAt,
  seeded, shuffle, partyOf, lawName, addName, checkNames, newGame, knows, revealNext, canNominate, nominate, vote,
  presidentDiscard, chancellorDiscard, canVeto, askVeto, answerVeto, canTarget, specialElect, investigate, investigated, endPower, execute,
  DLC_KEY, reputation, ACHIEVEMENTS, achievements, pendingAccusation, defend, canSelfClaim, selfClaim, canPlea, plea, canAsk, askTable, canWhy, askWhy, canSwear, swear, blocOf, formBloc, BLOC_ROUNDS, evidence, proofEarly, execReason, ELOQ, eloq, debateNext, debateArgs, debateSay, debateBot, debateVerdict, accuse, reputationNotice, accusationFeedback, highlights, reply, answer, notesScore, canDenounce, denounce, TALK_W, backed, ZONE_SURE, EARLY_CLEAN, PERSONA, PERSONAS, REACT, temper, LEVELS, BOT_NAMES, NAMES_BY, REGIONS, REGION_NAMES, botName, freshPick, REPEAT_KEEP, AI, socialMemory, governmentPlan, believe, decide, decideWhy, drawOdds, QUIET, TALKS, trail, review, talker, talk, coach, thoughts, suspicion, crux, viewOf, turn, botTurn, botStep, castVotes, claims, say, hasAi, humansAlive,
  PACKS, VOTES, WORDS, words,
  readGame, readState, readHistory, historyFile, HISTORY_MAX, normEntry, normEntries
};
export type * from './types';

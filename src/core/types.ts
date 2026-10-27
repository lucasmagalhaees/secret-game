/* The shapes of the data. Everything the app keeps, and everything the source sends once it has been read. */

/** What comes from outside (the source, a saved state): not ours and not documented, so it is read field by field. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type Theme = 'light' | 'dark';
/** How fast the players run by the app act (D13). */
export type Speed = 'lenta' | 'normal' | 'rapida';
/** The theme of the game (D12): liberals against fascists (the original), or against communists. Same rules. */
export type Pack = 'fascismo' | 'comunismo';
/** The style of the app: the 1930s poster (the default) or art deco. */
export type Look = 'poster' | 'deco';

/** A law card, and a party: L is liberal, F is fascist. */
export type Law = 'L' | 'F';
export type Party = Law;

/** What a player secretly is. Hitler is a fascist; he knows who the fascist is only at a table of 5 or 6. */
export type Role = 'liberal' | 'fascista' | 'hitler';

/** How well the players run by the app play (D10): easy, medium, hard, extreme. */
export type Level = 'facil' | 'medio' | 'dificil' | 'extremo';

/** `ai`: the seat is played by the app, not by a person at the table; `level`, a level of its own for that seat (the
 *  measurements use it to put one level against another; the app gives every seat the level of the game); `mood`, the
 *  temper of a player run by the app, from -1 (wary) to 1 (trusting), drawn at the start: two of them that know the same
 *  do not always vote the same. */
export interface Player { name: string; role: Role; alive: boolean; ai?: true; level?: Level; mood?: number }

/** Where the game is. The phases that show something secret are gated by the page: the phone goes to one person first. */
export type Phase =
  | 'reveal'        // each player, in turn, sees their own role
  | 'nominate'      // the president picks a chancellor
  | 'vote'          // the table votes on that government
  | 'president'     // the president draws 3 laws and discards 1
  | 'chancellor'    // the chancellor gets 2, discards 1 and the other is enacted
  | 'veto'          // from the 5th fascist law: the chancellor asked to veto both, the president answers
  | 'investigate'   // power: the president picks someone whose party they will see
  | 'investigated'  // the president sees that party
  | 'peek'          // power: the president sees the next 3 laws
  | 'special'       // power: the president picks the next president
  | 'execute'       // power: the president eliminates a player
  | 'over';

export type Winner = Party;

/** One thing that happened, by who did it (indexes in players): what the end-of-game summary is made from. An
 *  investigation keeps the party that was really seen, so the table can compare it with what the president said. */
export type Event =
  | Gov
  | { k: 'rej'; pres: number; chanc: number }
  | { k: 'chaos'; law: Law }
  | { k: 'inv'; by: number; target: number; party: Party; said?: Party | '-' }
  | { k: 'peek'; by: number; saw?: Law[]; said?: number }
  | { k: 'special'; by: number; target: number }
  | { k: 'exec'; by: number; target: number; role: Role }
  | { k: 'vote'; pres: number; chanc: number; ja: number[] }
  | Talk;
/** What a player run by the app says about another between rounds (D13): it suspects them ('acc'), trusts them
 *  ('trust'), or keeps quiet ('quiet', about -1). The players run by the app do not weigh it: it is for the people. */
export type Talk = { k: 'talk'; by: number; about: number; say: 'acc' | 'trust' | 'quiet' };
/** An elected government: the law it made (or a veto, with no law). `drew` are the 3 laws the president drew and `got`
 *  the 2 the chancellor got: secret at the time. `pc` and `cc` are what the president and the chancellor told the table
 *  afterwards, as the number of fascist laws (-1: they kept quiet). A 'vote' event exists only where the phone took
 *  every vote, at a table with players run by the app. */
export type Gov = { k: 'gov' | 'veto'; pres: number; chanc: number; law?: Law; drew?: Law[]; got?: Law[]; pc?: number; cc?: number };

export interface Game {
  players: Player[];
  /** The draw pile, top first, and the discarded laws. */
  deck: Law[]; discard: Law[];
  /** Enacted laws of each kind. */
  laws: { L: number; F: number };
  phase: Phase;
  /** The president of this round, and the chancellor nominated (or elected), by index in players. */
  pres: number; chanc: number | null;
  /** After a special election: the president who called it; the order goes on from them. */
  back: number | null;
  /** The last government elected: neither may be chancellor next (with 5 or fewer alive, only the chancellor). */
  lastPres: number | null; lastChanc: number | null;
  /** Governments rejected (or vetoed) in a row: at the third, the top law is enacted by itself. */
  tracker: number;
  /** The president refused a veto in this government: the chancellor cannot ask again. */
  vetoed: boolean;
  /** Who has been investigated already: no one is investigated twice. */
  seen: number[];
  /** In 'reveal': whose turn it is to see their role. */
  reveal: number;
  /** The laws in the hand of the president (3) or of the chancellor (2). */
  hand: Law[];
  /** The 3 laws the president of this government drew (kept for the history). */
  drew?: Law[];
  /** How the players run by the app play; only at a table that has them. */
  level?: Level;
  /** Training: the role the person chose before the game (D11); absent when it was dealt at random. */
  train?: Role;
  /** The theme (D12); absent, the original one. */
  pack?: Pack;
  /** In 'investigated': who was investigated. */
  target: number | null;
  winner: Winner | null; why: string;
  /** What happened, in order, as the whole table may know it. */
  log: string[];
  /** The same, as data, with what was secret at the time (the end-of-game summary shows it). */
  hist: Event[];
}

/** Everything saved on the device (`secrethitler.v1`): the names of the last table (and which of them the app plays, `ai`), the level of the app's players, the role chosen for training (`train`), whether the minutes show who approved each law (`assist`), the person's notes on the game in course (`notes`, seat → party) and whether they are open for marking (`notesOpen`), whether the trainer gives tips (`coach`), how fast the app's players act (`speed`), the game in course, the theme, the style and whether sound and vibration are off. */
export interface AppState { v: 1; names: string[]; game: Game | null; theme?: Theme; look?: Look; quiet?: true; ai?: boolean[]; level?: Level; train?: Role; assist?: true; pack?: Pack; notes?: Record<string, Party>; notesOpen?: true; coach?: true; speed?: Speed }

/** An entry as the source describes it, once read by `normEntry`. */
export interface Entry { id: string; name: string; value: number }

/** What the judge asks a player run by the app (judge.ts), and the answers it accepts (`View.options`):
 *  - a seat: 'nominate', 'investigate', 'special', 'execute';
 *  - 1 or 0 (yes or no): 'vote', 'veto' (the president answering a veto);
 *  - the index of the law to throw away: 'pdiscard' (0 to 2), 'cdiscard' (0 or 1; 2 asks for a veto, when allowed);
 *  - what to tell the table, as a number of fascist laws: 'pc' (president, 0 to 3), 'cc' (chancellor, 0 to 2),
 *    'peek' (0 to 3); or a party, 'inv' (0 liberal, 1 fascist);
 *  - what to say between rounds, 'talk' (D13): 2 × seat to suspect that seat, 2 × seat + 1 to trust it, QUIET to keep
 *    quiet. */
export type Ask = 'nominate' | 'vote' | 'pdiscard' | 'cdiscard' | 'veto' | 'investigate' | 'special' | 'execute' | 'pc' | 'cc' | 'inv' | 'peek' | 'talk';

/** The history as one seat may know it: the secret parts (laws drawn and passed, a party seen, the laws spied, the role
 *  of who was eliminated) only where that seat saw them. */
export type Seen =
  | Gov
  | { k: 'rej'; pres: number; chanc: number }
  | { k: 'chaos'; law: Law }
  | { k: 'inv'; by: number; target: number; party?: Party; said?: Party | '-' }
  | { k: 'peek'; by: number; saw?: Law[]; said?: number }
  | { k: 'special'; by: number; target: number }
  | { k: 'exec'; by: number; target: number }
  | { k: 'vote'; pres: number; chanc: number; ja: number[] }
  | Talk;

/** Everything one player run by the app gets to decide with, built by the judge (`viewOf`): what that person could know
 *  sitting at the table, and nothing more. `known` is the role of each seat as far as this player knows it (its own;
 *  the others only for a fascist, or for Hitler at a small table); `hand` the laws in its hand, when the question is
 *  about them. */
export interface View {
  me: number; role: Role; level: Level; mood: number;
  n: number; alive: boolean[]; known: (Role | null)[]; fascists: number;
  laws: { L: number; F: number }; tracker: number;
  pres: number; chanc: number | null; lastPres: number | null; lastChanc: number | null;
  ask: Ask; options: number[]; hand: Law[];
  hist: Seen[];
}

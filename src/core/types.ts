/* The shapes of the data. Everything the app keeps, and everything the source sends once it has been read. */

/** What comes from outside (the source, a saved state): not ours and not documented, so it is read field by field. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type Theme = 'light' | 'dark';
/** The style of the app: the 1930s poster (the default) or art deco. */
export type Look = 'poster' | 'deco';

/** A law card, and a party: L is liberal, F is fascist. */
export type Law = 'L' | 'F';
export type Party = Law;

/** What a player secretly is. Hitler is a fascist; he knows who the fascist is only at a table of 5 or 6. */
export type Role = 'liberal' | 'fascista' | 'hitler';

export interface Player { name: string; role: Role; alive: boolean }

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
  | { k: 'gov'; pres: number; chanc: number; law: Law }
  | { k: 'rej'; pres: number; chanc: number }
  | { k: 'veto'; pres: number; chanc: number }
  | { k: 'chaos'; law: Law }
  | { k: 'inv'; by: number; target: number; party: Party }
  | { k: 'peek'; by: number }
  | { k: 'special'; by: number; target: number }
  | { k: 'exec'; by: number; target: number; role: Role };

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
  /** In 'investigated': who was investigated. */
  target: number | null;
  winner: Winner | null; why: string;
  /** What happened, in order, as the whole table may know it. */
  log: string[];
  /** The same, as data, with what was secret at the time (the end-of-game summary shows it). */
  hist: Event[];
}

/** Everything saved on the device (`secrethitler.v1`): the names of the last table, the game in course, the theme, the style and whether sound and vibration are off. */
export interface AppState { v: 1; names: string[]; game: Game | null; theme?: Theme; look?: Look; quiet?: true }

/** An entry as the source describes it, once read by `normEntry`. */
export interface Entry { id: string; name: string; value: number }

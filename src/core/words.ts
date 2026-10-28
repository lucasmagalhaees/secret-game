/* The words of each theme (D12). The rules and the data are the same in both: inside, the hidden side is always 'F',
   its members 'fascista' and its leader 'hitler'. Only what is shown changes: in the communist theme the hidden side is
   the communists, led by Stalin, and the table votes Da! or Niet!. */
import type { Pack, Region } from './types';

export interface Words {
  /** The hidden side, as an adjective and a plural ("lei comunista", "os comunistas"), and with a capital. */
  f: string; fs: string; F: string;
  /** Its leader: the role that wins when elected chancellor late in the game and loses when eliminated. */
  boss: string;
  /** The two votes. */
  ja: string; nein: string;
  /** The short name of each side, for small buttons: the liberals, and the hidden side. */
  libs: string; short: string;
  /** The name of the theme. */
  theme: string;
}
export const PACKS: Pack[] = ['fascismo', 'comunismo'];
export const WORDS: Record<Pack, Words> = {
  fascismo: { f: 'fascista', fs: 'fascistas', F: 'Fascista', boss: 'Hitler', ja: 'Ja!', nein: 'Nein!', libs: 'Libs', short: 'Nazis', theme: 'Liberais x Fascistas' },
  comunismo: { f: 'comunista', fs: 'comunistas', F: 'Comunista', boss: 'Stalin', ja: 'Da!', nein: 'Niet!', libs: 'Libs', short: 'Coms', theme: 'Liberais x Comunistas' }
};
/** The votes in the tongue of the leaders of each continent (D29): the world and Europe keep the original ones
 *  (German for the fascists, Russian for the communists); the Americas vote in Spanish, Brazil in Portuguese, Asia in
 *  Japanese for the fascists and Chinese for the communists, Africa in Swahili, Oceania in English. */
export const VOTES: Partial<Record<Region, Record<Pack, [string, string]>>> = {
  americas: { fascismo: ['¡Sí!', '¡No!'], comunismo: ['¡Sí!', '¡No!'] },
  brasil: { fascismo: ['Sim!', 'Não!'], comunismo: ['Sim!', 'Não!'] },
  asia: { fascismo: ['Hai!', 'Iie!'], comunismo: ['Shì!', 'Bù!'] },
  africa: { fascismo: ['Ndiyo!', 'Hapana!'], comunismo: ['Ndiyo!', 'Hapana!'] },
  oceania: { fascismo: ['Yes!', 'No!'], comunismo: ['Yes!', 'No!'] }
};
/** The words of a theme, with the votes of the continent; without one, the original game's. */
export const words = (pack?: Pack, region?: Region): Words => {
  const p: Pack = pack && PACKS.includes(pack) ? pack : 'fascismo', v = region ? VOTES[region]?.[p] : undefined;
  return v ? { ...WORDS[p], ja: v[0], nein: v[1] } : WORDS[p];
};

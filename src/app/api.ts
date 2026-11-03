import { Core } from '../core';
import { ARAB, CLERIC, RUSSIAN } from './art';
import type { Breaker, Entry, Game, Json, Region, Sheet } from '../core';

/* ================= the outside source =================
   Every call goes through getJSON. What comes back is read only by the normalisers of src/core/source.ts. The entries
   source is still empty (SOURCE): nothing is asked for it. D94: the character sheets come from the cthulhu-caracter-
   sheet API (SHEETS). */
export const SOURCE = '';
export const SHEETS = 'https://cthulhu-caracter-sheet.vercel.app/char-generator/random-char';
/** How long a call may take before it is given up. */
export const TIMEOUT = 12000;
export async function getJSON(url: string, ms?: number): Promise<Json> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || TIMEOUT);
  try { const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
/** The entries the source lists, read; with no source, none. */
export async function loadEntries(): Promise<Entry[]> { return SOURCE ? Core.normEntries(await getJSON(SOURCE)) : []; }

/** D94: the region of the API a seat's sheet is asked in: the continent of the game, and for the names with a country of
 *  their own, that country's (the Russians, the Arab leaders). The whole world and Oceania ask for any. */
export function sheetRegion(name: string, region: Region | undefined): string {
  if (RUSSIAN.has(name)) return 'EASTERN_EUROPE';
  if (ARAB.has(name) || CLERIC.has(name)) return 'MIDDLE_EAST';
  return ({ americas: 'AMERICA', brasil: 'AMERICA', europa: 'WESTERN_EUROPE', asia: 'ASIA', africa: 'AFRICA' } as Record<string, string>)[region || ''] || '';
}
/** D95: the breaker of the sheets API, kept on the device so a closed app does not knock on a dead server again. */
const BREAKER_KEY = 'secrethitler.sheets.v1';
const readB = (): Breaker => { try { return Core.readBreaker(JSON.parse(localStorage.getItem(BREAKER_KEY) || 'null')); } catch { return Core.readBreaker(null); } };
const keepB = (b: Breaker): void => { try { localStorage.setItem(BREAKER_KEY, JSON.stringify(b)); } catch { /* storage may be off: the breaker lives for this page only */ } };
let breakerMem: Breaker | null = null;   // read on first use: nothing runs while the modules load
const getB = (): Breaker => (breakerMem ??= readB());
/** The feature toggle of the sheets: on while the API answers, off while the breaker is open. */
export const sheetsOn = (): boolean => Core.breakerAllows(getB(), Date.now());
const askSheet = async (name: string, g: Game): Promise<Sheet | null> => { const r = sheetRegion(name, g.region); return Core.normSheet(await getJSON(`${SHEETS}${r ? `?nativeLanguageRegion=${r}` : ''}`, 6000)); };
/** D94, D95: one sheet for each seat. The first call is a probe: if it fails (or the breaker is open) no other goes out
 *  and the game plays without sheets, as before. If it answers, the others are asked at once; what fails then is left
 *  without a sheet, and the whole table goes without (half a table rolling would be unfair). */
export async function loadSheets(g: Game): Promise<Record<number, Sheet> | null> {
  if (!sheetsOn()) return null;
  let first: Sheet | null = null;
  try { first = await askSheet(g.players[0].name, g); } catch { first = null; }
  if (!first) { breakerMem = Core.breakerFail(getB(), Date.now()); keepB(breakerMem); return null; }
  breakerMem = Core.breakerOk(); keepB(breakerMem);
  const rest = await Promise.all(g.players.slice(1).map(p => askSheet(p.name, g).catch(() => null)));
  if (rest.some(s => !s)) return null;
  const out: Record<number, Sheet> = { 0: first };
  rest.forEach((s, k) => { out[k + 1] = s as Sheet; });
  return out;
}

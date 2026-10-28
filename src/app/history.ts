/* The finished games kept on this device, for export (D23). Nothing leaves the device by itself: the person exports
   a file and sends it on, so the players run by the app can be tuned to how people really play. Kept apart from the
   state of the app, under its own key, so a long list never slows down saving a move. */
import { Core } from '../core';
import type { Game, Saved } from '../core';
import { LS } from './state';
import { builtFrom } from './update';

let count: number | null = null;
const list = (): Saved[] => Core.readHistory(LS.get('secrethitler.history.v1'));
/** How many finished games are kept (read once, then kept up to date). */
export function kept(): number {
  if (count === null) count = list().length;
  return count;
}
/** A game just ended: kept, the oldest dropped past HISTORY_MAX, and more of them if the device runs out of room. */
export function keep(g: Game): void {
  let all = [...list(), { at: Date.now(), game: g }].slice(-Core.HISTORY_MAX);
  while (all.length && !LS.set('secrethitler.history.v1', all)) all = all.slice(1);
  count = all.length;
}
export function wipe(): void { LS.set('secrethitler.history.v1', []); count = 0; }
/** The games as a file: shared (the phone's share sheet, where it can share files), or downloaded. */
export async function exportGames(): Promise<void> {
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const file = new File([JSON.stringify(Core.historyFile(list(), builtFrom(), now))], `secret-hitler-partidas-${day}.json`, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'Partidas do Secret Hitler' }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

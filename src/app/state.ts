import { Core } from '../core';
import type { AppState, Theme } from '../core';

/* ================= what is kept, and what is on screen =================
   This module is one of the two that run code while loading (the other is src/main.ts): it reads what is saved and
   applies the theme. Nothing else in src/app/ calls another module at the top of the file. */
export const LS = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(k: string): any { try { return JSON.parse(localStorage.getItem(k) as string); } catch (e) { return null; } },
  set(k: string, v: unknown): boolean { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
/** Everything kept on the device: the table and the game in course. Replacing it goes through setS. */
export let S: AppState = Core.readState(LS.get('secrethitler.v1'));
export const saveS = (): boolean => LS.set('secrethitler.v1', S);
export function setS(next: AppState): void { S = next; }

/** What is on screen: nothing here is saved, so a reload always closes whatever secret was open.
 *  `open` is the secret screen being shown (see gateKey in render.ts); `pick` the card or player tapped and not yet
 *  confirmed; `name` the name being typed on the table screen. */
export interface Ui { msg: string; name: string; open: string; pick: number | null; confirmEnd: boolean }
export const ui: Ui = { msg: '', name: '', open: '', pick: null, confirmEnd: false };

/** The theme: the device's, unless one was chosen. The choice goes on <html> and in the colour of the browser bars. */
export function applyTheme(): void {
  const t: Theme | undefined = S.theme, root = document.documentElement;
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name=theme-color]')) m.content = dark ? '#0d0b09' : '#1d1a17';
}
applyTheme();

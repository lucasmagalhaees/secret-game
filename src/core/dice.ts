/* D94: the dice of Call of Cthulhu. A percentile roll (d100) against a skill of the character sheet: the lower the
   better. 01 is a critical; at or under a fifth of the skill, an extreme success; under half, a hard one; under the
   skill, a success; over it, a failure; 100 (or 96 and up for a skill under 50) a fumble. The game's rules stay as in
   the original: only what is said (an argument in the debate, a reason to turn a vote) is rolled. */
import type { Game, Sheet } from './types';

export type RollLevel = 'crit' | 'extreme' | 'hard' | 'ok' | 'fail' | 'fumble';
export interface Roll { skill: string; label: string; val: number; d: number; level: RollLevel }
/** The skills the game rolls, by their name on the sheet, with the name shown at the table. */
export const SKILLS: Record<string, string> = { Persuade: 'Persuasão', 'Fast Talk': 'Lábia', Charm: 'Charme', Psychology: 'Psicologia' };
/** What each level does to the strength of what was said. */
export const ROLL_BONUS: Record<RollLevel, number> = { crit: 0.3, extreme: 0.2, hard: 0.1, ok: 0.05, fail: -0.1, fumble: -0.25 };
export const ROLL_NAME: Record<RollLevel, string> = { crit: 'Crítico!', extreme: 'Sucesso extremo', hard: 'Sucesso difícil', ok: 'Sucesso', fail: 'Falha', fumble: 'Desastre!' };
export function levelOf(d: number, val: number): RollLevel {
  if (d === 1) return 'crit';
  if (d === 100 || (val < 50 && d >= 96)) return 'fumble';
  return d <= Math.floor(val / 5) ? 'extreme' : d <= Math.floor(val / 2) ? 'hard' : d <= val ? 'ok' : 'fail';
}
/** D95: the sheet of a seat, when the API sent one; without it (the API is down, or the breaker is open) nothing is
 *  rolled and the game plays as before the sheets. */
export const sheetOf = (g: Game, i: number): Sheet | undefined => g.sheets?.[i];
/** Roll a skill of a seat's sheet. */
export function roll(g: Game, i: number, skill: string, rand: () => number): Roll | undefined {
  const sh = sheetOf(g, i);
  if (!sh) return undefined;
  const val = sh.vals[skill] ?? 25, d = 1 + Math.floor(rand() * 100);
  return { skill, label: SKILLS[skill] || skill, val, d, level: levelOf(d, val) };
}
/** Which skill backs each argument of the debate: proofs and accounts are persuasion; turning it on the other one,
 *  fast talk; leaning on friends and the table, charm. */
export function skillForArg(id: string): string | null {
  if (id === 'quiet' || id === 'drop') return null;
  if (['counter', 'turn', 'noproof', 'failed', 'rush', 'turnpres', 'blame', 'weak'].includes(id)) return 'Fast Talk';
  if (['vouch', 'table'].includes(id)) return 'Charm';
  return 'Persuade';
}

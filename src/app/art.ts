/* ================= the drawings =================
   Original drawings, inline SVG in the app's own flat style: the liberals are birds in uniform (kepi, collar, buttons),
   the fascists are snakes in uniform, and Hitler gets a card of his own (a hooded cobra at a lectern). Everything is
   drawn in currentColor, so each picture takes the colour of the card it sits on, in every style and theme. */
import type { Law, Role } from '../core';

const SHADE = 'rgba(0,0,0,.28)', EYE = '#14110f', TONGUE = '#e4572e';

const bird = (): string => `
  <path d="M30 116 h60" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M54 92 L50 112 M66 92 L68 112" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M30 72 L8 62 L15 77 L6 86 L32 84Z" fill="currentColor"/>
  <path d="M28 70 C28 48 48 36 66 40 C78 42 86 50 88 60 C90 80 74 94 56 94 C40 94 28 84 28 70Z" fill="currentColor"/>
  <path d="M40 66 C52 52 68 52 80 62 C68 64 56 72 46 84Z" fill="${SHADE}"/>
  <rect x="44" y="55" width="16" height="5" rx="2" transform="rotate(-20 52 57)" fill="${SHADE}"/>
  <path d="M70 50 L79 63 L88 52" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M79 63 L77 92" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="81" cy="70" r="2.4" fill="${SHADE}"/><circle cx="80" cy="79" r="2.4" fill="${SHADE}"/>
  <circle cx="74" cy="36" r="14" fill="currentColor"/>
  <path d="M86 32 L104 37 L86 43Z" fill="currentColor"/>
  <path d="M86 37 L104 37" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="78" cy="34" r="2.8" fill="${EYE}"/>
  <path d="M61 26 L63 13 L85 13 L87 26Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M62 21 H86" stroke="${SHADE}" stroke-width="3"/>
  <path d="M84 25 L97 28 L86 22Z" fill="${EYE}" opacity=".75"/>`;

/** A fascist: a snake rising from a uniform. */
const snake = (): string => `
  <path d="M30 120 L36 84 C40 76 50 72 60 72 C70 72 80 76 84 84 L90 120Z" fill="currentColor"/>
  <path d="M52 73 L60 90 L68 73" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M60 90 V120" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="64" cy="98" r="2.6" fill="${SHADE}"/><circle cx="64" cy="109" r="2.6" fill="${SHADE}"/>
  <rect x="34" y="80" width="15" height="5" rx="2" fill="${SHADE}"/><rect x="71" y="80" width="15" height="5" rx="2" fill="${SHADE}"/>
  <path d="M60 76 C60 62 42 60 45 47 C48 37 62 40 64 30" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path d="M58 70 C56 62 46 58 47 50 M50 46 C52 40 60 40 62 34" fill="none" stroke="${SHADE}" stroke-width="2" stroke-dasharray="3 3"/>
  <ellipse cx="68" cy="27" rx="14" ry="9.5" transform="rotate(-10 68 27)" fill="currentColor"/>
  <path d="M79 30 L90 32 L95 28 M90 32 L95 36" stroke="${TONGUE}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="73" cy="25" r="2.4" fill="${EYE}"/>
  <path d="M57 20 C57 9 80 6 82 15Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M53 21 L85 14 L87 18 L56 26Z" fill="${EYE}" opacity=".75"/>
  <circle cx="70" cy="13" r="2.6" fill="${SHADE}"/>`;

/** Hitler: a cobra with its hood spread, in a greatcoat with fringed epaulettes and a plain red armband, haranguing from
 *  a lectern under a tall peaked cap. Another outline from the other snakes at a glance. */
const cobra = (): string => `
  <path d="M26 120 L32 80 C38 72 50 68 60 68 C70 68 82 72 88 80 L94 120Z" fill="currentColor"/>
  <path d="M50 70 L60 92 L70 70" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <rect x="28" y="77" width="18" height="6" rx="2" fill="${SHADE}"/><rect x="74" y="77" width="18" height="6" rx="2" fill="${SHADE}"/>
  <path d="M30 83 v5 M34 83 v5 M38 83 v5 M42 83 v5 M78 83 v5 M82 83 v5 M86 83 v5 M90 83 v5" stroke="${SHADE}" stroke-width="1.5"/>
  <rect x="26" y="92" width="12" height="8" fill="${TONGUE}"/>
  <path d="M60 72 C60 60 50 56 52 46" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>
  <path d="M40 40 C34 18 52 8 60 8 C68 8 86 18 80 40 C76 50 44 50 40 40Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M60 18 C52 22 50 32 54 40 M60 18 C68 22 70 32 66 40" fill="none" stroke="${SHADE}" stroke-width="2"/>
  <ellipse cx="60" cy="30" rx="11" ry="9" fill="currentColor" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="56" cy="28" r="2.2" fill="${EYE}"/><circle cx="64" cy="28" r="2.2" fill="${EYE}"/>
  <path d="M60 39 V45 L56 49 M60 45 L64 49" stroke="${TONGUE}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M46 18 C44 2 76 2 74 18Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M42 18 H78 L76 23 H44Z" fill="${EYE}" opacity=".8"/>
  <circle cx="60" cy="10" r="3" fill="${SHADE}"/>
  <path d="M36 100 H84 L78 120 H42Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M40 106 H80" stroke="${TONGUE}" stroke-width="5"/>`;

const svg = (body: string, cls: string): string => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;

/** The big picture on a role card. */
export const portrait = (r: Role): string => svg(r === 'liberal' ? bird() : r === 'hitler' ? cobra() : snake(), 'art');

/** The small seal of a party: on law cards and on the board. */
export const seal = (p: Law): string => svg(p === 'L' ? bird() : snake(), 'seal');

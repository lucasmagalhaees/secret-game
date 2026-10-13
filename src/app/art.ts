/* ================= the drawings =================
   Original drawings, inline SVG in the app's own flat style: the liberals are birds in uniform (kepi, collar, buttons),
   the fascists are alligators in uniform, and Hitler gets a card of his own (an alligator in a long coat with a red
   armband, jaws open, at a lectern). Everything is
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

/** The alligator, standing in profile like the bird: uniform jacket with belt and buttons, a peaked cap, a long snout
 *  with teeth. `chief` draws Hitler: a long coat, a red armband, a taller cap, the jaws open, at a lectern. */
const gator = (chief: boolean): string => `
  <path d="M30 116 h64" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M38 100 C22 104 12 114 3 109 C13 104 20 95 36 88Z" fill="currentColor"/>
  <path d="M30 104 l-3 -4 M22 107 l-3 -4 M14 109 l-3 -4" stroke="${SHADE}" stroke-width="2"/>
  <path d="M48 110 L46 117 M72 110 L74 117" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
  <path d="${chief ? 'M32 116 C28 92 32 64 50 56 C62 51 76 55 82 64 C92 80 92 100 88 116Z' : 'M38 110 C32 90 36 66 50 58 C62 52 76 56 82 66 C90 80 88 98 82 110Z'}" fill="currentColor"/>
  <path d="M60 57 L68 70 L76 57" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M68 70 V${chief ? 116 : 108}" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="72" cy="78" r="2.4" fill="${SHADE}"/><circle cx="72" cy="87" r="2.4" fill="${SHADE}"/>
  <path d="M${chief ? 34 : 39} 95 H${chief ? 88 : 84}" stroke="${SHADE}" stroke-width="4"/>
  <rect x="50" y="58" width="14" height="5" rx="2" transform="rotate(-24 57 60)" fill="${SHADE}"/>
  <path d="M56 64 C50 74 50 84 58 90 L62 88" fill="none" stroke="${SHADE}" stroke-width="2"/>
  ${chief ? `<path d="M51 74 L58 72 L60 79 L53 81Z" fill="${TONGUE}"/>` : ''}
  <path d="M44 62 C40 70 38 80 38 90" fill="none" stroke="${SHADE}" stroke-width="2" stroke-dasharray="3 3"/>
  <path d="M50 54 C46 42 54 32 68 31 C77 31 83 35 89 37 L110 41 C114 42 114 46 110 47 L86 49 C78 54 60 58 50 54Z" fill="currentColor"/>
  ${chief
    ? `<path d="M84 50 L107 60 L104 64 L80 55Z" fill="currentColor"/><path d="M84 48 L108 46 M86 51 L106 61" stroke="${SHADE}" stroke-width="1.5"/>
       <path d="M90 47 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 M88 53 l3 -2 l1 4 l3 -2 l1 4 l3 -2 l1 4" stroke="${SHADE}" stroke-width="1.5" fill="none"/>`
    : `<path d="M84 45 L111 44" stroke="${SHADE}" stroke-width="1.5"/><path d="M89 45 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3" stroke="${SHADE}" stroke-width="1.5" fill="none"/>`}
  <circle cx="106" cy="40" r="2" fill="${SHADE}"/>
  <circle cx="72" cy="33" r="6.5" fill="currentColor"/>
  <circle cx="73.5" cy="33" r="2.8" fill="${EYE}"/>
  <path d="${chief ? 'M50 33 C45 12 76 9 78 29Z' : 'M52 33 C50 21 72 19 76 29Z'}" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M49 33 L79 28" stroke="${SHADE}" stroke-width="3.5"/>
  <path d="M75 29 L90 31 L77 34Z" fill="${EYE}" opacity=".75"/>
  <circle cx="${chief ? 62 : 63}" cy="${chief ? 21 : 25}" r="2.6" fill="${SHADE}"/>
  ${chief ? `<path d="M64 98 H104 L98 118 H70Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/><path d="M68 104 H100" stroke="${TONGUE}" stroke-width="5"/>` : ''}`;

const svg = (body: string, cls: string): string => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;

/** The big picture on a role card. */
export const portrait = (r: Role): string => svg(r === 'liberal' ? bird() : gator(r === 'hitler'), 'art');

/** The small seal of a party: on law cards and on the board. */
export const seal = (p: Law): string => svg(p === 'L' ? bird() : gator(false), 'seal');

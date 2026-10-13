/* ================= the drawings =================
   Original drawings, inline SVG in the app's own flat style: the liberals are birds in uniform (kepi, collar, buttons,
   a ribbon medal), the fascists are alligators in uniform, and Hitler gets a card of his own (an alligator in a long
   coat with a red armband, scowling, jaws open, a fist pounding the lectern). Everything is drawn in currentColor with
   translucent shading on top, so each picture takes the colour of the card it sits on, in every style and theme. */
import type { Law, Role } from '../core';

const SHADE = 'rgba(0,0,0,.28)', SOFT = 'rgba(0,0,0,.13)', EYE = '#14110f', TONGUE = '#e4572e', GLINT = '#fff8e6';

/** A liberal: a bird in uniform, chest out, a steady look under a straight brow. */
const bird = (): string => `
  <path d="M30 116 h60" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M54 92 L50 112 M66 92 L68 112" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M46 112 h8 M64 112 h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="M30 72 L8 62 L15 77 L6 86 L32 84Z" fill="currentColor"/>
  <path d="M30 76 L13 70 M30 80 L11 84" stroke="${SOFT}" stroke-width="2"/>
  <path d="M28 70 C28 48 48 36 66 40 C78 42 86 50 88 60 C90 80 74 94 56 94 C40 94 28 84 28 70Z" fill="currentColor"/>
  <path d="M28 70 C28 84 40 94 56 94 C44 90 36 80 36 68 C36 56 44 46 54 42 C40 44 28 54 28 70Z" fill="${SOFT}"/>
  <path d="M40 66 C52 52 68 52 80 62 C68 64 56 72 46 84Z" fill="${SHADE}"/>
  <path d="M48 68 C56 62 64 61 72 63 M47 74 C54 69 60 68 66 69 M46 80 C51 76 56 75 60 76" stroke="${SOFT}" stroke-width="2" fill="none"/>
  <rect x="44" y="55" width="16" height="5" rx="2" transform="rotate(-20 52 57)" fill="${SHADE}"/>
  <path d="M46 52 l-2 5 M50 51 l-2 5 M54 49 l-2 5" stroke="${SHADE}" stroke-width="1.2"/>
  <path d="M70 50 L79 63 L88 52" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M79 63 L77 92" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="81" cy="70" r="2.4" fill="${SHADE}"/><circle cx="80" cy="79" r="2.4" fill="${SHADE}"/>
  <path d="M66 66 h7 v6 l-3.5 -2 l-3.5 2Z" fill="${SHADE}"/><circle cx="69.5" cy="76" r="3.2" fill="none" stroke="${SHADE}" stroke-width="1.6"/>
  <circle cx="74" cy="36" r="14" fill="currentColor"/>
  <path d="M60 38 C60 46 66 50 74 50 C66 47 62 42 62 34Z" fill="${SOFT}"/>
  <path d="M86 32 L104 37 L86 43Z" fill="currentColor"/>
  <path d="M86 37 L104 37" stroke="${SHADE}" stroke-width="1.5"/><path d="M86 40 L100 38 L86 43Z" fill="${SOFT}"/>
  <circle cx="78" cy="34" r="3.2" fill="${EYE}"/><circle cx="79.2" cy="33" r="1" fill="${GLINT}"/>
  <path d="M73 29 L84 28.5" stroke="${EYE}" stroke-width="2" stroke-linecap="round"/>
  <path d="M61 26 L63 13 L85 13 L87 26Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M64 14 L65 25" stroke="${SOFT}" stroke-width="4"/>
  <path d="M62 21 H86" stroke="${SHADE}" stroke-width="3"/>
  <circle cx="75" cy="17" r="2" fill="${SHADE}"/>
  <path d="M84 25 L97 28 L86 22Z" fill="${EYE}" opacity=".75"/>`;

/** The alligator, standing in profile like the bird: uniform jacket with belt and buttons, a peaked cap, a long snout
 *  with teeth, scales and a hard look. `chief` draws Hitler: a long double-breasted coat, a red armband, a taller cap,
 *  a scowl and a red eye, the jaws open, a fist pounding the lectern. */
const gator = (chief: boolean): string => `
  <path d="M30 116 h64" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M38 100 C22 104 12 114 3 109 C13 104 20 95 36 88Z" fill="currentColor"/>
  <path d="M36 92 C24 98 15 106 6 108 C16 108 26 104 38 100Z" fill="${SOFT}"/>
  <path d="M30 101 l-3 -5 l-2 5 M22 104 l-3 -5 l-2 5 M14 106 l-3 -5 l-2 5" stroke="${SHADE}" stroke-width="1.6" fill="none"/>
  <path d="M48 110 L46 117 M72 110 L74 117" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
  <path d="M42 117 h8 M70 117 h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <path d="${chief ? 'M32 116 C28 92 32 64 50 56 C62 51 76 55 82 64 C92 80 92 100 88 116Z' : 'M38 110 C32 90 36 66 50 58 C62 52 76 56 82 66 C90 80 88 98 82 110Z'}" fill="currentColor"/>
  <path d="${chief ? 'M32 116 C28 92 32 64 50 56 C44 66 40 84 42 116Z' : 'M38 110 C32 90 36 66 50 58 C45 68 42 86 46 110Z'}" fill="${SOFT}"/>
  <path d="M60 57 L68 70 L76 57" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M68 70 V${chief ? 116 : 108}" stroke="${SHADE}" stroke-width="1.5"/>
  ${chief
    ? `<circle cx="63" cy="78" r="2.2" fill="${SHADE}"/><circle cx="73" cy="78" r="2.2" fill="${SHADE}"/><circle cx="63" cy="87" r="2.2" fill="${SHADE}"/><circle cx="73" cy="87" r="2.2" fill="${SHADE}"/>`
    : `<circle cx="72" cy="78" r="2.4" fill="${SHADE}"/><circle cx="72" cy="87" r="2.4" fill="${SHADE}"/>`}
  <path d="M${chief ? 34 : 39} 95 H${chief ? 88 : 84}" stroke="${SHADE}" stroke-width="4"/>
  <rect x="${chief ? 65 : 66}" y="92.5" width="6" height="5" rx="1" fill="none" stroke="${SHADE}" stroke-width="1.5"/>
  <rect x="50" y="58" width="14" height="5" rx="2" transform="rotate(-24 57 60)" fill="${SHADE}"/>
  <path d="M51 56 l-1 5 M55 54 l-1 5 M59 53 l-1 5" stroke="${SHADE}" stroke-width="1.2"/>
  ${chief
    ? `<path d="M56 64 C62 74 72 84 84 92" fill="none" stroke="${SHADE}" stroke-width="10" stroke-linecap="round"/>
       <path d="M56 64 C62 74 72 84 84 92" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
       <circle cx="87" cy="94" r="5.5" fill="currentColor" stroke="${SHADE}" stroke-width="1.5"/>
       <path d="M84 91 l5 0 M83 94 l6 0" stroke="${SHADE}" stroke-width="1.2"/>
       <path d="M80 99 l-4 3 M94 99 l4 3 M87 102 v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/>
       <path d="M60 70 L67 72 L65 79 L58 77Z" fill="${TONGUE}"/>`
    : `<path d="M56 64 C50 74 50 84 58 90 L62 88" fill="none" stroke="${SHADE}" stroke-width="2"/><path d="M62 88 l3 -1 M61 91 l3 1" stroke="${SHADE}" stroke-width="1.5"/>`}
  <path d="M44 62 C40 70 38 80 38 90" fill="none" stroke="${SHADE}" stroke-width="2" stroke-dasharray="3 3"/>
  <path d="M50 54 C46 42 54 32 68 31 C77 31 83 35 89 37 L110 41 C114 42 114 46 110 47 L86 49 C78 54 60 58 50 54Z" fill="currentColor"/>
  <path d="M50 54 C46 44 52 36 60 33 C56 40 56 48 62 55 C58 56 53 56 50 54Z" fill="${SOFT}"/>
  <path d="M60 50 C68 52 78 51 84 48" stroke="${SOFT}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="92" cy="40.5" r="1.1" fill="${SHADE}"/><circle cx="97" cy="41.3" r="1.1" fill="${SHADE}"/><circle cx="102" cy="42" r="1.1" fill="${SHADE}"/>
  <circle cx="58" cy="44" r="1.3" fill="${SHADE}"/><circle cx="54" cy="48" r="1.3" fill="${SHADE}"/><circle cx="61" cy="39" r="1.3" fill="${SHADE}"/>
  ${chief
    ? `<path d="M84 50 L107 60 L104 64 L80 55Z" fill="currentColor"/><path d="M84 48 L108 46 M86 51 L106 61" stroke="${SHADE}" stroke-width="1.5"/>
       <path d="M86 49 L106 47 L105 59 L86 52Z" fill="${EYE}" opacity=".55"/>
       <path d="M90 47 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 M88 53 l3 -2 l1 4 l3 -2 l1 4 l3 -2 l1 4" stroke="${GLINT}" stroke-width="1.5" fill="none"/>`
    : `<path d="M84 45 L111 44" stroke="${SHADE}" stroke-width="1.5"/><path d="M89 45 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3" stroke="${SHADE}" stroke-width="1.5" fill="none"/>`}
  <circle cx="106" cy="40" r="2" fill="${SHADE}"/>
  <circle cx="72" cy="33" r="6.5" fill="currentColor"/>
  <circle cx="73.5" cy="33.5" r="3" fill="${EYE}"/>
  ${chief ? `<circle cx="73.5" cy="33.5" r="1.4" fill="${TONGUE}"/>` : `<circle cx="74.6" cy="32.4" r=".9" fill="${GLINT}"/>`}
  <path d="${chief ? 'M64 26 L82 32' : 'M65 28.5 L80 29.5'}" stroke="${EYE}" stroke-width="${chief ? 3 : 2.2}" stroke-linecap="round"/>
  <path d="${chief ? 'M50 33 C45 12 76 9 78 29Z' : 'M52 33 C50 21 72 19 76 29Z'}" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="${chief ? 'M50 33 C47 20 54 14 60 13 C55 18 54 25 56 32Z' : 'M52 33 C51 25 56 21 61 21 C57 24 56 28 57 32Z'}" fill="${SOFT}"/>
  <path d="M49 33 L79 28" stroke="${SHADE}" stroke-width="3.5"/>
  <path d="M75 29 L90 31 L77 34Z" fill="${EYE}" opacity=".75"/>
  <circle cx="${chief ? 62 : 63}" cy="${chief ? 21 : 25}" r="2.6" fill="${SHADE}"/>
  ${chief ? `<path d="M64 98 H104 L98 118 H70Z" fill="currentColor" stroke="${SHADE}" stroke-width="2"/><path d="M64 98 H104 L102 103 H66Z" fill="${SOFT}"/><path d="M68 108 H100" stroke="${TONGUE}" stroke-width="5"/>` : ''}`;

const svg = (body: string, cls: string): string => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;

/** The big picture on a role card. */
export const portrait = (r: Role): string => svg(r === 'liberal' ? bird() : gator(r === 'hitler'), 'art');

/** The small seal of a party: on law cards and on the board. */
export const seal = (p: Law): string => svg(p === 'L' ? bird() : gator(false), 'seal');

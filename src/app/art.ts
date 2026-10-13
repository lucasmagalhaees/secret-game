/* ================= the drawings =================
   Original drawings, inline SVG in the app's own flat style: the liberals are birds, the fascists are snakes in uniform,
   and Hitler gets a card of his own (a snake in a long coat and a taller cap, with a plain red armband). Everything is
   drawn in currentColor, so each picture takes the colour of the card it sits on, in every style and theme. */
import type { Law, Role } from '../core';

const SHADE = 'rgba(0,0,0,.28)', EYE = '#14110f', TONGUE = '#e4572e';

const bird = (): string => `
  <path d="M30 116 h60" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  <path d="M54 92 L50 112 M66 92 L68 112" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M30 72 L8 62 L15 77 L6 86 L32 84Z" fill="currentColor"/>
  <path d="M28 70 C28 48 48 36 66 40 C78 42 86 50 88 60 C90 80 74 94 56 94 C40 94 28 84 28 70Z" fill="currentColor"/>
  <path d="M40 66 C52 52 68 52 80 62 C68 64 56 72 46 84Z" fill="${SHADE}"/>
  <path d="M48 70 C58 62 66 62 74 66 M50 76 C58 70 64 70 70 72" stroke="${SHADE}" stroke-width="2" fill="none"/>
  <circle cx="74" cy="36" r="14" fill="currentColor"/>
  <path d="M86 32 L104 37 L86 43Z" fill="currentColor"/>
  <path d="M86 37 L104 37" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="78" cy="33" r="2.8" fill="${EYE}"/>`;

/** A snake rising from a uniform. `chief` draws Hitler: a longer coat, a taller cap and a red armband. */
const snake = (chief: boolean): string => `
  <path d="${chief ? 'M24 120 L32 82 C38 74 50 70 60 70 C70 70 82 74 88 82 L96 120Z' : 'M30 120 L36 84 C40 76 50 72 60 72 C70 72 80 76 84 84 L90 120Z'}" fill="currentColor"/>
  <path d="M52 73 L60 90 L68 73" fill="none" stroke="${SHADE}" stroke-width="3"/>
  <path d="M60 90 V120" stroke="${SHADE}" stroke-width="1.5"/>
  <circle cx="64" cy="98" r="2.6" fill="${SHADE}"/><circle cx="64" cy="109" r="2.6" fill="${SHADE}"/>
  <rect x="${chief ? 30 : 34}" y="80" width="15" height="5" rx="2" fill="${SHADE}"/><rect x="${chief ? 75 : 71}" y="80" width="15" height="5" rx="2" fill="${SHADE}"/>
  ${chief ? `<rect x="27" y="96" width="13" height="8" fill="${TONGUE}"/>` : ''}
  <path d="M60 76 C60 62 42 60 45 47 C48 37 62 40 64 30" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path d="M58 70 C56 62 46 58 47 50 M50 46 C52 40 60 40 62 34" fill="none" stroke="${SHADE}" stroke-width="2" stroke-dasharray="3 3"/>
  <ellipse cx="68" cy="27" rx="14" ry="9.5" transform="rotate(-10 68 27)" fill="currentColor"/>
  <path d="M79 30 L90 32 L95 28 M90 32 L95 36" stroke="${TONGUE}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="73" cy="25" r="2.4" fill="${EYE}"/>
  <path d="${chief ? 'M56 19 C55 2 82 -2 84 13Z' : 'M57 20 C57 9 80 6 82 15Z'}" fill="currentColor" stroke="${SHADE}" stroke-width="2"/>
  <path d="M53 21 L85 14 L87 18 L56 26Z" fill="${EYE}" opacity=".75"/>
  <circle cx="${chief ? 70 : 70}" cy="${chief ? 11 : 13}" r="2.6" fill="${SHADE}"/>`;

const svg = (body: string, cls: string): string => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;

/** The big picture on a role card. */
export const portrait = (r: Role): string => svg(r === 'liberal' ? bird() : snake(r === 'hitler'), 'art');

/** The small seal of a party: on law cards and on the board. */
export const seal = (p: Law): string => svg(p === 'L' ? bird() : snake(false), 'seal');

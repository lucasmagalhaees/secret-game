/* ================= the drawings =================
   Original caricatures, inline SVG: thick ink outlines, flat colours, big heads and loud faces. The liberals are a
   smug bird in a navy uniform; the fascists are a sneering alligator in a brown uniform and a black peaked cap; Hitler
   gets a card of his own: a cobra with its hood spread, in a long grey coat with a plain red armband, yelling over a
   lectern. In the communist theme (D12) the hidden side is a white wolf in a red tunic and its leader a bear with a
   moustache and a pipe. Each figure stands on a soft spotlight so it reads on any card colour, in every style and theme. */
import type { Law, Pack, Role } from '../core';

const K = '#1b1512';                  // ink
const W = '#fffaf0', GOLD = '#e8b730', RED = '#d63c2b', PINK = '#f19a8c';
const o = (w = 2.6): string => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const spot = `<ellipse cx="60" cy="66" rx="50" ry="52" fill="rgba(255,244,220,.16)"/><ellipse cx="60" cy="116" rx="36" ry="4" fill="rgba(0,0,0,.25)"/>`;

/** A liberal: a round, smug bird in a navy uniform with gold buttons and a kepi. */
const bird = (): string => {
  const SKY = '#9cc6e4', SKY2 = '#78a8cc', NAVY = '#2d4c7c', NAVY2 = '#203a63', BEAK = '#f3a43b';
  return `${spot}
  <path d="M50 98 L47 113 M44 113 h8 M64 98 L67 113 M64 113 h8" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/>
  <path d="M50 98 L47 113 M44 113 h8 M64 98 L67 113 M64 113 h8" fill="none" stroke="${BEAK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M34 84 L8 74 L16 86 L6 96 L36 94Z" fill="${SKY2}" ${o()}/>
  <path d="M30 80 C30 62 44 54 58 54 C74 54 84 64 84 80 C84 96 72 104 57 104 C42 104 30 96 30 80Z" fill="${NAVY}" ${o()}/>
  <path d="M62 56 L72 74 L70 102 C66 103 62 104 57 104 C58 90 58 72 62 56Z" fill="${W}" ${o(2)}/>
  <path d="M62 56 L72 74 L82 62" fill="none" ${o(2.2)}/>
  <circle cx="76" cy="80" r="2.6" fill="${GOLD}" ${o(1.4)}/><circle cx="75" cy="91" r="2.6" fill="${GOLD}" ${o(1.4)}/>
  <path d="M36 74 C44 68 56 72 58 86 C50 90 40 88 36 82Z" fill="${NAVY2}" ${o()}/>
  <path d="M44 66 l14 -5 l2 4 l-14 5Z" fill="${GOLD}" ${o(1.4)}/>
  <path d="M64 66 h7 v7 l-3.5 -2 l-3.5 2Z" fill="${RED}" ${o(1.2)}/><circle cx="67.5" cy="77" r="3.4" fill="${GOLD}" ${o(1.2)}/>
  <circle cx="72" cy="38" r="22" fill="${SKY}" ${o()}/>
  <path d="M52 44 C54 56 66 61 78 58 C66 56 58 50 56 40Z" fill="${SKY2}"/>
  <ellipse cx="70" cy="48" rx="5" ry="3" fill="${PINK}" opacity=".8"/>
  <ellipse cx="82" cy="36" rx="8.5" ry="9.5" fill="${W}" ${o(2)}/>
  <circle cx="84.5" cy="37" r="4" fill="${K}"/><circle cx="86" cy="35.3" r="1.4" fill="${W}"/>
  <path d="M74 25 C79 23 86 23 92 26" fill="none" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M92 40 L114 45 L93 53 C90 50 90 44 92 40Z" fill="${BEAK}" ${o()}/>
  <path d="M93 47 L110 46" fill="none" ${o(1.6)}/>
  <path d="M84 52 C88 55 92 54 94 51" fill="none" ${o(2)}/>
  <path d="M56 22 L58 6 L88 6 L90 22Z" fill="${NAVY}" ${o()}/>
  <path d="M57 16 H89" stroke="${GOLD}" stroke-width="3.4"/><path d="M57 16 H89" fill="none" ${o(1)}/>
  <circle cx="73" cy="11" r="2.6" fill="${GOLD}" ${o(1.2)}/>
  <path d="M86 21 L102 24 C98 28 90 27 86 25Z" fill="${K}"/>`;
};

/** A fascist: a sneering alligator with a long toothy grin, in a brown uniform with a belt and a black peaked cap. */
const gator = (): string => {
  const G = '#6f9440', G2 = '#557530', BELLY = '#efe2b4', COAT = '#6a4f34', COAT2 = '#54402a', CAP = '#26221f';
  return `${spot}
  <path d="M40 100 C24 102 12 112 4 106 C12 100 20 92 38 88Z" fill="${G}" ${o()}/>
  <path d="M28 98 l-3 -6 l-3 6 M18 102 l-3 -6 l-3 6" fill="${G2}" ${o(1.4)}/>
  <path d="M48 104 L46 114 M42 114 h9 M70 104 L72 114 M68 114 h9" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
  <path d="M48 104 L46 114 M42 114 h9 M70 104 L72 114 M68 114 h9" fill="none" stroke="${G}" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 104 C30 84 36 66 52 60 C64 56 76 60 82 70 C88 82 88 96 84 106 C70 110 48 110 34 104Z" fill="${COAT}" ${o()}/>
  <path d="M58 60 L66 76 L74 60" fill="${BELLY}" ${o(2)}/>
  <path d="M66 76 V106" fill="none" ${o(1.6)}/>
  <circle cx="71" cy="84" r="2.6" fill="${GOLD}" ${o(1.3)}/><circle cx="71" cy="94" r="2.6" fill="${GOLD}" ${o(1.3)}/>
  <path d="M35 96 H86" stroke="${K}" stroke-width="6"/><path d="M35 96 H86" stroke="#2b2420" stroke-width="3.4"/>
  <rect x="63" y="92" width="8" height="8" rx="1" fill="${GOLD}" ${o(1.4)}/>
  <path d="M40 72 C46 66 56 70 56 82 C54 90 46 92 40 88Z" fill="${COAT2}" ${o()}/>
  <path d="M42 89 l-3 5 M46 91 l-1 5 M50 91 l1 5" fill="none" ${o(2)}/>
  <path d="M44 66 l12 -6 l2 4 l-12 6Z" fill="${GOLD}" ${o(1.3)}/>
  <path d="M42 48 C38 30 52 18 70 20 C82 21 90 26 98 28 L114 32 C121 34 121 46 114 48 L94 54 C82 60 60 62 50 58 C45 56 43 52 42 48Z" fill="${G}" ${o()}/>
  <path d="M50 58 C60 61 80 60 94 54 L112 48 C104 52 90 52 70 52 C60 52 54 54 50 58Z" fill="${BELLY}" ${o(1.6)}/>
  <path d="M66 46 C80 49 98 44 116 40" fill="none" ${o(2.4)}/>
  <path d="M74 47 l2 5 l2 -5 M82 47 l2 5 l2 -5 M90 45 l2 5 l2 -5 M98 44 l2 5 l2 -5 M106 42 l2 4 l2 -4 M78 47 l2 -4 l2 4 M94 45 l2 -4 l2 4 M102 43 l2 -4 l2 4" fill="${W}" ${o(1.1)}/>
  <ellipse cx="110" cy="33" rx="2.2" ry="1.6" fill="${K}"/><ellipse cx="104" cy="31.5" rx="2" ry="1.4" fill="${K}"/>
  <circle cx="56" cy="40" r="2" fill="${G2}"/><circle cx="62" cy="34" r="1.6" fill="${G2}"/><circle cx="52" cy="48" r="1.8" fill="${G2}"/><circle cx="86" cy="34" r="1.5" fill="${G2}"/><circle cx="92" cy="36" r="1.5" fill="${G2}"/>
  <circle cx="74" cy="24" r="10" fill="${G}" ${o()}/>
  <ellipse cx="76" cy="24" rx="6.5" ry="6" fill="#f6e36b" ${o(1.6)}/>
  <rect x="75" y="19" width="2.6" height="10" rx="1.3" fill="${K}"/>
  <path d="M67 18 C72 19 80 22 86 26 L86 21 C80 17 72 15 67 16Z" fill="${G2}" ${o(2)}/>
  <path d="M40 30 C36 12 64 6 74 14 L80 22 C66 26 50 30 40 30Z" fill="${CAP}" ${o()}/>
  <path d="M40 30 C52 28 66 24 80 21" fill="none" stroke="${RED}" stroke-width="3.2"/>
  <path d="M74 20 L94 18 C92 23 84 25 78 25Z" fill="${CAP}" ${o(1.8)}/>
  <circle cx="58" cy="16" r="3" fill="${GOLD}" ${o(1.2)}/>`;
};

/** Hitler: a cobra with its hood spread, angry yellow eyes, fangs bared, in a long grey coat with a plain red armband
 *  and a tall peaked cap, yelling over a lectern. No arms, no salute: the coat and the lectern make the pose. */
const cobra = (): string => {
  const S = '#9b8340', S2 = '#6e5c2a', HOOD = '#f2e2b2', COAT = '#4a4e55', COAT2 = '#383b41', CAP = '#26221f', WOOD = '#8a5a34';
  return `${spot}
  <path d="M24 116 C22 92 30 74 46 68 L74 68 C90 74 98 92 96 116Z" fill="${COAT}" ${o()}/>
  <path d="M46 68 L60 92 L74 68" fill="${COAT2}" ${o(2)}/>
  <path d="M30 84 C34 76 42 72 46 74 L44 100 C38 100 32 96 30 92Z" fill="${COAT2}" ${o(2)}/>
  <path d="M31 86 L44 84 L44 93 L31 94Z" fill="${RED}" ${o(1.6)}/>
  <path d="M28 72 l14 -4 l2 4 l-14 5Z M92 72 l-14 -4 l-2 4 l14 5Z" fill="${GOLD}" ${o(1.3)}/>
  <path d="M53 76 C53 68 56 62 60 60 C64 62 67 68 67 76Z" fill="${HOOD}" ${o(2)}/>
  <path d="M55 70 h10 M54 74 h12" fill="none" ${o(1.2)}/>
  <path d="M60 10 C34 12 26 38 34 56 C40 68 52 70 60 64 C68 70 80 68 86 56 C94 38 86 12 60 10Z" fill="${S}" ${o()}/>
  <path d="M60 18 C44 20 38 38 42 52 C46 60 54 62 60 58 C66 62 74 60 78 52 C82 38 76 20 60 18Z" fill="${HOOD}" ${o(1.8)}/>
  <path d="M48 34 c3 -2 6 0 4 3 M70 34 c-3 -2 -6 0 -4 3 M46 46 c3 -2 6 0 4 3 M74 46 c-3 -2 -6 0 -4 3" fill="${S2}" ${o(1.2)}/>
  <path d="M44 38 C44 26 52 22 60 22 C68 22 76 26 76 38 C76 50 70 58 60 58 C50 58 44 50 44 38Z" fill="${S}" ${o()}/>
  <path d="M49 44 C52 54 68 54 71 44 C68 47 52 47 49 44Z" fill="#7d1d1a" ${o(1.8)}/>
  <path d="M52 45 l2 6 l2 -5.5 M68 45 l-2 6 l-2 -5.5" fill="${W}" ${o(1.1)}/>
  <path d="M60 50 V60 L56 65 M60 60 L64 65" fill="none" stroke="${RED}" stroke-width="2.4" stroke-linecap="round"/>
  <ellipse cx="53" cy="36" rx="5" ry="4.2" fill="#f6e36b" ${o(1.6)}/><ellipse cx="67" cy="36" rx="5" ry="4.2" fill="#f6e36b" ${o(1.6)}/>
  <rect x="52" y="33" width="2.4" height="6.4" rx="1.2" fill="${K}"/><rect x="65.8" y="33" width="2.4" height="6.4" rx="1.2" fill="${K}"/>
  <path d="M46 30 L57 34 M74 30 L63 34" fill="none" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M41 24 C38 4 82 2 79 24Z" fill="${CAP}" ${o()}/>
  <path d="M42 22 H78" stroke="${RED}" stroke-width="3.2"/>
  <path d="M38 24 H82 C80 29 72 30 60 30 C48 30 40 29 38 24Z" fill="${CAP}" ${o(1.8)}/>
  <circle cx="60" cy="13" r="3.4" fill="${GOLD}" ${o(1.3)}/>
  <path d="M34 96 H86 L80 118 H40Z" fill="${WOOD}" ${o()}/>
  <path d="M34 96 H86 L84 102 H36Z" fill="#a46e43" ${o(1.6)}/>
  <rect x="44" y="105" width="32" height="7" fill="${RED}" ${o(1.4)}/>
  <path d="M28 54 l-6 -3 M26 62 l-7 0 M92 54 l6 -3 M94 62 l7 0" fill="none" stroke="${W}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;
};

/** A communist (D12): a snarling white wolf in a red tunic with a belt and a pointed cloth cap with a red star. */
const wolf = (): string => {
  const FUR = '#f4f3ee', FUR2 = '#c9ced3', TUNIC = '#b8322a', TUNIC2 = '#8f241e', CAP = '#6b7a52', CAP2 = '#56633f';
  return `${spot}
  <path d="M38 98 C20 104 8 96 6 84 C14 90 22 88 30 84 C20 82 16 74 18 68 C24 78 34 84 42 86Z" fill="${FUR}" ${o()}/>
  <path d="M14 82 C18 86 24 86 28 84" fill="none" stroke="${FUR2}" stroke-width="2.4"/>
  <path d="M48 104 L46 114 M42 114 h9 M70 104 L72 114 M68 114 h9" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
  <path d="M48 104 L46 114 M42 114 h9 M70 104 L72 114 M68 114 h9" fill="none" stroke="${FUR}" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 104 C30 84 36 66 52 60 C64 56 76 60 82 70 C88 82 88 96 84 106 C70 110 48 110 34 104Z" fill="${TUNIC}" ${o()}/>
  <path d="M56 60 L64 72 L72 60 L66 58 L64 62 L62 58Z" fill="${FUR}" ${o(1.8)}/>
  <path d="M64 72 V106" fill="none" ${o(1.6)}/>
  <circle cx="69" cy="82" r="2.4" fill="${GOLD}" ${o(1.2)}/><circle cx="69" cy="92" r="2.4" fill="${GOLD}" ${o(1.2)}/>
  <path d="M35 96 H86" stroke="${K}" stroke-width="6"/><path d="M35 96 H86" stroke="#3a2a22" stroke-width="3.4"/>
  <rect x="60" y="92" width="8" height="8" rx="1" fill="${GOLD}" ${o(1.4)}/>
  <path d="M40 72 C46 66 56 70 56 82 C54 90 46 92 40 88Z" fill="${TUNIC2}" ${o()}/>
  <path d="M42 89 l-3 6 M46 91 l-1 6 M50 91 l1 6" fill="none" stroke="${FUR}" stroke-width="3" stroke-linecap="round"/>
  <path d="M42 89 l-3 6 M46 91 l-1 6 M50 91 l1 6" fill="none" ${o(1)}/>
  <path d="M76 70 l3 3 l-1 -4 l4 -1 l-4 -1 l1 -4 l-3 3 l-3 -3 l1 4 l-4 1 l4 1 l-1 4Z" fill="${GOLD}" ${o(0.8)}/>
  <path d="M44 42 C42 28 54 20 68 20 C80 20 88 28 90 34 L108 38 C116 40 117 50 110 52 L92 58 C80 62 58 62 50 56 C46 52 44 48 44 42Z" fill="${FUR}" ${o()}/>
  <path d="M44 44 l-6 -2 l5 6 l-6 2 l7 2 l-4 5 l8 -2" fill="${FUR}" ${o(1.6)}/>
  <path d="M52 56 C62 60 82 60 94 55 L106 51 C98 53 88 54 74 52 C64 51 56 52 52 56Z" fill="${FUR2}"/>
  <path d="M74 48 C84 51 98 48 112 46" fill="none" ${o(2.2)}/>
  <path d="M84 49 l2 6 l2 -6 M100 47 l2 6 l2 -6" fill="${W}" ${o(1.1)}/>
  <ellipse cx="111" cy="41" rx="4.6" ry="3.6" fill="${K}"/>
  <ellipse cx="78" cy="34" rx="5.6" ry="4.6" fill="#f6e36b" ${o(1.6)}/><circle cx="79.5" cy="34.5" r="2.2" fill="${K}"/>
  <path d="M70 26 L86 31" fill="none" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M60 50 c3 2 6 2 9 0" fill="none" stroke="${FUR2}" stroke-width="2"/>
  <path d="M44 32 C42 22 50 14 62 2 C70 12 80 18 84 30 C70 26 56 28 44 32Z" fill="${CAP}" ${o()}/>
  <path d="M62 2 C62 10 62 20 63 28" fill="none" stroke="${CAP2}" stroke-width="2.2"/>
  <path d="M44 32 C56 28 70 26 84 30 L86 36 C72 32 56 34 44 38Z" fill="${CAP2}" ${o(1.6)}/>
  <path d="M63 14 l2 4 l4.4 .4 l-3.4 2.8 l1.2 4.3 l-4.2 -2.4 l-4.2 2.4 l1.2 -4.3 l-3.4 -2.8 l4.4 -.4Z" fill="${RED}" ${o(1.2)}/>`;
};

/** Stalin (D12): a big brown bear with a heavy moustache and a pipe, in a plain khaki tunic with gold shoulder boards
 *  and a peaked cap with a red star, glowering. */
const bear = (): string => {
  const FUR = '#7a5232', FUR2 = '#5c3c22', MUZ = '#d8b48a', TUNIC = '#8a865f', TUNIC2 = '#6f6b48', CAP = '#7d7a55', CAP2 = '#5f5c3d';
  return `${spot}
  <path d="M22 116 C20 92 30 74 46 70 L76 70 C92 74 100 92 98 116Z" fill="${TUNIC}" ${o()}/>
  <path d="M60 72 V116" fill="none" ${o(1.6)}/>
  <circle cx="64" cy="84" r="2.6" fill="${GOLD}" ${o(1.2)}/><circle cx="64" cy="96" r="2.6" fill="${GOLD}" ${o(1.2)}/><circle cx="64" cy="108" r="2.6" fill="${GOLD}" ${o(1.2)}/>
  <path d="M40 86 h12 v8 h-12Z M70 86 h12 v8 h-12Z" fill="${TUNIC2}" ${o(1.6)}/>
  <path d="M26 76 l16 -4 l2 6 l-16 4Z M94 76 l-16 -4 l-2 6 l16 4Z" fill="${GOLD}" ${o(1.3)}/>
  <path d="M48 70 L60 78 L72 70" fill="none" ${o(2)}/>
  <circle cx="36" cy="22" r="10" fill="${FUR}" ${o()}/><circle cx="36" cy="22" r="5" fill="${FUR2}"/>
  <circle cx="84" cy="22" r="10" fill="${FUR}" ${o()}/><circle cx="84" cy="22" r="5" fill="${FUR2}"/>
  <path d="M30 44 C28 24 42 14 60 14 C78 14 92 24 90 44 C88 62 76 72 60 72 C44 72 32 62 30 44Z" fill="${FUR}" ${o()}/>
  <ellipse cx="60" cy="52" rx="17" ry="13" fill="${MUZ}" ${o(2)}/>
  <ellipse cx="60" cy="45" rx="6" ry="4.4" fill="${K}"/>
  <path d="M38 56 C44 48 54 50 60 52 C66 50 76 48 82 56 C76 58 68 56 60 58 C52 56 44 58 38 56Z" fill="#2a1d14" ${o(1.6)}/>
  <path d="M54 62 C58 64 62 64 66 62" fill="none" ${o(2)}/>
  <path d="M66 62 L84 66 L86 62 L92 62 C96 62 98 66 96 70 C94 74 88 74 86 70 L84 70 L64 66Z" fill="#4a2e1c" ${o(1.6)}/>
  <path d="M94 58 c-2 -4 2 -6 0 -10 M99 56 c-2 -4 2 -6 0 -10" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="50" cy="38" rx="4.6" ry="3.8" fill="${W}" ${o(1.4)}/><circle cx="51" cy="38.6" r="2.2" fill="${K}"/>
  <ellipse cx="70" cy="38" rx="4.6" ry="3.8" fill="${W}" ${o(1.4)}/><circle cx="69" cy="38.6" r="2.2" fill="${K}"/>
  <path d="M42 30 L56 35 M78 30 L64 35" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
  <path d="M36 26 C34 6 86 6 84 26Z" fill="${CAP}" ${o()}/>
  <path d="M37 24 H83" stroke="${CAP2}" stroke-width="3.4"/>
  <path d="M34 26 H86 C84 31 74 32 60 32 C46 32 36 31 34 26Z" fill="#2b2a22" ${o(1.8)}/>
  <path d="M60 10 l2 4 l4.4 .4 l-3.4 2.8 l1.2 4.3 l-4.2 -2.4 l-4.2 2.4 l1.2 -4.3 l-3.4 -2.8 l4.4 -.4Z" fill="${RED}" ${o(1.2)}/>`;
};

const svg = (body: string, cls: string): string => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${body}</svg>`;

/** The big picture on a role card. In the communist theme (D12) the hidden side is the wolf and its leader the bear. */
export const portrait = (r: Role, pack: Pack = 'fascismo'): string => svg(r === 'liberal' ? bird() : pack === 'comunismo' ? (r === 'hitler' ? bear() : wolf()) : r === 'hitler' ? cobra() : gator(), 'art');

/** The seal of a party on law cards and on the board: a symbol, not a character (the scales; the skull, or the star in
 *  the communist theme). */
export const seal = (p: Law, pack: Pack = 'fascismo'): string => `<span class="glyph" aria-hidden="true">${p === 'L' ? '⚖' : pack === 'comunismo' ? '★' : '☠'}</span>`;

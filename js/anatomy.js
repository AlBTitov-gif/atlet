/* ============================================================
   Карта мышц: фигура человека, мышцы показаны плоскими
   анатомическими блоками (как в фитнес-инфографике).
   Вид спереди. viewBox 320×560.
   ============================================================ */
import { GROUPS } from './exercises.js';

const C = {
  skin: '#d7dae2',
  skinDark: '#c2c7d2',
  line: '#9aa1b2',
  shadow: '#b9bfcb',
};

const COLORS = {
  cold: '#6f5b9e',
  cool: '#8f6fd6',
  warm: '#b76fd9',
  hot: '#e06b9b',
  glow: '#f08aae',
};

function tone(pct) {
  if (pct >= 35) return COLORS.hot;
  if (pct >= 20) return COLORS.warm;
  if (pct >= 8) return COLORS.cool;
  return COLORS.cold;
}
function alpha(pct) {
  if (pct <= 0) return 0.12;
  return Math.min(0.92, 0.32 + pct / 90);
}

/* ---------- тело ---------- */
function body() {
  return `
  <g class="body" stroke="${C.line}" stroke-width="1.4" stroke-linejoin="round">
    <!-- голова -->
    <path fill="${C.skin}" d="M160 22c-15 0-25 11-25 26 0 16 11 28 25 28s25-12 25-28c0-15-10-26-25-26Z"/>
    <!-- шея -->
    <path fill="${C.skinDark}" d="M146 72h28v20h-28z"/>
    <!-- торс: плечи 120..200, талия 140..180, бёдра 132..188 -->
    <path fill="${C.skin}" d="M160 88c-20 0-36 3-48 10-9 5-13 13-15 23l-6 40c-2 13-2 25 0 37 2 12 5 22 9 32l5 12h110l5-12c4-10 7-20 9-32 2-12 2-24 0-37l-6-40c-2-10-6-18-15-23-12-7-28-10-48-10Z"/>
    <!-- дельты -->
    <ellipse fill="${C.skin}" cx="114" cy="106" rx="17" ry="18"/>
    <ellipse fill="${C.skin}" cx="206" cy="106" rx="17" ry="18"/>
    <!-- руки -->
    <path fill="${C.skin}" d="M104 122c-6 15-9 33-10 52-1 18 0 35 2 50l3 20h25l-2-24-1-48 3-50h-20Z"/>
    <path fill="${C.skin}" d="M216 122c6 15 9 33 10 52 1 18 0 35-2 50l-3 20h-25l2-24 1-48-3-50h20Z"/>
    <!-- кисти -->
    <path fill="${C.skinDark}" d="M100 244c-2 13-2 24 0 31 2 8 7 12 13 12s11-4 12-12c2-7 2-18 0-31h-25Z"/>
    <path fill="${C.skinDark}" d="M220 244c2 13 2 24 0 31-2 8-7 12-13 12s-11-4-12-12c-2-7-2-18 0-31h25Z"/>
    <!-- ноги -->
    <path fill="${C.skin}" d="M160 238c-12 0-24 1-32 4-8 22-12 47-13 71-1 23 0 44 2 63l3 34h37l3-38c3-20 4-42 3-62-1-25-6-47-12-64l6-2Z"/>
    <path fill="${C.skin}" d="M160 238c12 0 24 1 32 4 8 22 12 47 13 71 1 23 0 44-2 63l-3 34h-37l-3-38c-3-20-4-42-3-62 1-25 6-47 12-64l-6-2Z"/>
    
    <!-- разделитель ног -->
    <!-- стопы -->
  </g>`;
}

/* ---------- мышцы ---------- */
function musclePath(pct, d, extra = '') {
  const c = tone(pct);
  return `<path d="${d}" fill="${c}" fill-opacity="${alpha(pct).toFixed(2)}" stroke="${c}" stroke-opacity="0.45" stroke-width="1.2" ${extra}/>`;
}

function muscles(pct) {
  const p = (g) => pct[g] || 0;
  return `
  <!-- трапеции -->
  ${musclePath(p('shoulders'), 'M160 88c-14 0-27 3-38 8 9 10 23 16 38 16s29-6 38-16c-11-5-24-8-38-8Z')}

  <!-- грудные -->
  ${musclePath(p('chest'), 'M157 108c-15-3-28 1-36 10-6 7-8 15-8 24 0 12 6 21 16 25 8 3 18 2 28-2v-57Z')}
  ${musclePath(p('chest'), 'M163 108c15-3 28 1 36 10 6 7 8 15 8 24 0 12-6 21-16 25-8 3-18 2-28-2v-57Z')}

  <!-- дельты -->
  ${musclePath(p('shoulders'), 'M114 88c-10 2-17 10-20 20-3 10-4 21-4 31l16 3 5-30 3-24Z')}
  ${musclePath(p('shoulders'), 'M206 88c10 2 17 10 20 20 3 10 4 21 4 31l-16 3-5-30-3-24Z')}

  <!-- бицепсы -->
  ${musclePath(p('arms'), 'M113 132c-6 15-9 33-10 51l17 3c2-18 5-36 8-50l-15-4Z')}
  ${musclePath(p('arms'), 'M207 132c6 15 9 33 10 51l-17 3c-2-18-5-36-8-50l15-4Z')}

  <!-- предплечья -->
  ${musclePath(p('arms'), 'M106 192c-2 18-2 36-1 50l3 18 14-2-3-22-1-44h-12Z')}
  ${musclePath(p('arms'), 'M214 192c2 18 2 36 1 50l-3 18-14-2 3-22 1-44h12Z')}

  <!-- пресс -->
  ${musclePath(p('core'), 'M149 158h22v18h-22z')}
  ${musclePath(p('core'), 'M149 180h22v18h-22z')}
  ${musclePath(p('core'), 'M149 202h22v18h-22z')}
  ${musclePath(p('core'), 'M145 224h30l-4 16h-22l-4-16Z')}

  <!-- косые -->
  ${musclePath(p('core'), 'M134 164c-4 20-5 41-3 58l15 8 2-66h-14Z')}
  ${musclePath(p('core'), 'M186 164c4 20 5 41 3 58l-15 8-2-66h14Z')}

  <!-- квадрицепсы -->
  ${musclePath(p('legs'), 'M147 252c-6 26-9 54-10 82l24 2 3-84h-17Z')}
  ${musclePath(p('legs'), 'M173 252c6 26 9 54 10 82l-24 2-3-84h17Z')}
  ${musclePath(p('legs'), 'M149 350c-2 22-2 44-1 64h10l1-64h-10Z')}
  ${musclePath(p('legs'), 'M171 350c2 22 2 44 1 64h-10l-1-64h10Z')}

  <!-- ягодицы (спереди — линия паха) -->
  ${musclePath(p('glutes'), 'M143 248h34l-2 12h-30l-2-12Z')}`;
}

/**
 * @param {Record<string, number>} pct
 * @param {Array<{key:string,x:number,y:number,side:'l'|'r',pct:number}>} labels
 */
export function anatomySvg(pct = {}, labels = []) {
  const labelHtml = labels
    .map((l) => {
      const endX = l.side === 'l' ? 40 : 280;
      const midX = l.side === 'l' ? 84 : 236;
      return `<g class="bm-label">
        <path d="M${l.x} ${l.y} L${midX} ${l.y} L${endX} ${l.y}" fill="none" stroke="${tone(l.pct)}" stroke-opacity=".6" stroke-width="1"/>
        <circle cx="${l.x}" cy="${l.y}" r="2.6" fill="${tone(l.pct)}" stroke="#0b0c0f" stroke-width="1"/>
        <text x="${l.side === 'l' ? endX + 6 : endX - 6}" y="${l.y + 4}" text-anchor="${l.side === 'l' ? 'start' : 'end'}" class="bm-label__txt">${Math.round(l.pct)}%</text>
      </g>`;
    })
    .join('');

  return `<svg class="anatomy" viewBox="0 0 320 560" role="img" aria-label="Карта нагрузки по мышцам">
    <defs>
      <radialGradient id="bm-glow" cx="50%" cy="40%" r="55%">
        <stop offset="0" stop-color="#8f6fd6" stop-opacity=".16"/>
        <stop offset="1" stop-color="#8f6fd6" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="160" cy="270" rx="150" ry="250" fill="url(#bm-glow)"/>
    ${body()}
    ${muscles(pct)}
    ${labelHtml}
  </svg>`;
}

export const LABEL_META = [
  { key: 'shoulders', x: 120, y: 104, side: 'l' },
  { key: 'chest', x: 140, y: 122, side: 'l' },
  { key: 'arms', x: 108, y: 170, side: 'l' },
  { key: 'core', x: 152, y: 196, side: 'l' },
  { key: 'legs', x: 140, y: 340, side: 'l' },
  { key: 'glutes', x: 152, y: 252, side: 'r' },
  { key: 'shoulders', x: 200, y: 104, side: 'r' },
  { key: 'arms', x: 212, y: 170, side: 'r' },
  { key: 'core', x: 168, y: 196, side: 'r' },
  { key: 'legs', x: 178, y: 400, side: 'r' },
];

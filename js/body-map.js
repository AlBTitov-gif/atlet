/* ============================================================
   Карта мышц: фигура человека (спереди и сзади) с подсветкой
   групп пропорционально проценту нагрузки.

   Фигура строится из «скелета»: сначала тело, затем мышцы —
   поэтому части всегда совпадают.
   ============================================================ */
import { GROUPS } from './exercises.js';

const W = 214;
const H = 520;

/* ---------- геометрия (viewBox 220×520, фигура по центру) ---------- */
const GEO = {
  head: { cx: 110, cy: 36, rx: 16, ry: 19 },
  neck: { x1: 110, y1: 50, x2: 110, y2: 72 },
  // плечи / талия / бёдра
  shoulders: { y: 80, x1: 72, x2: 148 },
  chest: { y: 128, x1: 82, x2: 138 },
  waist: { y: 172, x1: 90, x2: 130 },
  hips: { y: 208, x1: 86, x2: 134 },
  // руки
  armL: [
    [78, 92],
    [72, 156],
    [68, 224],
  ],
  armR: [
    [142, 92],
    [148, 156],
    [152, 224],
  ],
  handL: { cx: 67, cy: 236, rx: 9, ry: 11 },
  handR: { cx: 153, cy: 236, rx: 9, ry: 11 },
  // ноги
  legL: [
    [98, 216],
    [97, 300],
    [96, 366],
    [95, 446],
  ],
  legR: [
    [122, 216],
    [123, 300],
    [124, 366],
    [125, 446],
  ],
  footL: { cx: 92, cy: 460, rx: 16, ry: 9 },
  footR: { cx: 128, cy: 460, rx: 16, ry: 9 },
};

const TORSO_PATH = `M110 74
  C 90 74, 72 80, 66 92
  C 60 104, 70 120, 75 136
  C 80 152, 88 168, 88 184
  C 88 198, 84 208, 80 220
  L 140 220
  C 138 208, 132 198, 132 184
  C 132 168, 140 152, 145 136
  C 150 120, 160 104, 154 92
  C 148 80, 130 74, 110 74 Z`;

const strokeLine = (pts, w) =>
  `<path d="M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ---------- мышцы ---------- */
function frontMuscles(pct, colorOf) {
  const s = (g) => {
    const p = pct[g] || 0;
    const color = colorOf(g);
    const on = p > 0;
    return `fill="${color}" fill-opacity="${on ? (0.18 + (p / 100) * 0.78).toFixed(3) : 0.04}" stroke="${color}" stroke-opacity="${on ? 0.5 : 0.08}" stroke-width="1"`;
  };
  return `
  <g class="muscle muscle--chest">
    <path ${s('chest')} d="M84 112c-2 9 3 16 12 17h10v-19c-8-2-16-1-22 2Z"/>
    <path ${s('chest')} d="M136 112c2 9-3 16-12 17h-10v-19c8-2 16-1 22 2Z"/>
  </g>
  <g class="muscle muscle--shoulders">
    <ellipse ${s('shoulders')} cx="74" cy="98" rx="12" ry="10"/>
    <ellipse ${s('shoulders')} cx="146" cy="98" rx="12" ry="10"/>
  </g>
  <g class="muscle muscle--arms">
    ${strokeLine([[76, 106], [72, 148]], 20).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[144, 106], [148, 148]], 20).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[71, 162], [68, 206]], 16).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[149, 162], [152, 206]], 16).replace('<path', `<path ${s('arms')}`)}
  </g>
  <g class="muscle muscle--core">
    <path ${s('core')} d="M98 136h24v58H98z"/>
    <path ${s('core')} d="M88 142c-3 14-2 34 1 50l7 3 1-53h-9Z"/>
    <path ${s('core')} d="M132 142c3 14 2 34-1 50l-7 3-1-53h9Z"/>
  </g>
  <g class="muscle muscle--legs">
    ${strokeLine([[99, 224], [98, 292]], 38).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[121, 224], [122, 292]], 38).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[96, 310], [95, 366]], 32).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[124, 310], [125, 366]], 32).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[95, 378], [94, 432]], 22).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[125, 378], [126, 432]], 22).replace('<path', `<path ${s('legs')}`)}
  </g>`;
}

function backMuscles(pct, colorOf) {
  const s = (g) => {
    const p = pct[g] || 0;
    const color = colorOf(g);
    const on = p > 0;
    return `fill="${color}" fill-opacity="${on ? (0.18 + (p / 100) * 0.78).toFixed(3) : 0.04}" stroke="${color}" stroke-opacity="${on ? 0.5 : 0.08}" stroke-width="1"`;
  };
  return `
  <g class="muscle muscle--back">
    <path ${s('back')} d="M84 108c-8 8-10 22-8 38 2 16 7 32 14 46l6 6 5-18 9 16 9-16 5 18 6-6c7-14 12-30 14-46 2-16 0-30-8-38l-26 22-26-22Z"/>
  </g>
  <g class="muscle muscle--shoulders">
    <ellipse ${s('shoulders')} cx="74" cy="98" rx="13" ry="11"/>
    <ellipse ${s('shoulders')} cx="146" cy="98" rx="13" ry="11"/>
  </g>
  <g class="muscle muscle--arms">
    ${strokeLine([[76, 106], [72, 148]], 20).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[144, 106], [148, 148]], 20).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[71, 162], [68, 206]], 16).replace('<path', `<path ${s('arms')}`)}
    ${strokeLine([[149, 162], [152, 206]], 16).replace('<path', `<path ${s('arms')}`)}
  </g>
  <g class="muscle muscle--glutes">
    <path ${s('glutes')} d="M80 208c-3 12 2 22 12 24h8v-26l-20 2Z"/>
    <path ${s('glutes')} d="M140 208c3 12-2 22-12 24h-8v-26l20 2Z"/>
  </g>
  <g class="muscle muscle--legs">
    ${strokeLine([[99, 224], [98, 292]], 38).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[121, 224], [122, 292]], 38).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[96, 310], [95, 366]], 32).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[124, 310], [125, 366]], 32).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[95, 378], [94, 432]], 22).replace('<path', `<path ${s('legs')}`)}
    ${strokeLine([[125, 378], [126, 432]], 22).replace('<path', `<path ${s('legs')}`)}
  </g>`;
}

const BODY = `
  <g class="body-base" fill="url(#bm-body)" stroke="rgba(255,255,255,.18)" stroke-width="1.1" stroke-linejoin="round">
    <ellipse cx="${GEO.head.cx}" cy="${GEO.head.cy}" rx="${GEO.head.rx}" ry="${GEO.head.ry}"/>
    <path d="M101 50h18v30h-18z"/>
    <path d="${TORSO_PATH}"/>
    ${strokeLine(GEO.armL, 22)}
    ${strokeLine(GEO.armR, 22)}
    <ellipse cx="${GEO.handL.cx}" cy="${GEO.handL.cy}" rx="${GEO.handL.rx}" ry="${GEO.handL.ry}"/>
    <ellipse cx="${GEO.handR.cx}" cy="${GEO.handR.cy}" rx="${GEO.handR.rx}" ry="${GEO.handR.ry}"/>
    ${strokeLine(GEO.legL, 38)}
    ${strokeLine(GEO.legR, 38)}
    <ellipse cx="${GEO.footL.cx}" cy="${GEO.footL.cy}" rx="${GEO.footL.rx}" ry="${GEO.footL.ry}"/>
    <ellipse cx="${GEO.footR.cx}" cy="${GEO.footR.cy}" rx="${GEO.footR.rx}" ry="${GEO.footR.ry}"/>
  </g>`;

/**
 * @param {Record<string, number>} pct — проценты по группам
 * @param {Record<string, string>} colors — цвета групп
 */
export function bodyMapSvg(pct = {}, colors = {}) {
  const c = (g) => colors[g] || GROUPS[g]?.color || '#c6f24a';
  const p = (g) => Math.max(0, Math.min(100, pct[g] || 0));

  return `<svg class="bodymap" viewBox="0 0 440 530" role="img" aria-label="Карта нагрузки по мышцам">
    <defs>
      <linearGradient id="bm-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#39424f"/>
        <stop offset="1" stop-color="#1c222b"/>
      </linearGradient>
    </defs>
    <g class="bodymap__figure bodymap__figure--front">${BODY}${frontMuscles(pct, c)}
      <text x="110" y="516" text-anchor="middle" class="bodymap__cap">спереди</text>
    </g>
    <g class="bodymap__figure bodymap__figure--back" transform="translate(220 0)">${BODY}${backMuscles(pct, c)}
      <text x="110" y="516" text-anchor="middle" class="bodymap__cap">сзади</text>
    </g>
  </svg>`;
}

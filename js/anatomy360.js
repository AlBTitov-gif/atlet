/* ============================================================
   Вращающаяся карта мышц: 8 ракурсов фотографической фигуры
   + послойная подсветка каждой группы мышц по проценту нагрузки.
   ============================================================ */

const VIEWS = [0, 45, 90, 135, 180, 225, 270, 315];
import { ZONES, zoneValue } from './muscles.js';


const VIEW_NAME = {
  0: 'Спереди',
  45: 'Спереди-слева',
  90: 'Слева',
  135: 'Сзади-слева',
  180: 'Сзади',
  225: 'Сзади-справа',
  270: 'Справа',
  315: 'Спереди-справа',
};

export const GROUP_LABEL = {
  chest: 'Грудь',
  back: 'Спина',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Пресс',
  glutes: 'Ягодицы',
  legs: 'Ноги',
};

/* палитра из манифеста: синий → голубой → жёлтый → оранжевый → красный */
const STOPS = [
  [0, [82, 123, 185]],
  [25, [99, 175, 203]],
  [50, [228, 200, 97]],
  [75, [241, 140, 56]],
  [100, [233, 30, 44]],
];

export function heatColor(pct) {
  const v = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    const [p0, c0] = STOPS[i - 1];
    if (v <= p1) {
      const t = (v - p0) / (p1 - p0 || 1);
      const c = c0.map((x, k) => Math.round(x + (c1[k] - x) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return 'rgb(233, 30, 44)';
}

function frameHtml(angle, index, pct) {
  const n = String(angle).padStart(3, '0');
  const maxPct = Math.max(1, ...Object.values(pct));
  const tints = ZONES.map((zone) => {
    const v = zoneValue(zone, angle, pct);
    const ratio = v / maxPct;
    if (ratio < 0.45) return '';
    const rel = ratio * 100;
    const opacity = Math.min(0.9, 0.28 + ratio * 0.55);
    return (
      `<div class="f360-tint" data-zone="${zone}" data-pct="${v.toFixed(1)}" ` +
      `style="background:${heatColor(rel)};opacity:${opacity.toFixed(2)};` +
      `-webkit-mask-image:url(assets/anatomy/${n}-${zone}.png);` +
      `mask-image:url(assets/anatomy/${n}-${zone}.png)"></div>`
    );
  }).join('');
  return (
    `<div class="f360-frame ${index === 0 ? 'is-on' : ''}" data-frame="${angle}">` +
    `<img class="f360-frame__body" src="assets/anatomy/${n}-body.webp" alt="" ` +
    `loading="${index < 2 ? 'eager' : 'lazy'}" draggable="false">` +
    `<div class="f360-frame__tints">${tints}</div>` +
    `</div>`
  );
}

/**
 * @param {Record<string, number>} pct — проценты по группам мышц
 */
export function anatomy360Html(pct = {}) {
  const frames = VIEWS.map((a, i) => frameHtml(a, i, pct)).join('');
  const dots = VIEWS.map(
    (a, i) =>
      `<button class="f360__dot ${i === 0 ? 'is-on' : ''}" data-goto="${i}" aria-label="${VIEW_NAME[a]}"></button>`
  ).join('');
  return `<div class="f360" data-angle="0">
    <div class="f360__stage" data-stage>
      ${frames}
      <span class="f360__badge" data-badge>Спереди</span>
    </div>
    <div class="f360__legend"><span>меньше</span><i class="f360__grad"></i><span>больше</span></div>
    <div class="f360__nav">
      <button class="f360__arrow" data-dir="-1" aria-label="Повернуть влево">‹</button>
      <div class="f360__dots">${dots}</div>
      <button class="f360__arrow" data-dir="1" aria-label="Повернуть вправо">›</button>
    </div>
    <div class="f360__hint">Потяните фигуру, чтобы повернуть</div>
  </div>`;
}

/** Навешивает вращение: свайп, кнопки, точки */
export function mountAnatomy360(root = document) {
  const fig = root.querySelector('.f360');
  if (!fig) return;
  const frames = [...fig.querySelectorAll('.f360-frame')];
  const dots = [...fig.querySelectorAll('.f360__dot')];
  const badge = fig.querySelector('[data-badge]');
  const stage = fig.querySelector('[data-stage]');
  let idx = 0;

  const show = (next) => {
    idx = (next + frames.length) % frames.length;
    frames.forEach((f, i) => f.classList.toggle('is-on', i === idx));
    dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
    const angle = Number(frames[idx].dataset.frame);
    if (badge) badge.textContent = VIEW_NAME[angle] || '';
    fig.dataset.angle = String(angle);
    fig.dispatchEvent(new CustomEvent('f360:change', { detail: { angle, index: idx } }));
  };

  for (const b of fig.querySelectorAll('[data-goto]')) {
    b.addEventListener('click', () => show(Number(b.dataset.goto)));
  }
  for (const b of fig.querySelectorAll('[data-dir]')) {
    b.addEventListener('click', () => show(idx + Number(b.dataset.dir)));
  }

  let startX = null;
  let startY = null;
  let moved = false;
  stage.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    stage.style.cursor = 'grabbing';
  });
  stage.addEventListener('pointermove', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      moved = true;
      show(idx + (dx < 0 ? 1 : -1));
      startX = e.clientX;
      startY = e.clientY;
    }
  });
  const end = () => {
    startX = null;
    stage.style.cursor = '';
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('pointerleave', end);

  // предзагрузка кадров
  for (const f of frames) {
    const img = f.querySelector('img');
    if (img && !img.complete) img.loading = 'eager';
  }
}

/* ============================================================
   Вращающаяся карта мышц (8 ракурсов из фотографического рендера)
   ============================================================ */

const ANGLE_STEP = 45;
const VIEWS = [0, 45, 90, 135, 180, 225, 270, 315];
const VIEW_NAME = {
  0: 'Спереди',
  45: 'Спереди‑слева',
  90: 'Слева',
  135: 'Сзади‑слева',
  180: 'Сзади',
  225: 'Сзади‑справа',
  270: 'Справа',
  315: 'Спереди‑справа',
};

/* какие группы видны в ракурсе и с каким весом (для общего тона подсветки) */
const VIEW_WEIGHTS = {
  0: { chest: 0.3, core: 0.22, shoulders: 0.16, arms: 0.2, legs: 0.12 },
  45: { chest: 0.25, core: 0.18, shoulders: 0.16, arms: 0.22, legs: 0.19 },
  90: { shoulders: 0.2, arms: 0.3, core: 0.2, legs: 0.3 },
  135: { back: 0.28, legs: 0.27, arms: 0.2, glutes: 0.25 },
  180: { back: 0.36, glutes: 0.24, legs: 0.26, arms: 0.14 },
  225: { back: 0.28, legs: 0.27, arms: 0.2, glutes: 0.25 },
  270: { shoulders: 0.2, arms: 0.3, core: 0.2, legs: 0.3 },
  315: { chest: 0.25, core: 0.18, shoulders: 0.16, arms: 0.22, legs: 0.19 },
};

/* подписи: якорь в долях кадра 480×800 */
const LABELS = {
  0: [
    { key: 'shoulders', x: 0.285, y: 0.215, side: 'l' },
    { key: 'chest', x: 0.5, y: 0.25, side: 'l' },
    { key: 'arms', x: 0.255, y: 0.32, side: 'l' },
    { key: 'core', x: 0.5, y: 0.35, side: 'l' },
    { key: 'legs', x: 0.41, y: 0.62, side: 'l' },
    { key: 'shoulders', x: 0.715, y: 0.215, side: 'r' },
    { key: 'arms', x: 0.745, y: 0.32, side: 'r' },
    { key: 'core', x: 0.61, y: 0.35, side: 'r' },
    { key: 'legs', x: 0.59, y: 0.78, side: 'r' },
  ],
  180: [
    { key: 'shoulders', x: 0.29, y: 0.2, side: 'l' },
    { key: 'back', x: 0.5, y: 0.28, side: 'l' },
    { key: 'arms', x: 0.255, y: 0.33, side: 'l' },
    { key: 'glutes', x: 0.44, y: 0.47, side: 'l' },
    { key: 'legs', x: 0.4, y: 0.63, side: 'l' },
    { key: 'shoulders', x: 0.71, y: 0.2, side: 'r' },
    { key: 'arms', x: 0.745, y: 0.33, side: 'r' },
    { key: 'glutes', x: 0.56, y: 0.47, side: 'r' },
    { key: 'legs', x: 0.6, y: 0.78, side: 'r' },
  ],
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
      const t = (v - p0) / (p1 - p0);
      const c = c0.map((x, k) => Math.round(x + (c1[k] - x) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return 'rgb(233, 30, 44)';
}

function viewLoad(pct, angle) {
  const w = VIEW_WEIGHTS[angle] || {};
  let sum = 0;
  let total = 0;
  for (const [g, k] of Object.entries(w)) {
    sum += (pct[g] || 0) * k;
    total += k;
  }
  return total ? sum / total : 0;
}

function labelsHtml(pct, angle) {
  const list = LABELS[angle] || [];
  return list
    .map((l) => {
      const v = Math.round(pct[l.key] || 0);
      if (v <= 0) return '';
      const color = heatColor(v);
      return `<div class="f360-label f360-label--${l.side}" style="left:${(l.x * 100).toFixed(1)}%;top:${(l.y * 100).toFixed(1)}%">
        <span class="f360-label__dot" style="background:${color}"></span>
        <span class="f360-label__txt">${GROUP_LABEL[l.key]} <b>${v}%</b></span>
      </div>`;
    })
    .join('');
}

/**
 * @param {Record<string, number>} pct — проценты по группам
 */
export function anatomy360Html(pct = {}) {
  const layers = VIEWS.map((angle, i) => {
    const n = String(angle).padStart(3, '0');
    const load = viewLoad(pct, angle);
    const color = heatColor(load);
    const opacity = 0; // включается, когда появятся маски по группам
    return `<div class="f360-frame ${i === 0 ? 'is-on' : ''}" data-frame="${angle}">
      <img class="f360-frame__body" src="assets/anatomy/${n}-body.webp" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false">
      <div class="f360-frame__tint" style="background:${color};opacity:${opacity.toFixed(2)};-webkit-mask-image:url(assets/anatomy/${n}-mask.png);mask-image:url(assets/anatomy/${n}-mask.png)"></div>
    </div>`;
  }).join('');

  return `<div class="f360" data-angle="0">
    <div class="f360__stage" data-stage>
      ${layers}
      <span class="f360__badge" data-badge>Спереди</span>
    </div>
    <div class="f360__nav">
      <button class="f360__arrow" data-dir="-1" aria-label="Повернуть влево">${'‹'}</button>
      <div class="f360__dots">${VIEWS.map(
        (a, i) => `<button class="f360__dot ${i === 0 ? 'is-on' : ''}" data-goto="${i}" aria-label="${VIEW_NAME[a]}"></button>`
      ).join('')}</div>
      <button class="f360__arrow" data-dir="1" aria-label="Повернуть вправо">${'›'}</button>
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

  // свайп / перетаскивание
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
    if (!moved && Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.2) {
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

  // предзагрузка всех кадров
  for (const f of frames) {
    const img = f.querySelector('img');
    if (img && !img.complete) img.loading = 'eager';
  }
}

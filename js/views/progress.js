/* ============================================================
   Прогресс: графики, группы мышц, рекорды, замеры и фото
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import {
  escapeHtml, num, fmt, fmtVolume, fmtMinutes, fmtDate, fmtDateShort, fmtWeight, isoDate, addDays,
  plural, e1rm, haptic,
} from '../utils.js';
import {
  weekSummary, weeklySeries, weeklyCount, groupVolume, topExercises, topRecords, totalStats,
  currentStreak, finishedWorkouts, exerciseName, exerciseGroup, weightSeries, measurementSeries,
} from '../analytics.js';
import { GROUPS, GROUP_ORDER } from '../exercises.js';
import { topbar, emptyState, refresh, sheet, confirmDialog, toast, promptDialog } from '../ui.js';
import { openMeasureSheet, openPhotoSheet, PHOTO_TYPES } from './measure.js';

let period = 'month';

const PERIODS = [
  { id: 'week', label: '7 дней', days: 7 },
  { id: 'month', label: '30 дней', days: 30 },
  { id: 'quarter', label: '90 дней', days: 90 },
  { id: 'all', label: 'Всё', days: 3650 },
];

export default function renderProgress() {
  const total = totalStats();
  const periodDays = PERIODS.find((p) => p.id === period)?.days || 30;
  const from = isoDate(addDays(new Date(), -periodDays + 1));
  const ws = finishedWorkouts().filter((w) => (w.date || isoDate(w.startedAt)) >= from);
  const vol = ws.reduce((a, w) => a + (w.items || []).reduce((b, it) => b + it.sets.reduce((c, s) => c + (num(s.weight) || 0) * (num(s.reps) || 0), 0), 0), 0);
  const sets = ws.reduce((a, w) => a + (w.items || []).reduce((b, it) => b + it.sets.length, 0), 0);
  const avgPerWeek = periodDays >= 7 ? ws.length / (periodDays / 7) : ws.length;
  const gv = groupVolume(from, isoDate(new Date()));
  const top = topExercises(6, periodDays);
  const recs = topRecords(8);
  const wser = weeklySeries(8);
  const cser = weeklyCount(8);
  const streak = currentStreak();
  const measurements = measurementSeries();
  const lastM = measurements[measurements.length - 1];

  const body = `
    <div class="pad" style="margin-top:6px">
      <div class="segmented">
        ${PERIODS.map((p) => `<button data-period="${p.id}" class="${period === p.id ? 'is-on' : ''}">${p.label}</button>`).join('')}
      </div>
    </div>

    <div class="pad" style="margin-top:12px">
      <div class="metrics">
        <div class="metric"><div class="metric__v">${fmtVolume(vol)}</div><div class="metric__l">Объём, кг</div></div>
        <div class="metric"><div class="metric__v">${ws.length}</div><div class="metric__l">Тренировок</div></div>
        <div class="metric"><div class="metric__v">${sets}</div><div class="metric__l">Подходов</div></div>
      </div>
      <div class="metrics" style="margin-top:8px;grid-template-columns:repeat(2,1fr)">
        <div class="metric"><div class="metric__v">${fmt(avgPerWeek, 1)}<small>/нед</small></div><div class="metric__l">Частота, нед</div></div>
        <div class="metric"><div class="metric__v">${streak}<small>дн</small></div><div class="metric__l">Серия, дней</div></div>
      </div>
    </div>

    <div class="section-title"><h2>Объём по неделям</h2><span class="muted">кг</span></div>
    <div class="pad">
      <div class="card card--pad">
        ${barChart(wser.map((x) => ({ label: x.label, value: Math.round(x.volume) })), { fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'т' : v) })}
      </div>
    </div>

    <div class="section-title"><h2>Тренировок в неделю</h2></div>
    <div class="pad">
      <div class="card card--pad">
        ${barChart(cser.map((x) => ({ label: x.label, value: x.value })), { fmt: (v) => v, accent: '#5b9dff' })}
      </div>
    </div>

    <div class="section-title"><h2>Нагрузка по группам</h2><span class="muted">подходы</span></div>
    <div class="pad">
      <div class="card card--pad">
        ${groupBars(gv)}
      </div>
    </div>

    ${
      top.length
        ? `<div class="section-title"><h2>Топ упражнений</h2><span class="muted">${periodLabel(period)}</span></div>
        <div class="pad"><div class="card list">
          ${top
            .map((t) => {
              const g = GROUPS[t.group] || GROUPS.chest;
              return `<button class="list__row" data-action="open-exercise" data-id="${t.exerciseId}">
                <span class="list__icon" style="background:${g.color}1a;color:${g.color}">${icon('dumbbell', 17)}</span>
                <span class="grow"><span class="list__label ellipsis" style="display:block">${escapeHtml(t.name)}</span><span class="list__sub">${t.sessions} ${plural(t.sessions, 'тренировка', 'тренировки', 'тренировок')} · ${t.sets} подх. · макс ${fmt(t.best)} кг</span></span>
                ${icon('chevronRight', 18, 'list__chev')}
              </button>`;
            })
            .join('')}
        </div></div>`
        : ''
    }

    ${
      recs.length
        ? `<div class="section-title"><h2>Силовые рекорды</h2><span class="muted">расчёт 1ПМ</span></div>
        <div class="pad"><div class="card list">
          ${recs
            .map(
              (r, i) => `<button class="list__row" data-action="open-exercise" data-id="${r.exerciseId}">
              <span class="list__icon ${i === 0 ? 'list__icon--accent' : ''}">${icon('trophy', 17)}</span>
              <span class="grow"><span class="list__label ellipsis" style="display:block">${escapeHtml(r.name)}</span><span class="list__sub">${fmt(r.weight)} кг × ${r.reps} · ${fmtDate(r.date)}</span></span>
              <span class="badge badge--accent">${Math.round(r.e1rm)} кг</span>
            </button>`
            )
            .join('')}
        </div></div>`
        : ''
    }

    <div class="section-title"><h2>Замеры тела</h2><button class="link" data-action="open-measure">Добавить</button></div>
    <div class="pad">
      ${
        lastM
          ? `<div class="card card--pad">
              <div class="row" style="align-items:flex-start">
                <div class="grow">
                  <div class="tiny">ПОСЛЕДНИЙ ЗАМЕР · ${fmtDate(lastM.date)}</div>
                  <div class="row" style="gap:16px;margin-top:8px;flex-wrap:wrap">
                    ${num(lastM.weight) ? `<div><div class="num" style="font-size:22px;font-weight:750">${fmt(lastM.weight, 1)}<span class="muted"> кг</span></div><div class="tiny">вес</div></div>` : ''}
                    ${num(lastM.waist) ? `<div><div class="num" style="font-size:22px;font-weight:750">${fmt(lastM.waist, 1)}<span class="muted"> см</span></div><div class="tiny">талия</div></div>` : ''}
                    ${num(lastM.chest) ? `<div><div class="num" style="font-size:22px;font-weight:750">${fmt(lastM.chest, 1)}<span class="muted"> см</span></div><div class="tiny">грудь</div></div>` : ''}
                  </div>
                </div>
                <button class="btn btn--icon btn--soft" data-action="open-measure">${icon('plus', 18)}</button>
              </div>
              ${
                weightSeries().length > 1
                  ? `<div style="margin-top:12px">${lineChart(weightSeries().slice(-14), { unit: 'кг' })}</div>`
                  : ''
              }
              <button class="btn btn--ghost btn--sm btn--block" style="margin-top:6px" data-action="measure-history">Вся история замеров</button>
            </div>`
          : `<div class="card card--pad" style="text-align:center;padding:22px">
              <div class="empty__icon" style="margin:0 auto 8px">${icon('ruler', 24)}</div>
              <div class="h3">Ведите замеры</div>
              <div class="muted" style="margin-top:4px">Вес, грудь, талия, бёдра — прогресс в цифрах, а не только в зеркале.</div>
              <button class="btn btn--primary btn--sm" style="margin-top:12px" data-action="open-measure">${icon('plus', 15)} Добавить замер</button>
            </div>`
      }
    </div>

    <div class="section-title"><h2>Фото прогресса</h2><button class="link" data-action="open-photo">Добавить</button></div>
    <div class="pad">
      ${photoGallery()}
    </div>

    <div class="pad" style="margin-top:14px">
      <div class="card card--pad">
        <div class="tiny">ВСЕГО С НАЧАЛА</div>
        <div class="row" style="gap:18px;margin-top:8px;flex-wrap:wrap">
          <div><div class="num" style="font-size:20px;font-weight:750">${total.workouts}</div><div class="tiny">тренировок</div></div>
          <div><div class="num" style="font-size:20px;font-weight:750">${fmtVolume(total.volume)}</div><div class="tiny">объём</div></div>
          <div><div class="num" style="font-size:20px;font-weight:750">${fmt(total.hours, 1)}</div><div class="tiny">часов</div></div>
          <div><div class="num" style="font-size:20px;font-weight:750">${total.sets}</div><div class="tiny">подходов</div></div>
        </div>
        ${total.firstDate ? `<div class="tiny" style="margin-top:10px">Первая тренировка: ${fmtDate(total.firstDate)}</div>` : ''}
      </div>
    </div>`;

  return {
    html:
      topbar({
        title: 'Прогресс',
        sub: 'Аналитика без подписки',
        actions: `<button class="btn btn--icon btn--soft" data-action="open-measure" aria-label="Добавить замер">${icon('ruler', 19)}</button>
                  <button class="btn btn--icon btn--soft" data-action="open-photo" aria-label="Добавить фото">${icon('camera', 19)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {
      for (const b of document.querySelectorAll('[data-period]')) {
        b.addEventListener('click', () => {
          period = b.dataset.period;
          haptic();
          refresh();
        });
      }
    },
  };
}

function periodLabel(p) {
  return { week: '7 дней', month: '30 дней', quarter: '90 дней', all: 'всё время' }[p] || '';
}

/* ---------- графики ---------- */
export function barChart(data, { fmt: fmtFn = (v) => v, accent = 'var(--accent)', height = 104 } = {}) {
  if (!data.length) return '<div class="muted">Нет данных</div>';
  const max = Math.max(1, ...data.map((d) => d.value));
  return `<div class="bars" style="height:${height}px">
    ${data
      .map(
        (d) => `<div class="bars__col">
          <div class="bars__val num">${d.value ? fmtFn(d.value) : ''}</div>
          <div class="bars__track">
            <div class="bars__bar" style="height:${Math.max(2, (d.value / max) * 100)}%;background:${d.value ? accent : 'var(--surface-3)'}"></div>
          </div>
          <div class="bars__label">${d.label}</div>
        </div>`
      )
      .join('')}
  </div>`;
}

export function lineChart(points, { unit = '', color = 'var(--accent)', height = 110 } = {}) {
  if (points.length < 2) return '<div class="muted">Мало данных для графика</div>';
  const W = 300;
  const H = height;
  const padX = 6;
  const padY = 14;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const x = (i) => padX + (i / (points.length - 1)) * (W - padX * 2);
  const y = (v) => H - padY - ((v - min) / span) * (H - padY * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - 2} L${padX},${H - 2} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const diff = last.value - first.value;
  return `<div class="linechart">
    <div class="row" style="margin-bottom:4px">
      <span class="num" style="font-weight:720;font-size:17px">${fmt(last.value, 1)} ${unit}</span>
      <span class="spacer"></span>
      <span class="badge ${diff > 0 ? 'badge--accent' : diff < 0 ? 'badge--warn' : ''}">${diff > 0 ? '+' : ''}${fmt(diff, 1)} ${unit}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="linechart__svg" style="width:100%;height:${H}px">
      <defs><linearGradient id="lg-${unit}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".28"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#lg-${unit})"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${points
        .map(
          (p, i) =>
            i === points.length - 1 || i === 0
              ? `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.2" fill="${color}"/>`
              : ''
        )
        .join('')}
    </svg>
    <div class="row" style="margin-top:2px">
      <span class="tiny">${fmtDateShort(first.date)}</span>
      <span class="spacer"></span>
      <span class="tiny">${fmtDateShort(last.date)}</span>
    </div>
  </div>`;
}

function groupBars(gv) {
  const max = Math.max(1, ...Object.values(gv).map((x) => x.sets));
  const entries = GROUP_ORDER.map((g) => ({ g, ...gv[g] })).filter((x) => x.sets > 0);
  if (!entries.length) return '<div class="muted">Пока нет данных за период</div>';
  return entries
    .sort((a, b) => b.sets - a.sets)
    .map(
      (x) => `<div class="gbar">
        <span class="gbar__dot" style="background:${GROUPS[x.g].color}"></span>
        <span class="gbar__label">${GROUPS[x.g].label}</span>
        <span class="gbar__track"><span class="gbar__fill" style="width:${(x.sets / max) * 100}%;background:${GROUPS[x.g].color}"></span></span>
        <span class="gbar__val num">${x.sets}</span>
      </div>`
    )
    .join('');
}

function photoGallery() {
  const photos = (state.photos || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!photos.length) {
    return `<div class="card card--pad" style="text-align:center;padding:22px">
      <div class="empty__icon" style="margin:0 auto 8px">${icon('camera', 24)}</div>
      <div class="h3">Фото прогресса</div>
      <div class="muted" style="margin-top:4px">Сравнивайте себя по месяцам. Фото хранятся только на этом устройстве.</div>
      <button class="btn btn--primary btn--sm" style="margin-top:12px" data-action="open-photo">${icon('camera', 15)} Добавить фото</button>
    </div>`;
  }
  return `<div class="photo-grid">
    ${photos
      .slice(0, 6)
      .map(
        (p, i) => `<button class="photo-card" data-action="view-photo" data-id="${p.id}">
          <img src="${p.data}" alt="Фото прогресса ${fmtDate(p.date)}" loading="lazy">
          <span class="photo-card__date">${fmtDate(p.date)}</span>
          <span class="photo-card__tag">${PHOTO_TYPES[p.type] || 'Фото'}</span>
        </button>`
      )
      .join('')}
  </div>
  ${photos.length > 6 ? `<button class="btn btn--ghost btn--sm btn--block" style="margin-top:8px" data-action="all-photos">Все фото (${photos.length})</button>` : ''}`;
}

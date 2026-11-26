/* ============================================================
   Экран активной тренировки + таймер отдыха
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { fmtDuration, fmtVolume, num, fmtDateFull, plural, haptic, fmtWeight, fmtDate } from '../utils.js';
import {
  exerciseById, exerciseGroup, lastPerformance, workoutVolume, suggestionFor, exerciseName,
} from '../analytics.js';
import { GROUPS } from '../exercises.js';
import { restTimer, settings, applySettings } from '../timer.js';
import {
  activeSession, completeSet, uncompleteSet, addSet, removeSet, updateSet, addExercise,
  removeItem, moveItem, finishSession, discardSession, sessionStats, syncTimerSettings,
} from '../session.js';
import { topbar, sheet, confirmDialog, toast, refresh, closeSheets } from '../ui.js';
import { openExercisePicker } from './picker.js';
import { showWorkoutSummary } from './summary.js';

let clockTimer = null;
let restUnsub = null;
let restSheetOpen = false;

export default function renderSession() {
  const s = activeSession();
  if (!s) return { html: '', mount() {} };
  syncTimerSettings();
  const w = s.workout;
  const done = w.items.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0);
  const total = w.items.reduce((a, it) => a + it.sets.length, 0);
  const vol = workoutVolume(w);

  const body = `
    <div class="session-meta pad">
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <span class="badge badge--accent" data-elapsed="${w.startedAt}">${fmtDuration((Date.now() - w.startedAt) / 1000)}</span>
        <button class="badge" data-action="session-date" style="border:0;color:inherit">${icon('calendar', 12)} ${fmtDate(w.date)}</button>
        <span class="badge">${done} / ${total} подходов</span>
        <span class="badge">${fmtVolume(vol)}</span>
      </div>
    </div>
    <div class="pad">
      ${
        w.items.length
          ? w.items.map((it, i) => itemCard(it, i, w.items.length)).join('')
          : `<div class="card card--pad" style="text-align:center;padding:28px 20px">
              <div class="empty__icon" style="margin:0 auto 10px">${icon('plusCircle', 26)}</div>
              <div class="h3">Пока пусто</div>
              <div class="muted" style="margin-top:4px">Добавьте первое упражнение, чтобы начать записывать подходы.</div>
            </div>`
      }
    </div>
    <div class="pad" style="margin-top:12px">
      <button class="btn btn--outline btn--block" data-action="add-exercise">${icon('plus', 18)} Добавить упражнение</button>
      <button class="btn btn--ghost btn--block" style="margin-top:8px" data-action="session-notes">${icon('note', 17)} Заметка к тренировке${w.notes ? ' · есть' : ''}</button>
    </div>
  `;

  return {
    html:
      topbar({
        title: w.name,
        sub: 'Активная тренировка',
        back: 'leave-session',
        cls: 'top--session',
        actions: `<button class="btn btn--primary btn--sm" data-action="finish-session">${icon('check', 16)} Завершить</button>`,
      }) + `<div class="view session-view">${body}</div>`,
    mount() {
      startClock();
      mountRestPill();
      bindSetInputs();
    },
  };
}

/* ---------- карточка упражнения ---------- */
function itemCard(it, idx, count) {
  const ex = exerciseById(it.exerciseId);
  const g = GROUPS[ex?.group] || GROUPS.chest;
  const last = lastPerformance(it.exerciseId);
  const doneCount = it.sets.filter((x) => x.done).length;
  const done = doneCount === it.sets.length;
  const collapsed = !!it.collapsed;
  const target = it.targetReps || '8-12';
  const timeBased = !!ex?.time && ex.group === 'core';
  const sportMode = ex?.group === 'sport';
  const wUnit = sportMode ? 'мин' : 'кг';
  const rUnit = sportMode ? 'мин' : timeBased ? 'сек' : 'повт';

  const lastMap = new Map();
  if (last) last.sets.forEach((st, i) => lastMap.set(i, st));

  const rows = it.sets
    .map((set, i) => {
      const prev = lastMap.get(i);
      const prevTxt = sportMode
        ? prev ? `${fmtNum(prev.duration || 60)} мин` : '—'
        : prev ? `${fmtNum(prev.weight)}×${fmtNum(prev.reps)}` : '—';
      const sugg = sportMode ? { weight: 0, reps: 60 } : suggestionFor(it.exerciseId, target, it.sets.length);
      const weightHint = sugg.weight || (prev && num(prev.weight));
      const placeholder = done ? '' : sportMode ? 'placeholder="60"' : weightHint ? `placeholder="${fmtNum(weightHint)}"` : 'placeholder="—"';
      const wValue = sportMode ? (set.duration ? fmtNum(set.duration) : '') : (set.weight ? fmtNum(set.weight) : '');
      const rValue = sportMode ? (set.distance ? fmtNum(set.distance) : '') : (set.reps ? fmtNum(set.reps) : '');
      return `<div class="setrow ${set.done ? 'is-done' : ''}" data-item="${it.id}" data-set="${set.id}">
        <div class="setrow__n">${i + 1}</div>
        <div class="setrow__prev" data-prev="${set.id}" title="Прошлый раз">${prevTxt}</div>
        <div class="setrow__field">
          <input class="setin" type="number" inputmode="decimal" step="${sportMode ? 1 : 0.5}" min="0"
            data-field-${sportMode ? 'duration' : 'weight'} data-item="${it.id}" data-set="${set.id}"
            value="${wValue}" ${placeholder}
            aria-label="${sportMode ? 'Минуты' : 'Вес'}" ${set.done ? 'readonly' : ''}>
        </div>
        <div class="setrow__field">
          <input class="setin" type="number" inputmode="numeric" step="${sportMode ? 0.1 : 1}" min="0"
            data-field-${sportMode ? 'distance' : 'reps'} data-item="${it.id}" data-set="${set.id}"
            value="${rValue}"
            aria-label="${sportMode ? 'Дистанция, км' : timeBased ? 'Секунды' : 'Повторения'}" ${set.done ? 'readonly' : ''}>
        </div>
        <button class="setrow__check ${set.done ? 'is-on' : ''}" data-action="toggle-set"
          data-item="${it.id}" data-set="${set.id}" aria-label="${set.done ? 'Отменить подход' : 'Выполнить подход'}">
          ${icon('check', 18)}
        </button>
      </div>`;
    })
    .join('');

  const volume = it.sets.reduce((a, st) => a + (st.done ? num(st.weight) * num(st.reps) : 0), 0);

  return `<div class="ex-card ${done ? 'is-complete' : ''} ${collapsed ? 'is-collapsed' : ''}" data-item-card="${it.id}">
    <div class="ex-head" data-action="toggle-collapse" data-item="${it.id}">
      <div class="ex-idx" style="background:${g.color}22;color:${g.color}">${done ? icon('check', 16) : idx + 1}</div>
      <div class="grow">
        <div class="ex-name">${escape(ex?.name || 'Упражнение')}</div>
        <div class="ex-sub">${g.label} · цель ${it.sets.length}×${target}${ex?.time && ex.group === 'core' ? ' сек' : ''}</div>
      </div>
      <div class="ex-head__right">
        ${done ? (volume > 0 ? `<span class="badge badge--accent">${fmtVolume(volume)}</span>` : `<span class="badge badge--accent">${icon('check', 12)}</span>`) : `<span class="badge">${doneCount}/${it.sets.length}</span>`}
        <span class="ex-caret">${icon(collapsed ? 'chevronRight' : 'chevronDown', 18)}</span>
      </div>
    </div>
    ${
      collapsed
        ? ''
        : `<div class="ex-body">
      ${
        last
          ? `<div class="ex-prev">${icon('history', 13)} <span>Прошлый раз ${fmtDate(last.date)}: ${sportMode
              ? last.sets.map((x) => `${fmtNum(x.duration || 60)} мин`).join(', ')
              : last.sets.map((x) => `${fmtNum(x.weight)}×${fmtNum(x.reps)}`).join(', ')}</span></div>`
          : `<div class="ex-prev">${icon('info', 13)} <span>Новое упражнение — запишите свой первый подход</span></div>`
      }
      <div class="setrow setrow--head">
        <div class="setrow__n">#</div>
        <div class="setrow__prev">Прошлый</div>
        <div class="setrow__field">${wUnit}</div>
        <div class="setrow__field">${rUnit}</div>
        <div style="width:38px"></div>
      </div>
      ${rows}
      <div class="ex-actions">
        ${sportMode ? '' : `<button class="chip" data-action="add-set" data-item="${it.id}">${icon('plus', 14)} Подход</button>`}
        <button class="chip" data-action="fill-last" data-item="${it.id}">${icon('copy', 14)} Из прошлой</button>
        <button class="chip" data-action="swap-exercise" data-item="${it.id}">${icon('switch', 14)} Заменить</button>
        <button class="chip" data-action="item-menu" data-item="${it.id}">${icon('dots', 14)}</button>
      </div>
    </div>`
    }
  </div>`;
}

/* ---------- ввод значений подхода ---------- */
function bindSetInputs() {
  const handler = (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains('setin')) return;
    const itemId = el.dataset.item;
    const setId = el.dataset.set;
    if (!itemId || !setId) return;
    const patch = {};
    if ('fieldWeight' in el.dataset) patch.weight = num(el.value);
    else if ('fieldReps' in el.dataset) patch.reps = num(el.value);
    else if ('fieldDuration' in el.dataset) patch.duration = num(el.value);
    else if ('fieldDistance' in el.dataset) patch.distance = num(el.value);
    if (Object.keys(patch).length) {
      try {
        updateSet(itemId, setId, patch);
      } catch (err) {
        console.error('set input', err);
      }
    }
  };
  document.addEventListener('input', handler, { passive: true });
  document.addEventListener('change', handler, { passive: true });
}

function fmtNum(v) {
  const n = num(v);
  if (!n && n !== 0) return '';
  return Number.isInteger(n) ? String(n) : String(n);
}

function escape(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- часы ---------- */
function startClock() {
  stopClock();
  clockTimer = setInterval(() => {
    const s = activeSession();
    if (!s) return stopClock();
    for (const el of document.querySelectorAll('[data-elapsed]')) {
      const t = Number(el.dataset.elapsed);
      el.textContent = fmtDuration((Date.now() - t) / 1000);
    }
  }, 1000);
}
function stopClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

/* ---------- плавающая плашка таймера ---------- */
export function renderRestPill() {
  const host = document.getElementById('app');
  if (!host) return;
  const t = restTimer;
  const visible = t.running || (t.remaining > 0 && !t.running);
  let pill = host.querySelector('.rest-pill');
  if (!visible) {
    pill?.remove();
    return;
  }
  if (!pill) {
    pill = document.createElement('button');
    pill.className = 'rest-pill';
    pill.dataset.action = 'open-rest';
    pill.innerHTML = `<span class="rest-pill__dot"></span><span class="rest-pill__time num"></span><span class="rest-pill__x" data-action="skip-rest">${icon('x', 14)}</span>`;
    host.append(pill);
  }
  pill.querySelector('.rest-pill__time').textContent = t.display;
  pill.classList.toggle('is-paused', !t.running);
  pill.classList.toggle('is-warn', t.remaining <= 10 && t.running);
}

/* ---------- пилюля таймера ---------- */
function mountRestPill() {
  restUnsub?.();
  restUnsub = restTimer.on((type, t) => {
    renderRestPill();
    if (restSheetOpen) updateRestSheet(t);
    if (type === 'finish') {
      document.documentElement.classList.add('timer-alert');
      setTimeout(() => document.documentElement.classList.remove('timer-alert'), 3000);
      haptic('heavy');
    }
    if (type === 'finish' || type === 'stop') {
      restSheetClose();
      document.documentElement.classList.remove('timer-alert');
      renderRestPill();
    }
  });
  renderRestPill();
}

/* ---------- шторка таймера ---------- */
let restSheet = null;

export function openRestSheet(seconds = null) {
  const t = restTimer;
  if (seconds && !t.running) t.start(seconds);
  if (!t.running && t.remaining <= 0) t.start(settings.restSec || 90);
  restSheetOpen = true;
  restSheet = sheet({
    id: 'rest-sheet',
    body: `<div class="rest-close-row"><button class="rest-collapse" data-close>${icon('chevronDown', 20)} Свернуть таймер</button></div>
      <div class="rest__body">${restSheetBody(t)}</div>`,
    onClose: () => {
      restSheetOpen = false;
      restSheet = null;
    },
  });
  updateRestSheet(t);
  renderRestPill();
  return restSheet;
}
function restSheetClose() {
  if (restSheet) {
    const r = restSheet;
    restSheet = null;
    restSheetOpen = false;
    r.close('timer');
  }
}

function restSheetBody(t) {
  const total = Math.max(1, t.total || settings.restSec || 90);
  const pct = Math.max(0, Math.min(1, t.remaining / total));
  const R = 62;
  const C = 2 * Math.PI * R;
  return `<div class="rest">
    <div class="rest__ring">
      <div class="ring" style="width:180px;height:180px">
        <svg class="ring__svg" width="180" height="180" viewBox="0 0 180 180">
          <circle class="ring__track" cx="90" cy="90" r="${R}" fill="none" stroke-width="9"/>
          <circle class="ring__bar" id="rest-ring" cx="90" cy="90" r="${R}" fill="none" stroke-width="9"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
        </svg>
        <div class="ring__content">
          <div>
            <div class="ring__time" id="rest-time" style="font-size:42px">${t.display}</div>
            <div class="ring__label" id="rest-label">${t.running ? 'отдых' : t.remaining > 0 ? 'пауза' : 'готово'}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="rest__title">${t.running ? 'Отдыхайте' : t.remaining > 0 ? 'Пауза' : 'Время работать!'}</div>
    <div class="rest__sub" id="rest-sub">${t.label ? escape(t.label) : 'Отдых между подходами'}</div>
    <div class="rest__presets">
      ${[45, 60, 90, 120, 180].map((p) => `<button class="chip ${p === total ? 'is-on' : ''}" data-action="rest-set" data-sec="${p}">${p >= 60 ? (p % 60 === 0 ? p / 60 + ' мин' : Math.floor(p / 60) + ':30') : p + 'с'}</button>`).join('')}
    </div>
    <div class="rest__controls">
      <button class="rest__btn" data-action="rest-minus">${icon('minus', 20)}<span>15</span></button>
      <button class="rest__btn rest__btn--big" data-action="rest-toggle">${icon(t.running ? 'pause' : 'play', 30)}</button>
      <button class="rest__btn" data-action="rest-plus">${icon('plus', 20)}<span>15</span></button>
    </div>
    <button class="btn btn--soft btn--block" style="margin-top:16px" data-action="skip-rest">Пропустить отдых</button>
  </div>`;
}

function updateRestSheet(t) {
  const timeEl = document.getElementById('rest-time');
  if (!timeEl) return;
  timeEl.textContent = t.display;
  const total = Math.max(1, t.total || 90);
  const pct = Math.max(0, Math.min(1, t.remaining / total));
  const R = 62;
  const C = 2 * Math.PI * R;
  const ring = document.getElementById('rest-ring');
  if (ring) {
    ring.style.strokeDashoffset = String(C * (1 - pct));
    ring.style.stroke = t.remaining <= 10 ? 'var(--warn)' : 'var(--accent)';
  }
  const lbl = document.getElementById('rest-label');
  if (lbl) lbl.textContent = t.running ? 'отдых' : t.remaining > 0 ? 'пауза' : 'готово';
  const title = document.querySelector('.rest__title');
  if (title) title.textContent = t.running ? 'Отдыхайте' : t.remaining > 0 ? 'Пауза' : 'Время работать!';
  const toggle = document.querySelector('[data-action="rest-toggle"]');
  if (toggle) toggle.innerHTML = icon(t.running ? 'pause' : 'play', 30);
}

export function openRestSheetDirect() {
  openRestSheet(null);
}

/* ---------- завершение ---------- */
export async function requestFinish() {
  const s = activeSession();
  if (!s) return;
  const st = sessionStats(s.workout);
  if (!st.sets) {
    const ok = await confirmDialog({
      title: 'Ни одного подхода',
      text: 'Вы ещё не отметили ни одного подхода. Выйти без сохранения?',
      ok: 'Выйти',
      cancel: 'Продолжить',
    });
    if (ok) {
      discardSession();
      closeSheets();
      refresh();
    }
    return;
  }
  const w = finishSession();
  closeSheets();
  if (w) {
    toast('Тренировка сохранена 💪');
    try {
      showWorkoutSummary(w);
    } catch (e) {
      console.error(e);
    }
  }
  refresh();
}

/* ---------- меню упражнения ---------- */
export async function itemMenu(itemId) {
  const s = activeSession();
  const it = s?.workout.items.find((x) => x.id === itemId);
  if (!it) return;
  const ex = exerciseById(it.exerciseId);
  const sh = sheet({
    title: escape(ex?.name || 'Упражнение'),
    body: `<div class="list" style="margin-bottom:4px">
      <button class="list__row" data-action="item-move" data-item="${itemId}" data-dir="-1"><span class="list__icon">${icon('chevronUp', 18)}</span><span class="list__label">Выше</span></button>
      <button class="list__row" data-action="item-move" data-item="${itemId}" data-dir="1"><span class="list__icon">${icon('chevronDown', 18)}</span><span class="list__label">Ниже</span></button>
      <button class="list__row" data-action="swap-exercise" data-item="${itemId}"><span class="list__icon list__icon--accent">${icon('switch', 18)}</span><span class="list__label">Заменить упражнение</span></button>
      <button class="list__row" data-action="open-exercise" data-id="${it.exerciseId}"><span class="list__icon">${icon('book', 18)}</span><span class="list__label">Техника выполнения</span></button>
      <button class="list__row list__row--danger" data-action="item-remove" data-item="${itemId}"><span class="list__icon list__icon--danger">${icon('trash', 18)}</span><span class="list__label">Удалить упражнение</span></button>
    </div>`,
  });
  return sh;
}

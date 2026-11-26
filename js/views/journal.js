/* ============================================================
   Журнал: календарь, история тренировок, детали
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import {
  escapeHtml, uid, plural, fmtVolume, fmtMinutes, fmtDate, fmtDateFull, fmtDuration, fmtDateShort,
  isoDate, parseDate, addDays, startOfWeek, monthLabel, weekdayShort, num, relDay, e1rm, haptic,
} from '../utils.js';
import {
  finishedWorkouts, workoutVolume, workoutSets, workoutReps, workoutDuration, workoutGroups,
  exerciseById, exerciseName, exerciseGroup,
} from '../analytics.js';
import { GROUPS, GROUP_ORDER } from '../exercises.js';
import { topbar, emptyState, refresh, go, sheet, toast, confirmDialog, promptDialog, closeSheets } from '../ui.js';
import { repeatWorkout, startSession } from '../session.js';

let monthCursor = new Date();
let expandedCal = false;

export default function renderJournal() {
  const all = finishedWorkouts();
  const byMonth = new Map();
  for (const w of all) {
    const ym = (w.date || isoDate(w.startedAt)).slice(0, 7);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym).push(w);
  }

  const body = `
    <div class="pad" style="margin-top:4px">
      ${calendar(all)}
    </div>
    <div class="section-title"><h2>История</h2><span class="muted">${all.length} ${plural(all.length, 'тренировка', 'тренировки', 'тренировок')}</span></div>
    <div class="pad">
      ${
        all.length
          ? [...byMonth.entries()]
              .map(
                ([ym, ws]) => `<div class="month-block">
            <div class="month-title">${monthLabel(ym)} <span class="muted">· ${ws.length}</span></div>
            <div class="card list">
              ${ws.map(journalRow).join('')}
            </div>
          </div>`
              )
              .join('')
          : emptyState({
              iconName: 'calendar',
              title: 'Журнал пуст',
              text: 'Завершённые тренировки появятся здесь: объём, время, группы мышц и лучшие подходы.',
              action: `<button class="btn btn--primary btn--sm" data-action="start-blank">${icon('play', 15)} Начать тренировку</button>
                <button class="btn btn--soft btn--sm" data-action="import-history" style="margin-top:2px">${icon('upload', 15)} Импортировать историю</button>`,
            })
      }
    </div>`;

  return {
    html:
      topbar({
        title: 'Журнал',
        sub: `${all.length} ${plural(all.length, 'запись', 'записи', 'записей')}`,
        actions: `<button class="btn btn--icon btn--soft" data-action="start-blank" aria-label="Новая тренировка">${icon('plus', 20)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {
      for (const b of document.querySelectorAll('[data-cal-nav]')) {
        b.addEventListener('click', () => {
          const dir = Number(b.dataset.calNav);
          monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + dir, 1);
          haptic();
          refresh();
        });
      }
      document.querySelector('[data-cal-toggle]')?.addEventListener('click', () => {
        expandedCal = !expandedCal;
        refresh();
      });
      for (const b of document.querySelectorAll('[data-cal-day]')) {
        b.addEventListener('click', () => {
          const d = b.dataset.calDay;
          const ws = finishedWorkouts().filter((w) => (w.date || isoDate(w.startedAt)) === d);
          if (!ws.length) return;
          if (ws.length === 1) go('workout', { id: ws[0].id });
          else openDaySheet(d, ws);
        });
      }
    },
  };
}

function calendar(all) {
  const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));

  const trainedDays = new Map();
  for (const w of all) {
    const d = w.date || isoDate(w.startedAt);
    const cur = trainedDays.get(d) || { count: 0, vol: 0 };
    cur.count++;
    cur.vol += workoutVolume(w);
    trainedDays.set(d, cur);
  }

  const todayIso = isoDate(new Date());
  const weeks = Math.ceil(days.length / 7);
  const maxVol = Math.max(1, ...[...trainedDays.values()].map((v) => v.vol));
  const rows = [];
  const limitWeeks = expandedCal ? weeks : 5;
  const shownDays = days.slice(0, limitWeeks * 7);

  return `<div class="card cal">
    <div class="cal__head">
      <button class="cal__nav" data-cal-nav="-1">${icon('chevronLeft', 18)}</button>
      <div class="cal__month">${monthLabel(isoDate(first).slice(0, 7))}</div>
      <button class="cal__nav" data-cal-nav="1">${icon('chevronRight', 18)}</button>
    </div>
    <div class="cal__weekdays">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="cal__grid">
      ${shownDays
        .map((d) => {
          if (!d) return '<span class="cal__cell cal__cell--empty"></span>';
          const iso = isoDate(d);
          const tr = trainedDays.get(iso);
          const isToday = iso === todayIso;
          const future = iso > todayIso;
          const level = tr ? Math.max(0.25, Math.min(1, tr.vol / maxVol)) : 0;
          return `<button class="cal__cell ${isToday ? 'is-today' : ''} ${tr ? 'has-workout' : ''} ${future ? 'is-future' : ''}"
            data-cal-day="${iso}" ${tr ? '' : 'disabled'}
            style="${tr ? `--lvl:${level.toFixed(2)}` : ''}">
            ${d.getDate()}
          </button>`;
        })
        .join('')}
    </div>
    ${
      weeks > 5
        ? `<button class="cal__more" data-cal-toggle>${expandedCal ? 'Свернуть' : 'Показать все дни'} ${icon(expandedCal ? 'chevronUp' : 'chevronDown', 15)}</button>`
        : ''
    }
  </div>`;
}

function journalRow(w) {
  const groups = workoutGroups(w);
  const main = groups[0];
  const g = GROUPS[main?.group] || GROUPS.chest;
  return `<button class="list__row" data-action="open-workout" data-id="${w.id}">
    <span class="list__icon" style="background:${g.color}1a;color:${g.color}">${icon('dumbbell', 17)}</span>
    <span class="grow" style="min-width:0">
      <span class="list__label ellipsis" style="display:block">${escapeHtml(w.name)}</span>
      <span class="list__sub ellipsis" style="display:block">${weekdayShort(w.date)}, ${fmtDate(w.date)} · ${workoutSets(w)} подх. · ${fmtVolume(workoutVolume(w))}</span>
    </span>
    ${icon('chevronRight', 18, 'list__chev')}
  </button>`;
}

function openDaySheet(iso, ws) {
  sheet({
    title: fmtDate(parseDate(iso)),
    sub: `${ws.length} тренировки`,
    body: `<div class="card list">${ws
      .map((w) => `<button class="list__row" data-action="open-workout" data-id="${w.id}"><span class="list__icon">${icon('dumbbell', 17)}</span><span class="grow"><span class="list__label" style="display:block">${escapeHtml(w.name)}</span><span class="list__sub">${fmtVolume(workoutVolume(w))} · ${workoutSets(w)} подходов</span></span>${icon('chevronRight', 18, 'list__chev')}</button>`)
      .join('')}</div>`,
  });
}

/* ============================================================
   Детали тренировки
   ============================================================ */
export function renderWorkoutDetail(params) {
  const w = (state.workouts || []).find((x) => x.id === params.id);
  if (!w) {
    return {
      html: topbar({ title: 'Тренировка', back: 'go-back' }) + `<div class="view">${emptyState({ title: 'Не найдено', text: 'Тренировка удалена.' })}</div>`,
      mount() {},
    };
  }
  const groups = workoutGroups(w);
  const vol = workoutVolume(w);
  const sets = workoutSets(w);
  const dur = workoutDuration(w);
  const maxGroup = Math.max(1, ...groups.map((g) => g.sets));

  const body = `
    <div class="pad">
      <div class="card card--pad">
        <div class="row">
          <div class="grow">
            <div class="tiny">${fmtDateFull(w.date)}</div>
            <div class="h2" style="margin-top:2px">${escapeHtml(w.name)}</div>
          </div>
          ${w.programId ? `<span class="badge badge--accent">${icon('layers', 12)} программа</span>` : ''}
        </div>
        <div class="metrics" style="margin-top:14px">
          <div class="metric"><div class="metric__v">${fmtVolume(vol)}</div><div class="metric__l">Объём</div></div>
          <div class="metric"><div class="metric__v">${fmtMinutes(dur)}</div><div class="metric__l">Время</div></div>
          <div class="metric"><div class="metric__v">${sets}</div><div class="metric__l">Подходов</div></div>
        </div>
        <div class="metrics" style="margin-top:8px;grid-template-columns:repeat(2,1fr)">
          <div class="metric"><div class="metric__v">${w.items.length}</div><div class="metric__l">Упражнений</div></div>
          <div class="metric"><div class="metric__v">${workoutReps(w)}</div><div class="metric__l">Повторений</div></div>
        </div>
      </div>

      ${
        groups.length
          ? `<div class="section-title" style="padding-left:0"><h2>Группы мышц</h2></div>
          <div class="card card--pad">
            ${groups
              .map(
                (x) => `<div class="gbar">
                <span class="gbar__dot" style="background:${(GROUPS[x.group] || GROUPS.chest).color}"></span>
                <span class="gbar__label">${(GROUPS[x.group] || GROUPS.chest).label}</span>
                <span class="gbar__track"><span class="gbar__fill" style="width:${(x.sets / maxGroup) * 100}%;background:${(GROUPS[x.group] || GROUPS.chest).color}"></span></span>
                <span class="gbar__val num">${x.sets}</span>
              </div>`
              )
              .join('')}
          </div>`
          : ''
      }

      <div class="section-title" style="padding-left:0"><h2>Упражнения</h2></div>
      ${w.items
        .map((it) => {
          const ex = exerciseById(it.exerciseId);
          const g = GROUPS[ex?.group] || GROUPS.chest;
          const best = it.sets.reduce((b, s) => (e1rm(num(s.weight), num(s.reps)) > e1rm(num(b.weight), num(b.reps)) ? s : b), it.sets[0] || {});
          return `<div class="card wo-ex">
          <div class="row">
            <span class="pick-ic" style="background:${g.color}1f;color:${g.color}">${icon('dumbbell', 17)}</span>
            <div class="grow" style="min-width:0">
              <div class="h3 ellipsis">${escapeHtml(ex?.name || it.exerciseId)}</div>
              <div class="muted">${g.label} · ${it.sets.length} ${plural(it.sets.length, 'подход', 'подхода', 'подходов')}</div>
            </div>
          </div>
          <div class="wo-sets">
            ${it.sets
              .map(
                (s, i) => `<span class="wo-set ${s === best ? 'is-best' : ''}">
                <span class="wo-set__i">${i + 1}</span>
                <span class="num">${num(s.weight)} × ${num(s.reps)}</span>
              </span>`
              )
              .join('')}
          </div>
        </div>`;
        })
        .join('')}

      ${w.notes ? `<div class="card card--pad" style="margin-top:12px"><div class="tiny">ЗАМЕТКА</div><p style="margin-top:6px;font-size:14.5px;color:var(--text-2)">${escapeHtml(w.notes)}</p></div>` : ''}

      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn--primary" data-action="repeat-workout" data-id="${w.id}">${icon('repeat', 17)} Повторить</button>
        <button class="btn btn--soft" data-action="share-workout" data-id="${w.id}">${icon('share', 17)} Поделиться</button>
      </div>
      <button class="btn btn--ghost btn--block" style="margin-top:8px" data-action="delete-workout" data-id="${w.id}">${icon('trash', 16)} Удалить запись</button>
    </div>`;

  return {
    html:
      topbar({
        title: 'Тренировка',
        back: 'go-back',
        actions: `<button class="btn btn--icon btn--soft" data-action="workout-menu" data-id="${w.id}" aria-label="Меню">${icon('dots', 20)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {},
  };
}

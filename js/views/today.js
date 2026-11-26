/* ============================================================
   Экран «Сегодня»
   ============================================================ */
import { state } from '../store.js';
import { icon } from '../icons.js';
import { fmtVolume, fmtMinutes, greeting, plural, fmtDateFull, fmtDuration, relDay } from '../utils.js';
import {
  weekSummary, currentStreak, finishedWorkouts, lastWorkoutForProgram, nextProgramDay,
  workoutDuration, workoutVolume, exerciseName,
} from '../analytics.js';
import { activeSession } from '../session.js';
import { topbar, emptyState } from '../ui.js';

function activeProgram() {
  if (!state.activeProgramId) return null;
  return (state.programs || []).find((p) => p.id === state.activeProgramId) || null;
}

function goalRing(done, goal, size = 92) {
  const pct = Math.min(1, goal ? done / goal : 0);
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg class="ring__svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="7"/>
      <circle class="ring__bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="7"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
    </svg>
    <div class="ring__content">
      <div>
        <div class="ring__time" style="font-size:25px">${done}<span style="font-size:13px;color:var(--text-3);font-weight:600">/${goal}</span></div>
        <div class="ring__label" style="font-size:9.5px;letter-spacing:.03em">нед.</div>
      </div>
    </div>
  </div>`;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function renderToday() {
  const s = state.settings;
  const name = (s.name || '').trim();
  const week = weekSummary();
  const goal = Math.max(1, s.weeklyGoal || 4);
  const streak = currentStreak();
  const session = activeSession();
  const program = activeProgram();
  const nextDay = program ? nextProgramDay(program) : null;
  const recent = finishedWorkouts().slice(0, 3);

  let body = '';

  if (session) {
    const w = session.workout;
    const done = w.items.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0);
    const total = w.items.reduce((a, it) => a + it.sets.length, 0);
    body += `<div class="pad" style="margin-top:6px">
      <button class="card card--hero press" data-action="open-session" style="width:100%;text-align:left;padding:16px;display:block">
        <div class="row" style="margin-bottom:10px">
          <span class="dot dot--live"></span>
          <span class="tiny" style="color:var(--accent);font-weight:700;letter-spacing:.06em">ТРЕНИРОВКА ИДЁТ</span>
          <span class="spacer"></span>
          <span class="num" style="font-weight:700">${fmtDuration((Date.now() - w.startedAt) / 1000)}</span>
        </div>
        <div class="h2" style="margin-bottom:6px">${esc(w.name)}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <span class="badge">${done} / ${total} подходов</span>
          <span class="badge">${w.items.length} ${plural(w.items.length, 'упражнение', 'упражнения', 'упражнений')}</span>
        </div>
        <div class="btn btn--primary btn--block" style="margin-top:14px">${icon('play', 17)} Продолжить тренировку</div>
      </button>
    </div>`;
  }

  body += `<section class="pad" style="padding-top:8px">
    <div class="row" style="align-items:flex-start">
      <div class="grow">
        <div class="home-greet">${greeting()}${name ? ', ' + esc(name.split(' ')[0]) : ''}</div>
        <div class="home-date">${fmtDateFull(new Date())}</div>
      </div>
      ${streak > 1 ? `<div class="streak-pill">${icon('flame', 15)}<span class="num">${streak}</span></div>` : ''}
    </div>
  </section>

  <section class="pad" style="margin-top:14px">
    <div class="card week-card">
      <div class="row" style="gap:16px">
        ${goalRing(week.count, goal)}
        <div class="grow" style="min-width:0">
          <div class="tiny">ЦЕЛЬ НЕДЕЛИ</div>
          <div class="h3" style="margin-top:2px">${week.count >= goal ? 'Цель выполнена 🎉' : `Осталось ${goal - week.count} ${plural(goal - week.count, 'тренировка', 'тренировки', 'тренировок')}`}</div>
          <div class="row" style="gap:14px;margin-top:8px">
            <div><div class="num" style="font-weight:720;font-size:15px">${fmtVolume(week.volume)}</div><div class="tiny" style="font-size:10.5px">объём</div></div>
            <div><div class="num" style="font-weight:720;font-size:15px">${fmtMinutes(week.seconds)}</div><div class="tiny" style="font-size:10.5px">время</div></div>
            <div><div class="num" style="font-weight:720;font-size:15px">${week.sets}</div><div class="tiny" style="font-size:10.5px">подходов</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  if (!session) {
    body += `<section class="pad" style="margin-top:12px">`;
    if (program && nextDay) {
      const dayItems = nextDay.items.slice(0, 4).map((it) => exerciseName(it.exerciseId)).join(' · ');
      body += `<div class="card card--pad next-card">
        <div class="row" style="margin-bottom:10px">
          <span class="badge badge--accent">${icon('layers', 12)} ${esc(program.name)}</span>
          <span class="spacer"></span>
          <button class="chip" data-action="change-program">Сменить</button>
        </div>
        <div class="tiny">СЛЕДУЮЩАЯ ТРЕНИРОВКА</div>
        <div class="h2" style="margin-top:3px">${esc(nextDay.name)}</div>
        ${nextDay.focus ? `<div class="sub" style="margin-top:2px">${esc(nextDay.focus)}</div>` : ''}
        <div class="tiny" style="margin-top:8px;line-height:1.55">${esc(dayItems)}${nextDay.items.length > 4 ? '…' : ''}</div>
        <div class="btn btn--primary btn--block btn--lg" style="margin-top:14px" data-action="start-program-day" data-index="${program.days.indexOf(nextDay)}">${icon('play', 18)} Начать тренировку</div>
        <div class="row" style="margin-top:8px;gap:8px">
          <button class="btn btn--soft btn--sm grow" data-action="open-program" data-id="${program.id}">Программа</button>
          <button class="btn btn--soft btn--sm grow" data-action="start-blank">Свободная</button>
        </div>
      </div>`;
    } else {
      body += `<div class="card card--hero card--pad">
        <div class="h2">Готовы начать?</div>
        <div class="sub" style="margin-top:4px">Выберите программу или начните свободную тренировку — упражнения добавите по ходу.</div>
        <div class="btn btn--primary btn--block btn--lg" style="margin-top:14px" data-action="start-blank">${icon('plus', 18)} Начать тренировку</div>
        <button class="btn btn--accent-soft btn--block" style="margin-top:8px" data-action="go" data-view="programs">${icon('layers', 17)} Выбрать программу</button>
      </div>`;
    }
    body += `</section>`;
  }

  body += `<section class="pad" style="margin-top:16px">
    <div class="quick-grid">
      <button class="quick" data-action="go" data-view="exercises">
        <span class="quick__ic" style="background:rgba(91,157,255,.14);color:#5b9dff">${icon('book', 20)}</span><span>Упражнения</span>
      </button>
      <button class="quick" data-action="go" data-view="progress">
        <span class="quick__ic" style="background:rgba(198,242,74,.13);color:var(--accent)">${icon('chart', 20)}</span><span>Аналитика</span>
      </button>
      <button class="quick" data-action="open-measure">
        <span class="quick__ic" style="background:rgba(244,114,182,.14);color:#f472b6">${icon('ruler', 20)}</span><span>Замеры</span>
      </button>
      <button class="quick" data-action="open-sport">
        <span class="quick__ic" style="background:rgba(52,211,153,.14);color:#34d399">${icon('target', 20)}</span><span>Спорт</span>
      </button>
    </div>
  </section>`;

  if (recent.length) {
    body += `<div class="section-title"><h2>Недавние тренировки</h2><button class="link" data-action="go" data-view="journal">Все</button></div>
    <section class="pad"><div class="card list">
      ${recent.map(recentRow).join('')}
    </div></section>`;
  } else if (!session) {
    body += `<section style="margin-top:14px">${emptyState({
      iconName: 'dumbbell',
      title: 'Здесь появится первая тренировка',
      text: 'Нажмите «Начать тренировку», отметьте подходы — сохраним историю, объём и рекорды.',
    })}</section>`;
  }

  return {
    html:
      topbar({
        title: 'Сегодня',
        actions: `<button class="btn btn--icon btn--soft" data-action="open-timer" aria-label="Таймер отдыха">${icon('timer', 20)}</button>
                  <button class="btn btn--icon btn--soft" data-action="go" data-view="profile" aria-label="Профиль">${icon('user', 20)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {},
  };
}

function recentRow(w) {
  return `<button class="list__row" data-action="open-workout" data-id="${w.id}">
    <span class="list__icon">${icon('dumbbell', 17)}</span>
    <span class="grow">
      <span class="list__label ellipsis" style="display:block">${esc(w.name)}</span>
      <span class="list__sub">${relDay(w.date)} · ${fmtMinutes(workoutDuration(w))} · ${fmtVolume(workoutVolume(w))}</span>
    </span>
    ${icon('chevronRight', 18, 'list__chev')}
  </button>`;
}

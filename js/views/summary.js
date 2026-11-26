/* ============================================================
   Итоги тренировки (отдельный модуль, чтобы не было циклов)
   ============================================================ */
import { icon } from '../icons.js';
import { escapeHtml, fmtVolume, fmtMinutes, fmtDateFull } from '../utils.js';
import { workoutVolume, workoutSets, workoutDuration, workoutGroups } from '../analytics.js';
import { GROUPS } from '../exercises.js';
import { sheet } from '../ui.js';

export function showWorkoutSummary(w) {
  if (!w) return null;
  const vol = workoutVolume(w);
  const dur = workoutDuration(w);
  const sets = workoutSets(w);
  const groups = workoutGroups(w);
  const dateText = fmtDateFull(w.date, true);
  return sheet({
    title: 'Тренировка сохранена',
    sub: dateText,
    body: `<div class="summary">
      <div class="summary__hero">${icon('check', 30)}</div>
      <div class="summary__title">Отличная работа!</div>
      <div class="summary__sub">${escapeHtml(w.name)}</div>
      <div class="metrics" style="margin-top:18px">
        ${vol > 0 ? `<div class="metric metric--accent"><div class="metric__v">${fmtVolume(vol)}</div><div class="metric__l">Объём</div></div>` : ''}
        <div class="metric"><div class="metric__v">${fmtMinutes(dur)}</div><div class="metric__l">Время</div></div>
        <div class="metric"><div class="metric__v">${sets}</div><div class="metric__l">Подходов</div></div>
      </div>
      ${
        groups.length
          ? `<div class="summary__groups">${groups
              .slice(0, 5)
              .map((x) => {
                const g = GROUPS[x.group] || GROUPS.chest;
                return `<span class="badge" style="background:${g.color}1c;color:${g.color}">${g.label} · ${x.sets}</span>`;
              })
              .join('')}</div>`
          : ''
      }
      <div class="hint-box" style="margin-top:16px">${icon('info', 16)}<span>Данные сохранены на этом устройстве. Сделайте экспорт в профиле, чтобы не потерять историю.</span></div>
    </div>`,
    foot: `<button class="btn btn--soft" data-action="close-summary">Закрыть</button><button class="btn btn--primary" data-action="summary-details" data-id="${w.id}">Детали</button>`,
  });
}

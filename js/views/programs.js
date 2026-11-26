/* ============================================================
   Программы: готовые планы, конструктор, детали
   ============================================================ */
import { state } from '../store.js';
import { icon } from '../icons.js';
import { escapeHtml, uid, plural, fmtDuration, haptic } from '../utils.js';
import { exerciseById, exerciseName, countInProgram, lastWorkoutForProgram, nextProgramDay } from '../analytics.js';
import { GROUPS, equipmentLabel } from '../exercises.js';
import { GOALS, LEVEL_LABEL, programMeta, programExerciseCount } from '../templates.js';
import { topbar, emptyState, sheet, promptDialog, toast, refresh, go } from '../ui.js';
import { openExercisePicker } from './picker.js';
import { startFromProgramDay } from '../session.js';

let goalFilter = 'all';

export default function renderPrograms() {
  const programs = state.programs || [];
  const list = programs.filter((p) => goalFilter === 'all' || p.goal === goalFilter);
  const activeId = state.activeProgramId;
  const active = programs.find((p) => p.id === activeId);

  const body = `
    <div class="pad" style="margin-top:6px">
      <div class="hscroll" style="padding-left:0;padding-right:0">
        <button class="chip ${goalFilter === 'all' ? 'is-on' : ''}" data-goal="all">Все</button>
        ${Object.entries(GOALS).map(([k, g]) => `<button class="chip ${goalFilter === k ? 'is-on' : ''}" data-goal="${k}">${icon(g.icon, 14)} ${g.label}</button>`).join('')}
      </div>
    </div>

    ${
      active
        ? `<div class="pad" style="margin-top:14px">
            <div class="card card--accent card--pad">
              <div class="row">
                <span class="badge badge--accent">${icon('play', 12)} АКТИВНАЯ ПРОГРАММА</span>
                <span class="spacer"></span>
                <button class="chip" data-action="deactivate-program">Завершить</button>
              </div>
              <div class="h2" style="margin-top:8px">${escapeHtml(active.name)}</div>
              <div class="sub" style="margin-top:2px">${programMeta(active)}${nextProgramDay(active) ? ' · следующая: ' + escapeHtml(nextProgramDay(active).name) : ''}</div>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn btn--primary" data-action="open-program" data-id="${active.id}">${icon('layers', 17)} Открыть</button>
                <button class="btn btn--soft" data-action="continue-program">${icon('play', 17)} Продолжить</button>
              </div>
            </div>
          </div>`
        : ''
    }

    <div class="section-title"><h2>${goalFilter === 'all' ? 'Программы' : GOALS[goalFilter].label}</h2><span class="muted">${list.length}</span></div>
    <div class="pad program-list">
      ${
        list.length
          ? list.map(programCard).join('')
          : emptyState({ iconName: 'layers', title: 'Нет программ', text: 'Попробуйте другой фильтр или создайте свою программу.' })
      }
    </div>

    <div class="pad" style="margin-top:14px">
      <button class="btn btn--outline btn--block" data-action="create-program">${icon('plus', 18)} Создать свою программу</button>
      <div class="hint-box" style="margin-top:14px">
        ${icon('sparkles', 16)}
        <span>Все программы можно менять под себя: упражнения, подходы, повторения. Без подписки.</span>
      </div>
    </div>`;

  return {
    html:
      topbar({
        title: 'Программы',
        sub: `${programs.length} ${plural(programs.length, 'программа', 'программы', 'программ')}`,
        actions: `<button class="btn btn--icon btn--soft" data-action="create-program" aria-label="Создать программу">${icon('plus', 20)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {
      for (const b of document.querySelectorAll('[data-goal]')) {
        b.addEventListener('click', () => {
          goalFilter = b.dataset.goal;
          haptic();
          refresh();
        });
      }
    },
  };
}

function programCard(p) {
  const goal = GOALS[p.goal] || GOALS.mass;
  const done = (state.workouts || []).filter((w) => w.programId === p.id).length;
  return `<div class="prog-card card press" data-action="open-program" data-id="${p.id}">
    <div class="prog-card__top" style="background:linear-gradient(140deg, ${p.color}2e, transparent 65%)">
      <span class="prog-card__ic" style="background:${p.color}26;color:${p.color}">${icon(p.icon || 'layers', 24)}</span>
      <div class="grow" style="min-width:0">
        <div class="prog-card__name">${escapeHtml(p.name)}</div>
        <div class="prog-card__meta">${programMeta(p)}</div>
      </div>
      ${icon('chevronRight', 20, 'list__chev')}
    </div>
    <div class="prog-card__body">
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <span class="badge" style="background:${p.color}1f;color:${p.color}">${goal.label}</span>
        <span class="badge">${LEVEL_LABEL[p.level] || 'Средний'}</span>
        ${p.preset ? '<span class="badge">готовая</span>' : '<span class="badge badge--info">своя</span>'}
        ${done ? `<span class="badge badge--accent">${done} ${plural(done, 'тренировка', 'тренировки', 'тренировок')}</span>` : ''}
      </div>
      ${p.tagline ? `<div class="prog-card__tagline">${escapeHtml(p.tagline)}</div>` : ''}
    </div>
  </div>`;
}

/* ============================================================
   Детали программы
   ============================================================ */
export function renderProgramDetail(params) {
  const p = (state.programs || []).find((x) => x.id === params.id);
  if (!p) {
    return {
      html: topbar({ title: 'Программа', back: 'go-back' }) + `<div class="view">${emptyState({ title: 'Программа не найдена', text: 'Возможно, она удалена.' })}</div>`,
      mount() {},
    };
  }
  const goal = GOALS[p.goal] || GOALS.mass;
  const isActive = state.activeProgramId === p.id;
  const done = (state.workouts || []).filter((w) => w.programId === p.id).length;
  const next = nextProgramDay(p);

  const body = `
    <div class="pad">
      <div class="prog-hero" style="background:radial-gradient(120% 120% at 100% 0%, ${p.color}30, transparent 62%), var(--surface)">
        <span class="prog-hero__ic" style="background:${p.color}26;color:${p.color}">${icon(p.icon || 'layers', 30)}</span>
        <div class="h1" style="font-size:25px;margin-top:10px">${escapeHtml(p.name)}</div>
        ${p.tagline ? `<div class="sub" style="margin-top:4px">${escapeHtml(p.tagline)}</div>` : ''}
        <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">
          <span class="badge" style="background:${p.color}1f;color:${p.color}">${goal.label}</span>
          <span class="badge">${LEVEL_LABEL[p.level] || 'Средний'}</span>
          <span class="badge">${p.weeks} ${plural(p.weeks, 'неделя', 'недели', 'недель')}</span>
          <span class="badge">${programExerciseCount(p)} упр.</span>
        </div>
      </div>

      ${p.description ? `<div class="card card--pad" style="margin-top:12px"><p style="font-size:14.5px;color:var(--text-2);line-height:1.55">${escapeHtml(p.description)}</p></div>` : ''}

      <div class="btn-row" style="margin-top:14px">
        ${
          isActive
            ? `<button class="btn btn--primary" data-action="continue-program">${icon('play', 17)} Следующая тренировка</button>`
            : `<button class="btn btn--primary" data-action="activate-program" data-id="${p.id}">${icon('target', 17)} Выбрать программу</button>`
        }
        <button class="btn btn--soft" data-action="edit-program" data-id="${p.id}">${icon('edit', 17)} Изменить</button>
      </div>
      ${done ? `<div class="tiny" style="text-align:center;margin-top:10px">Выполнено ${done} ${plural(done, 'тренировка', 'тренировки', 'тренировок')} по этой программе</div>` : ''}

      <div class="section-title" style="padding-left:0"><h2>Дни</h2><span class="muted">${p.days.length}</span></div>
      <div class="day-list">
        ${p.days
          .map(
            (d, i) => `<div class="card day-card">
          <div class="day-card__head">
            <div class="day-badge" style="background:${p.color}22;color:${p.color}">${i + 1}</div>
            <div class="grow">
              <div class="h3">${escapeHtml(d.name)}</div>
              <div class="muted">${d.focus ? escapeHtml(d.focus) + ' · ' : ''}${d.items.length} ${plural(d.items.length, 'упражнение', 'упражнения', 'упражнений')}</div>
            </div>
            <button class="btn btn--accent-soft btn--sm" data-action="start-day" data-id="${p.id}" data-index="${i}">${icon('play', 15)} Начать</button>
          </div>
          <div class="day-card__items">
            ${d.items
              .map((it) => {
                const ex = exerciseById(it.exerciseId);
                const g = ex ? GROUPS[ex.group] : GROUPS.chest;
                return `<div class="day-item">
                  <span class="day-item__dot" style="background:${g.color}"></span>
                  <span class="grow ellipsis">${escapeHtml(ex?.name || it.exerciseId)}</span>
                  <span class="day-item__sets num">${it.sets}×${escapeHtml(String(it.reps))}${it.time ? 'с' : ''}</span>
                </div>`;
              })
              .join('')}
          </div>
        </div>`
          )
          .join('')}
      </div>

      ${
        p.tips?.length
          ? `<div class="section-title" style="padding-left:0"><h2>Советы</h2></div>
          <div class="card card--pad"><ul class="tips">${p.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`
          : ''
      }

      ${
        !p.preset
          ? `<button class="btn btn--danger btn--block" style="margin-top:18px" data-action="delete-program" data-id="${p.id}">${icon('trash', 17)} Удалить программу</button>`
          : ''
      }
    </div>`;

  return {
    html:
      topbar({
        title: 'Программа',
        back: 'go-back',
        actions: `<button class="btn btn--icon btn--soft" data-action="share-program" data-id="${p.id}" aria-label="Поделиться">${icon('share', 19)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {},
  };
}

/* ============================================================
   Создание / редактирование программы
   ============================================================ */
export async function createProgramFlow() {
  const name = await promptDialog({ title: 'Новая программа', label: 'Название', placeholder: 'Например: Мой сплит 4 дня', ok: 'Создать' });
  if (!name) return;
  const p = {
    id: 'p-' + uid(),
    name,
    goal: 'mass',
    level: 1,
    weeks: 8,
    color: '#c6f24a',
    icon: 'layers',
    tagline: '',
    description: '',
    tips: [],
    days: [{ id: 'd0', name: 'День 1', focus: '', items: [] }],
    preset: false,
    createdAt: Date.now(),
  };
  state.programs = [...(state.programs || []), p];
  refresh();
  go('program-edit', { id: p.id });
}

export function openProgramEditor(programId) {
  go('program-edit', { id: programId });
}

export function renderProgramEdit(params) {
  const p = (state.programs || []).find((x) => x.id === params.id);
  if (!p) return { html: topbar({ title: 'Программа', back: 'go-back' }), mount() {} };
  const total = programExerciseCount(p);

  const body = `
    <div class="pad">
      <div class="field">
        <div class="field__label">Название программы</div>
        <input class="input" data-edit="name" value="${escapeHtml(p.name)}" maxlength="60">
      </div>
      <div class="field" style="margin-top:12px">
        <div class="field__label">Цель</div>
        <select class="select" data-edit="goal">
          ${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${g.label}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin-top:12px">
        <div class="field__label">Описание</div>
        <textarea class="textarea" data-edit="description" placeholder="Пара слов о программе">${escapeHtml(p.description || '')}</textarea>
      </div>

      <div class="section-title" style="padding-left:0"><h2>Дни</h2><span class="muted">${p.days.length} · ${total} упр.</span></div>
      ${p.days
        .map(
          (d, di) => `<div class="card day-card">
        <div class="day-card__head">
          <div class="day-badge">${di + 1}</div>
          <div class="grow">
            <input class="inline-input h3" data-day-name="${di}" value="${escapeHtml(d.name)}" maxlength="30">
            <input class="inline-input muted" data-day-focus="${di}" value="${escapeHtml(d.focus || '')}" placeholder="Фокус, например: Грудь + трицепс">
          </div>
          <button class="btn btn--icon btn--ghost" data-action="delete-day" data-index="${di}" aria-label="Удалить день">${icon('trash', 17)}</button>
        </div>
        <div class="day-card__items">
          ${
            d.items.length
              ? d.items
                  .map(
                    (it, ii) => `<div class="edit-item">
              <span class="grow ellipsis">${escapeHtml(exerciseName(it.exerciseId))}</span>
              <input class="mini-input" type="number" min="1" max="10" value="${it.sets}" data-sets="${di}:${ii}" aria-label="Подходы"> ×
              <input class="mini-input" value="${escapeHtml(String(it.reps))}" data-reps="${di}:${ii}" aria-label="Повторения">
              <button class="btn btn--icon btn--ghost" data-action="remove-day-item" data-di="${di}" data-ii="${ii}">${icon('x', 15)}</button>
            </div>`
                  )
                  .join('')
              : '<div class="muted" style="padding:4px 0 8px">Нет упражнений</div>'
          }
        </div>
        <button class="btn btn--soft btn--sm btn--block" style="margin-top:8px" data-action="add-day-item" data-index="${di}">${icon('plus', 15)} Упражнение</button>
      </div>`
        )
        .join('')}
      <button class="btn btn--outline btn--block" style="margin-top:12px" data-action="add-day">${icon('plus', 17)} Добавить день</button>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn btn--soft" data-action="go-back">Отмена</button>
        <button class="btn btn--primary" data-action="save-program" data-id="${p.id}">${icon('check', 17)} Сохранить</button>
      </div>
    </div>`;

  return {
    html: topbar({ title: 'Редактор программы', back: 'go-back', actions: '' }) + `<div class="view">${body}</div>`,
    mount() {
      // живое обновление модели без перерисовки
      const q = (sel) => document.querySelector(sel);
      q('[data-edit="name"]')?.addEventListener('input', (e) => (p.name = e.target.value));
      q('[data-edit="goal"]')?.addEventListener('change', (e) => (p.goal = e.target.value));
      q('[data-edit="description"]')?.addEventListener('input', (e) => (p.description = e.target.value));
      for (const el of document.querySelectorAll('[data-day-name]')) {
        el.addEventListener('input', () => (p.days[Number(el.dataset.dayName)].name = el.value));
      }
      for (const el of document.querySelectorAll('[data-day-focus]')) {
        el.addEventListener('input', () => (p.days[Number(el.dataset.dayFocus)].focus = el.value));
      }
      for (const el of document.querySelectorAll('[data-sets]')) {
        el.addEventListener('input', () => {
          const [di, ii] = el.dataset.sets.split(':').map(Number);
          p.days[di].items[ii].sets = Math.max(1, Number(el.value) || 1);
        });
      }
      for (const el of document.querySelectorAll('[data-reps]')) {
        el.addEventListener('input', () => {
          const [di, ii] = el.dataset.reps.split(':').map(Number);
          p.days[di].items[ii].reps = el.value;
        });
      }
    },
  };
}

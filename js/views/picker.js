/* ============================================================
   Выбор упражнения: поиск, группы, свои упражнения
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { escapeHtml, uid, haptic } from '../utils.js';
import { allExercises, exerciseGroup, lastPerformance } from '../analytics.js';
import { GROUPS, GROUP_ORDER, EQUIPMENT, equipmentLabel } from '../exercises.js';
import { sheet, promptDialog, toast, topSheet } from '../ui.js';
import { chooseGroup } from './group-picker.js';

const SEARCH = new WeakMap();
let lastGroup = 'all';
let lastQuery = '';

function idxOf(ex) {
  return `${ex.name} ${ex.group} ${equipmentLabel(ex.eq)}`.toLowerCase();
}

function score(ex, q) {
  const n = ex.name.toLowerCase();
  if (!q) return 0;
  if (n.startsWith(q)) return 3;
  if (n.includes(q)) return 2;
  if (ex.group.includes(q) || equipmentLabel(ex.eq).toLowerCase().includes(q)) return 1;
  return -1;
}

export function exerciseRow(ex, opts = {}) {
  const g = GROUPS[ex.group] || GROUPS.chest;
  const last = lastPerformance(ex.id);
  return `<button class="pick-row" data-action="pick-exercise" data-id="${ex.id}">
    <span class="pick-ic" style="background:${g.color}1f;color:${g.color}">${icon(eqIcon(ex.eq), 19)}</span>
    <span class="grow" style="min-width:0">
      <span class="pick-name ellipsis">${escapeHtml(ex.name)}</span>
      <span class="pick-sub">${g.label} · ${equipmentLabel(ex.eq)}${last ? (last.best.weight ? ` · ${last.sets.length} подх. × ${last.best.weight} кг` : ` · ${last.sets.length} подх.`) : ''}</span>
    </span>
    ${ex.custom ? '<span class="badge badge--info">своё</span>' : ''}
    <span class="pick-plus">${icon('plus', 18)}</span>
  </button>`;
}

function eqIcon(eq) {
  return EQUIPMENT[eq]?.icon || 'dumbbell';
}

/**
 * openExercisePicker({ onPick, title, excludeIds })
 * onPick(exercise, sheetEntry)
 */
export function openExercisePicker({ onPick, title = 'Выбрать упражнение', excludeIds = [], sub = '' } = {}) {
  let query = lastQuery;
  let group = lastGroup;

  const renderList = (sheetEl, bodyEl) => {
    const list = allExercises()
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => group === 'all' || e.group === group)
      .filter((e) => !query || idxOf(e).includes(query))
      .sort((a, b) => score(b, query) - score(a, query) || a.name.localeCompare(b.name, 'ru'));

    const recentIds = recentExerciseIds().filter((id) => !excludeIds.includes(id));
    const recents = recentIds
      .map((id) => allExercises().find((e) => e.id === id))
      .filter(Boolean)
      .slice(0, 4);

    bodyEl.innerHTML = `
      <div class="picker-search">
        <div class="search">${icon('search', 18)}<input data-picker-search value="${escapeHtml(query)}" placeholder="Поиск упражнения…" autocomplete="off" spellcheck="false"><button class="search__clear ${query ? '' : 'hidden'}" data-picker-clear>${icon('x', 14)}</button></div>
      </div>
      <div class="chip-row picker-groups">
        <button class="chip ${group === 'all' ? 'is-on' : ''}" data-picker-group="all">Все</button>
        ${GROUP_ORDER.map((g) => `<button class="chip ${group === g ? 'is-on' : ''}" data-picker-group="${g}">${GROUPS[g].label}</button>`).join('')}
      </div>
      ${query || group !== 'all' ? '' : recents.length ? `<div class="picker-label">Недавние</div>${recents.map((ex) => exerciseRow(ex)).join('')}<div class="picker-label">Все упражнения</div>` : ''}
      <div class="pick-list">
        ${
          list.length
            ? list.map((ex) => exerciseRow(ex)).join('')
            : `<div class="empty" style="padding:26px 10px"><div class="empty__icon">${icon('search', 24)}</div><h3>Ничего не найдено</h3><p>Попробуйте другое название или создайте своё упражнение.</p>
               <button class="btn btn--accent-soft btn--sm" data-action="create-exercise" style="margin-top:6px">${icon('plus', 15)} Своё упражнение</button></div>`
        }
      </div>
      <button class="btn btn--soft btn--block" style="margin-top:10px" data-action="create-exercise">${icon('plus', 17)} Создать своё упражнение</button>
    `;
    const input = bodyEl.querySelector('[data-picker-search]');
    if (input) {
      input.addEventListener('input', () => {
        query = input.value.trim().toLowerCase();
        lastQuery = query;
        const pos = input.selectionStart;
        renderList(sheetEl, bodyEl);
        const ni = bodyEl.querySelector('[data-picker-search]');
        if (ni) {
          ni.focus();
          ni.setSelectionRange(pos, pos);
        }
      });
    }
    bodyEl.querySelector('[data-picker-clear]')?.addEventListener('click', () => {
      query = '';
      lastQuery = '';
      renderList(sheetEl, bodyEl);
    });
    for (const b of bodyEl.querySelectorAll('[data-picker-group]')) {
      b.addEventListener('click', () => {
        group = b.dataset.pickerGroup;
        lastGroup = group;
        haptic();
        renderList(sheetEl, bodyEl);
      });
    }
    for (const b of bodyEl.querySelectorAll('[data-action="pick-exercise"]')) {
      b.addEventListener('click', () => {
        const ex = allExercises().find((e) => e.id === b.dataset.id);
        if (!ex) return;
        haptic();
        current.close('pick');
        onPick?.(ex);
      });
    }
    for (const b of bodyEl.querySelectorAll('[data-action="create-exercise"]')) {
      b.addEventListener('click', () => {
        createCustomExercise({ excludeIds }).then((ex) => {
          if (!ex) return;
          current.close('pick');
          onPick?.(ex);
        });
      });
    }
  };

  const sh = sheet({
    title,
    sub,
    body: '<div data-picker-body></div>',
    onClose: () => {
      lastQuery = '';
    },
  });
  const current = sh;
  renderList(sh.el, sh.el.querySelector('[data-picker-body]'));
  setTimeout(() => sh.el.querySelector('[data-picker-search]')?.focus({ preventScroll: true }), 260);
  return sh;
}

export function recentExerciseIds() {
  const ids = [];
  const seen = new Set();
  for (const w of (state.workouts || []).slice().sort((a, b) => b.startedAt - a.startedAt)) {
    for (const it of w.items || []) {
      if (!seen.has(it.exerciseId)) {
        seen.add(it.exerciseId);
        ids.push(it.exerciseId);
      }
      if (ids.length >= 8) return ids;
    }
  }
  return ids;
}

/* ---------- создание своего упражнения ---------- */
export async function createCustomExercise({ excludeIds = [] } = {}) {
  const name = await promptDialog({
    title: 'Своё упражнение',
    label: 'Название',
    placeholder: 'Например: Тяга к поясу в наклоне',
    ok: 'Далее',
  });
  if (!name) return null;
  const group = await chooseGroup();
  if (!group) return null;
  const ex = {
    id: 'c-' + uid(),
    name: name.slice(0, 60),
    group,
    eq: 'other',
    level: 1,
    compound: false,
    cues: ['Своё упражнение — добавьте технику выполнения в описании.'],
    alts: [],
    time: group === 'core' || group === 'cardio',
    dist: group === 'cardio',
    custom: true,
  };
  state.customExercises = [...(state.customExercises || []), ex];
  save({ immediate: true });
  toast('Упражнение добавлено');
  return ex;
}

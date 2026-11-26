/* ============================================================
   Библиотека упражнений + карточка упражнения
   ============================================================ */
import { state } from '../store.js';
import { icon } from '../icons.js';
import { escapeHtml, fmtDate, fmtDuration, haptic } from '../utils.js';
import {
  allExercises, exerciseById, exerciseHistory, personalRecords, exerciseName, exerciseGroup, lastPerformance,
} from '../analytics.js';
import { GROUPS, GROUP_ORDER, EQUIPMENT, equipmentLabel, levelLabel } from '../exercises.js';
import { topbar, emptyState, refresh } from '../ui.js';
import { openExercisePicker, createCustomExercise } from './picker.js';

let filterGroup = 'all';
let query = '';

function eqIcon(eq) {
  return EQUIPMENT[eq]?.icon || 'dumbbell';
}

export default function renderExercises() {
  const list = allExercises()
    .filter((e) => filterGroup === 'all' || e.group === filterGroup)
    .filter((e) => !query || `${e.name} ${e.group} ${equipmentLabel(e.eq)}`.toLowerCase().includes(query))
    .sort((a, b) => (a.custom === b.custom ? a.name.localeCompare(b.name, 'ru') : a.custom ? -1 : 1));

  const byGroup = new Map();
  for (const ex of list) {
    if (!byGroup.has(ex.group)) byGroup.set(ex.group, []);
    byGroup.get(ex.group).push(ex);
  }

  const body = `
    <div class="pad" style="margin-top:6px">
      <div class="search">${icon('search', 18)}<input data-ex-search value="${escapeHtml(query)}" placeholder="Поиск упражнения…" autocomplete="off" spellcheck="false">${query ? `<button class="search__clear" data-ex-clear>${icon('x', 14)}</button>` : ''}</div>
    </div>
    <div class="hscroll" style="margin-top:10px">
      <button class="chip ${filterGroup === 'all' ? 'is-on' : ''}" data-ex-group="all">Все · ${allExercises().length}</button>
      ${GROUP_ORDER.map((g) => {
        const n = allExercises().filter((e) => e.group === g).length;
        return `<button class="chip ${filterGroup === g ? 'is-on' : ''}" data-ex-group="${g}">${GROUPS[g].label} · ${n}</button>`;
      }).join('')}
    </div>
    <div class="pad" style="margin-top:12px">
      ${
        list.length
          ? [...byGroup.entries()]
              .map(
                ([g, exs]) => `<div class="lib-group">
            <div class="lib-group__title"><span class="lib-dot" style="background:${GROUPS[g].color}"></span>${GROUPS[g].label}<span class="muted" style="margin-left:6px;font-weight:500">${exs.length}</span></div>
            <div class="card list">
              ${exs.map(
                (ex) => `<button class="list__row" data-action="open-exercise" data-id="${ex.id}">
                  <span class="list__icon" style="background:${GROUPS[g].color}1a;color:${GROUPS[g].color}">${icon(eqIcon(ex.eq), 17)}</span>
                  <span class="grow">
                    <span class="list__label" style="display:block">${escapeHtml(ex.name)}</span>
                    <span class="list__sub">${equipmentLabel(ex.eq)} · ${levelLabel(ex.level)}${ex.custom ? ' · своё' : ''}</span>
                  </span>
                  ${icon('chevronRight', 18, 'list__chev')}
                </button>`
              ).join('')}
            </div>
          </div>`
              )
              .join('')
          : emptyState({
              iconName: 'search',
              title: 'Ничего не найдено',
              text: 'Попробуйте другое название или создайте своё упражнение.',
              action: `<button class="btn btn--accent-soft btn--sm" data-action="create-exercise">${icon('plus', 15)} Создать своё</button>`,
            })
      }
      <button class="btn btn--outline btn--block" style="margin-top:16px" data-action="create-exercise">${icon('plus', 18)} Создать своё упражнение</button>
      <div class="hint-box" style="margin-top:16px">
        ${icon('info', 16)}
        <span>Техника, группы мышц и упражнения-замены — всё бесплатно, без подписки.</span>
      </div>
    </div>`;

  return {
    html:
      topbar({
        title: 'Упражнения',
        sub: `${allExercises().length} в базе`,
        back: 'go-back',
        actions: `<button class="btn btn--icon btn--soft" data-action="create-exercise" aria-label="Создать упражнение">${icon('plus', 20)}</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {
      const input = document.querySelector('[data-ex-search]');
      input?.addEventListener('input', () => {
        query = input.value.trim().toLowerCase();
        const pos = input.selectionStart;
        refresh();
        const ni = document.querySelector('[data-ex-search]');
        if (ni) {
          ni.focus();
          ni.setSelectionRange(pos, pos);
        }
      });
      for (const b of document.querySelectorAll('[data-ex-group]')) {
        b.addEventListener('click', () => {
          filterGroup = b.dataset.exGroup;
          haptic();
          refresh();
        });
      }
      document.querySelector('[data-ex-clear]')?.addEventListener('click', () => {
        query = '';
        refresh();
      });
    },
  };
}

/* ============================================================
   Карточка упражнения
   ============================================================ */
export function renderExerciseDetail(params) {
  const ex = exerciseById(params.id);
  if (!ex) {
    return {
      html: topbar({ title: 'Упражнение', back: 'go-back' }) + `<div class="view">${emptyState({ title: 'Не найдено', text: 'Упражнение удалено.' })}</div>`,
      mount() {},
    };
  }
  const g = GROUPS[ex.group] || GROUPS.chest;
  const recs = personalRecords(ex.id);
  const hist = exerciseHistory(ex.id).slice(0, 8);
  const alts = (ex.alts || []).map((id) => exerciseById(id)).filter(Boolean);

  const body = `
    <div class="pad">
      <div class="ex-hero" style="background:linear-gradient(140deg, ${g.color}26, transparent 70%)">
        <div class="ex-hero__ic" style="background:${g.color}22;color:${g.color}">${icon(eqIcon(ex.eq), 30)}</div>
        <div class="h1" style="font-size:24px;margin-top:12px">${escapeHtml(ex.name)}</div>
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">
          <span class="badge" style="background:${g.color}1f;color:${g.color}">${g.label}</span>
          ${equipmentLabel(ex.eq) !== g.label ? `<span class="badge">${equipmentLabel(ex.eq)}</span>` : ''}
          <span class="badge">${levelLabel(ex.level)}</span>
          ${ex.compound ? '<span class="badge badge--accent">Базовое</span>' : '<span class="badge">Изолирующее</span>'}
          ${ex.custom ? '<span class="badge badge--info">Своё</span>' : ''}
        </div>
      </div>

      ${
        recs.sessions
          ? `<div class="metrics" style="margin-top:14px">
              <div class="metric"><div class="metric__v">${fmtNum(recs.maxWeight)}<small>кг</small></div><div class="metric__l">Макс. вес</div></div>
              <div class="metric"><div class="metric__v">${fmtNum(recs.best1rm)}<small>кг</small></div><div class="metric__l">1ПМ (расчёт)</div></div>
              <div class="metric"><div class="metric__v">${recs.sessions}</div><div class="metric__l">Тренировок</div></div>
            </div>`
          : ''
      }

      <div class="section-title" style="padding-left:0"><h2>Техника</h2></div>
      <div class="card card--pad">
        <ol class="cues">
          ${(ex.cues || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
        </ol>
        ${
          ex.mistakes?.length
            ? `<div class="divider"></div><div class="tiny" style="margin-bottom:6px">ЧАСТЫЕ ОШИБКИ</div><ul class="mistakes">${ex.mistakes.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`
            : ''
        }
      </div>

      ${
        alts.length
          ? `<div class="section-title" style="padding-left:0"><h2>Замены</h2><span class="muted">если тренажёр занят</span></div>
          <div class="card list">
            ${alts.map((a) => {
              const ag = GROUPS[a.group] || g;
              return `<button class="list__row" data-action="open-exercise" data-id="${a.id}">
                <span class="list__icon" style="background:${ag.color}1a;color:${ag.color}">${icon(eqIcon(a.eq), 17)}</span>
                <span class="grow"><span class="list__label" style="display:block">${escapeHtml(a.name)}</span><span class="list__sub">${ag.label} · ${equipmentLabel(a.eq)}</span></span>
                ${icon('chevronRight', 18, 'list__chev')}
              </button>`;
            }).join('')}
          </div>`
          : ''
      }

      ${
        hist.length
          ? `<div class="section-title" style="padding-left:0"><h2>История</h2><span class="muted">${hist.length ? 'последние ' + hist.length : ''}</span></div>
          <div class="card">
            ${hist
              .map(
                (h) => `<div class="hist-row">
                  <div class="hist-row__date">${fmtDate(h.date)}</div>
                  <div class="grow">
                    <div class="hist-sets">${h.sets.map((s) => `<span class="set-pill">${fmtNum(s.weight)}×${fmtNum(s.reps)}</span>`).join('')}</div>
                  </div>
                  <div class="hist-row__vol num">${Math.round(h.volume)}</div>
                </div>`
              )
              .join('')}
          </div>`
          : `<div class="hint-box" style="margin-top:18px">${icon('info', 16)}<span>Ещё нет истории. Добавьте упражнение в тренировку — и здесь появится прогресс.</span></div>`
      }
    </div>`;

  return {
    html:
      topbar({
        title: 'Упражнение',
        back: 'go-back',
        actions: `<button class="btn btn--soft btn--sm" data-action="open-exercise-pick-for-detail">${icon('switch', 16)} Заменить</button>`,
      }) + `<div class="view">${body}</div>`,
    mount() {},
  };
}

function fmtNum(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

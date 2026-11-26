/* ============================================================
   Выбор вида спорта и добавление в дневник
   ============================================================ */
import { SPORTS } from '../sports.js';
import { icon } from '../icons.js';
import { escapeHtml, plural } from '../utils.js';
import { sheet, toast, go, confirmDialog, closeSheets } from '../ui.js';
import { activeSession, startSession, addExercise, discardSession } from '../session.js';
import { state, save } from '../store.js';
import { uid, isoDate } from '../utils.js';

/** Иконка по виду спорта */
function sportIcon(id) {
  if (id.includes('football') || id.includes('hockey')) return 'target';
  if (id.includes('volleyball') || id.includes('basketball')) return 'target';
  if (id.includes('tennis') || id.includes('badminton')) return 'switch';
  if (id.includes('swimming')) return 'volume';
  if (id.includes('running') || id.includes('hiking')) return 'trendUp';
  if (id.includes('cycling')) return 'repeat';
  if (id.includes('martial')) return 'bolt';
  if (id.includes('dance')) return 'sparkles';
  if (id.includes('yoga')) return 'heart';
  return 'target';
}

export function openSportPicker({ onPick = null } = {}) {
  const body = `<div class="sport-grid">
    ${SPORTS.map(
      (s) => `<button class="sport-pick" data-sport="${s.id}">
        <span class="sport-pick__ic">${icon(sportIcon(s.id), 18)}</span>
        <span class="grow">${escapeHtml(s.name)}
          <span class="sport-pick__meta">${Object.keys(s.load).filter((g) => g !== 'cardio').length} групп мышц${s.dist ? ' · дистанция' : ''}</span>
        </span>
      </button>`
    ).join('')}
  </div>`;
  const sh = sheet({
    title: 'Добавить спорт',
    sub: 'Футбол, волейбол, теннис и другие активности',
    body,
  });
  for (const b of sh.el.querySelectorAll('[data-sport]')) {
    b.addEventListener('click', () => {
      const sport = SPORTS.find((s) => s.id === b.dataset.sport);
      if (!sport) return;
      sh.close('pick');
      if (onPick) onPick(sport);
      else askDurationAndStart(sport);
    });
  }
  return sh;
}

/** Спрашивает длительность и создаёт тренировку со спортом */
export function askDurationAndStart(sport) {
  let minutes = 60;
  const body = `<div class="sport-duration">
      <button class="chip" data-dur="-15">−15</button>
      <div class="sport-duration__val" data-dur-val>${minutes}<small>мин</small></div>
      <button class="chip" data-dur="15">+15</button>
    </div>
    <div class="chip-row" style="justify-content:center;margin-top:6px">
      ${[30, 45, 60, 90, 120].map((m) => `<button class="chip ${m === minutes ? 'is-on' : ''}" data-dur-set="${m}">${m} мин</button>`).join('')}
    </div>
    ${sport.dist ? `<div class="field" style="margin-top:16px"><div class="field__label">Дистанция, км</div>
      <input class="input" type="number" inputmode="decimal" step="0.1" min="0" data-field="dist" placeholder="0"></div>` : ''}
    <div class="hint-box" style="margin-top:16px">${icon('info', 16)}<span>Длительность пойдёт в общий объём и в нагрузку по группам мышц: ${Object.entries(sport.load)
      .filter(([g]) => g !== 'cardio')
      .map(([g, v]) => `${groupLabel(g)} ${Math.round(v * 100)}%`)
      .join(', ')}</span></div>`;
  const sh = sheet({
    title: escapeHtml(sport.name),
    sub: 'Сколько длилась активность?',
    body,
    foot: `<button class="btn btn--soft" data-close>Отмена</button><button class="btn btn--primary" data-start>${icon('play', 17)} Записать</button>`,
  });
  const valEl = sh.el.querySelector('[data-dur-val]');
  const render = () => {
    valEl.innerHTML = `${minutes}<small>мин</small>`;
    for (const b of sh.el.querySelectorAll('[data-dur-set]')) {
      b.classList.toggle('is-on', Number(b.dataset.durSet) === minutes);
    }
  };
  for (const b of sh.el.querySelectorAll('[data-dur]')) {
    b.addEventListener('click', () => {
      minutes = Math.max(5, Math.min(300, minutes + Number(b.dataset.dur)));
      render();
    });
  }
  for (const b of sh.el.querySelectorAll('[data-dur-set]')) {
    b.addEventListener('click', () => {
      minutes = Number(b.dataset.durSet);
      render();
    });
  }
  sh.el.querySelector('[data-start]').addEventListener('click', () => {
    const dist = Number(sh.el.querySelector('[data-field="dist"]')?.value) || 0;
    sh.close('start');
    recordSport(sport, minutes, dist);
  });
  render();
  return sh;
}

/** Создаёт запись о спорте: тренировка с одним «упражнением»-спортом */
export function recordSport(sport, minutes, distance = 0, dateIso = null) {
  const date = dateIso || isoDate(new Date());
  const startedAt = new Date().getTime() - minutes * 60000;
  const workout = {
    id: uid('w'),
    name: sport.name,
    programId: null,
    dayIndex: null,
    date,
    startedAt,
    finishedAt: Date.now(),
    notes: '',
    items: [
      {
        id: uid('it'),
        exerciseId: sport.id,
        note: '',
        rest: null,
        targetSets: 1,
        targetReps: '60',
        sets: [
          {
            id: uid('s'),
            weight: 0,
            reps: 1,
            duration: minutes,
            distance: distance || 0,
            done: true,
            completedAt: Date.now(),
          },
        ],
      },
    ],
  };
  state.workouts = [workout, ...(state.workouts || [])].sort((a, b) => b.startedAt - a.startedAt);
  save({ immediate: true });
  toast(`${sport.name} · ${minutes} мин записано`);
  return workout;
}

function groupLabel(g) {
  return (
    {
      chest: 'грудь',
      back: 'спина',
      shoulders: 'плечи',
      arms: 'руки',
      core: 'пресс',
      glutes: 'ягодицы',
      legs: 'ноги',
    }[g] || g
  );
}

/** Добавить спорт в текущую активную тренировку */
export function addSportToSession(sport) {
  const s = activeSession();
  if (!s) {
    toast('Сначала начните тренировку', 'info');
    return;
  }
  addExercise(sport.id, { sets: 1, reps: '60' });
  toast('Добавлено в тренировку');
}

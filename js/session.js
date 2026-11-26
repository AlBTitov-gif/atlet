/* ============================================================
   Активная тренировка: старт, подходы, отдых, завершение
   ============================================================ */
import { state, save } from './store.js';
import { uid, isoDate, num, e1rm, haptic } from './utils.js';
import { exerciseById, exerciseGroup, workoutVolume, workoutSets } from './analytics.js';
import { restTimer, settings, applySettings } from './timer.js';
import { parseReps } from './analytics.js';

export function activeSession() {
  const s = state.session;
  return s && s.workout && Array.isArray(s.workout.items) ? s : null;
}

export function isActive() {
  return !!activeSession();
}

/* ---------- создание ---------- */
function newSet(weight = 0, reps = 10) {
  return { id: uid('s'), weight: num(weight), reps: num(reps), done: false };
}

function makeItem(exerciseId, sets = 3, reps = '8-12', rest = null, note = '') {
  const ex = exerciseById(exerciseId);
  const r = parseReps(reps);
  const isTime = !!ex?.time && ex.group === 'core';
  const setList = Array.from({ length: Math.max(1, sets) }, () =>
    isTime ? { id: uid('s'), weight: 0, reps: r.lo, done: false, duration: r.lo } : newSet(0, r.lo)
  );
  return {
    id: uid('it'),
    exerciseId,
    note: note || '',
    rest: rest ?? null,
    targetSets: Math.max(1, sets),
    targetReps: String(reps || '8-12'),
    sets: setList,
  };
}

export function startSession({ name, programId = null, dayIndex = null, programDay = null, items = [], notes = '' } = {}) {
  const w = {
    id: uid('w'),
    name: name || 'Тренировка',
    programId,
    dayIndex,
    date: isoDate(new Date()),
    startedAt: Date.now(),
    finishedAt: null,
    notes,
    items: (items && items.length ? items : programDay ? dayToItems(programDay) : []).map((it) =>
      it.sets && it.sets[0] && typeof it.sets[0] === 'object'
        ? it
        : makeItem(it.exerciseId, it.sets || 3, it.reps || '8-12', it.rest, it.note)
    ),
  };
  if (w.items.length) w.items[0].collapsed = false;
  state.session = { workout: w, summary: null };
  save({ immediate: true });
  return state.session;
}

export function dayToItems(day) {
  return (day?.items || []).map((it) => ({
    id: uid('it'),
    exerciseId: it.exerciseId,
    note: it.note || '',
    rest: it.rest ?? null,
    targetSets: it.sets || 3,
    targetReps: String(it.reps || '8-12'),
    sets: Array.from({ length: Math.max(1, it.sets || 3) }, () => {
      const ex = exerciseById(it.exerciseId);
      const r = parseReps(it.reps || '8-12');
      return ex?.time && ex.group === 'core'
        ? { id: uid('s'), weight: 0, reps: r.lo, done: false, duration: r.lo }
        : { id: uid('s'), weight: 0, reps: r.lo, done: false };
    }),
  }));
}

export function startFromProgramDay(program, day, extra = {}) {
  const items = dayToItems(day);
  return startSession({
    name: extra.name || `${day.name}${day.focus ? ' · ' + day.focus : ''}`,
    programId: program.id,
    dayIndex: program.days.indexOf(day),
    items,
    notes: extra.notes || '',
  });
}

export function startEmpty() {
  return startSession({ name: 'Свободная тренировка', items: [] });
}

export function updateSession(mutator) {
  const s = activeSession();
  if (!s) return null;
  mutator(s.workout);
  s.workout.updatedAt = Date.now();
  save();
  return s.workout;
}

/* ---------- упражнения ---------- */
export function addExercise(exerciseId, opts = {}) {
  const s = activeSession();
  if (!s) return null;
  const ex = exerciseById(exerciseId);
  if (!ex) return null;
  const item = makeItem(
    exerciseId,
    opts.sets || 3,
    opts.reps || (ex.group === 'core' ? '30-45' : ex.group === 'cardio' ? '20' : '8-12'),
    opts.rest,
    opts.note
  );
  if (opts.afterId) {
    const i = s.workout.items.findIndex((x) => x.id === opts.afterId);
    s.workout.items.splice(i >= 0 ? i + 1 : s.workout.items.length, 0, item);
  } else {
    s.workout.items.push(item);
  }
  s.workout.items.forEach((it, i) => (it.collapsed = i !== s.workout.items.indexOf(item) ? it.collapsed : false));
  save();
  return item;
}

export function removeItem(itemId) {
  const s = activeSession();
  if (!s) return;
  s.workout.items = s.workout.items.filter((it) => it.id !== itemId);
  save();
}

export function moveItem(itemId, dir) {
  const s = activeSession();
  if (!s) return;
  const items = s.workout.items;
  const i = items.findIndex((x) => x.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  save();
}

export function replaceExercise(itemId, newExerciseId) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  if (!it) return;
  const oldDone = it.sets.filter((x) => x.done).length;
  it.exerciseId = newExerciseId;
  it.sets = it.sets.map((x) => ({ ...x, done: false }));
  it.targetSets = Math.max(it.targetSets, oldDone || 3);
  save();
}

/* ---------- подходы ---------- */
export function addSet(itemId, copyFrom = null) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  if (!it) return;
  const last = copyFrom || it.sets[it.sets.length - 1];
  it.sets.push({
    id: uid('s'),
    weight: last ? num(last.weight) : 0,
    reps: last ? num(last.reps) : 10,
    duration: last?.duration || 0,
    distance: last?.distance || 0,
    done: false,
  });
  save();
}

export function removeSet(itemId, setId) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  if (!it || it.sets.length <= 1) return;
  it.sets = it.sets.filter((x) => x.id !== setId);
  save();
}

export function updateSet(itemId, setId, patch) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  const set = it?.sets.find((x) => x.id === setId);
  if (!set) return;
  Object.assign(set, patch);
  save();
}

/**
 * Отметить подход выполненным. Возвращает { item, set, nextItem, isPr }.
 */
export function completeSet(itemId, setId, { startRest = true } = {}) {
  const s = activeSession();
  if (!s) return null;
  const it = s.workout.items.find((x) => x.id === itemId);
  if (!it) return null;
  const set = it.sets.find((x) => x.id === setId);
  if (!set) return null;

  const isPr = checkPr(it.exerciseId, set);
  set.done = true;
  set.completedAt = Date.now();
  haptic('heavy');
  save();

  let nextItem = null;
  let restStarted = false;
  if (startRest && settings.autoTimer) {
    const rest = it.rest || settings.restSec || 90;
    restTimer.start(rest, {
      label: exerciseById(it.exerciseId)?.name || '',
      title: `${it.sets.filter((x) => x.done).length} подход готов`,
    });
    restStarted = true;
  }
  if (it.sets.every((x) => x.done)) {
    // переходим к следующему упражнению
    const idx = s.workout.items.indexOf(it);
    nextItem = s.workout.items[idx + 1] || null;
  }
  return { item: it, set, nextItem, isPr, restStarted };
}

export function uncompleteSet(itemId, setId) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  const set = it?.sets.find((x) => x.id === setId);
  if (set) {
    set.done = false;
    haptic();
    save();
  }
}

/** Проверка личного рекорда (по 1ПМ среди завершённых тренировок) */
function checkPr(exerciseId, set) {
  const w = num(set.weight);
  const r = num(set.reps);
  if (w <= 0 || r <= 0) return false;
  const cur = e1rm(w, r);
  let best = 0;
  for (const wo of state.workouts || []) {
    for (const it of wo.items || []) {
      if (it.exerciseId !== exerciseId) continue;
      for (const st of it.sets || []) {
        if (!st.done) continue;
        best = Math.max(best, e1rm(num(st.weight), num(st.reps)));
      }
    }
  }
  // а также в этой сессии
  return cur > best + 0.01 && best > 0;
}

/* ---------- завершение ---------- */
export function sessionStats(w) {
  const done = (w.items || []).flatMap((it) => it.sets.filter((s) => s.done));
  return {
    sets: done.length,
    volume: workoutVolume(w),
    duration: Math.max(1, Math.round(((w.finishedAt || Date.now()) - w.startedAt) / 1000)),
    exercises: (w.items || []).filter((it) => it.sets.some((s) => s.done)).length,
  };
}

export function finishSession() {
  const s = activeSession();
  if (!s) return null;
  const w = s.workout;
  w.finishedAt = Date.now();
  w.date = isoDate(new Date(w.finishedAt ? w.finishedAt : Date.now()));
  // оставляем только выполненные подходы + пустые упражнения убираем
  w.items = w.items.filter((it) => it.sets.some((set) => set.done));
  for (const it of w.items) it.sets = it.sets.filter((set) => set.done);
  const hasAny = w.items.length > 0;
  if (hasAny) {
    state.workouts = [w, ...(state.workouts || []).filter((x) => x.id !== w.id)];
    if (w.programId) {
      state.activeProgramId = w.programId;
      state.programStart = state.programStart || Date.now();
    }
  }
  state.session = null;
  save({ immediate: true });
  restTimer.skip();
  return hasAny ? w : null;
}

export function discardSession() {
  state.session = null;
  restTimer.skip();
  save({ immediate: true });
}

/* ---------- сессия из прошлой тренировки ---------- */
export function repeatWorkout(workout, { sameDate = false } = {}) {
  const items = (workout.items || []).map((it) => ({
    id: uid('it'),
    exerciseId: it.exerciseId,
    note: it.note || '',
    rest: it.rest ?? null,
    targetSets: it.sets?.length || 3,
    targetReps: String(it.targetReps || it.sets?.[0]?.reps || '8-12'),
    sets: (it.sets || []).map((st) => ({
      id: uid('s'),
      weight: num(st.weight),
      reps: num(st.reps),
      done: false,
    })),
  }));
  return startSession({
    name: workout.name,
    programId: workout.programId || null,
    dayIndex: workout.dayIndex ?? null,
    items,
    notes: workout.notes || '',
  });
}

/** Скопировать прошлые подходы упражнения в текущую сессию */
export function fillFromLast(itemId) {
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  if (!it) return;
  // ищем последнюю тренировку с этим упражнением
  let sets = null;
  for (const w of state.workouts || []) {
    const found = (w.items || []).find((i) => i.exerciseId === it.exerciseId);
    if (found && found.sets?.length) {
      sets = found.sets;
      break;
    }
  }
  if (!sets) return false;
  it.sets = sets.map((st) => ({
    id: uid('s'),
    weight: num(st.weight),
    reps: num(st.reps),
    done: false,
  }));
  it.targetSets = sets.length;
  save();
  return true;
}

/* ---------- сессия: применение настроек таймера ---------- */
export function syncTimerSettings() {
  applySettings(state.settings);
}

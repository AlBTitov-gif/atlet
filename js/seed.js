/* ============================================================
   Демо-данные: чтобы сразу увидеть прогресс и аналитику
   ============================================================ */
import { state, save } from './store.js';
import { uid, isoDate, addDays, num } from './utils.js';
import { baseExercises } from './exercises.js';

const BASE_WEIGHTS = {
  'bench-press': 60, 'incline-db-press': 22, 'db-fly': 12, 'cable-crossover': 15,
  'bent-row': 55, 'lat-pulldown': 50, 'seated-row': 45, 'db-row': 26, 'pull-up': 0,
  'squat': 80, 'rdl': 70, 'leg-press': 140, 'leg-curl': 35, 'calf-raise': 60,
  'ohp': 35, 'db-shoulder-press': 18, 'lateral-raise': 8, 'face-pull': 20,
  'hip-thrust': 90, 'bulgarian-split': 16, 'leg-ext': 45,
  'curl': 25, 'hammer-curl': 12, 'pushdown': 30, 'french-press': 16,
  'plank': 0, 'crunch': 0, 'hanging-knee-raise': 0, 'cable-crunch': 25,
};

const REP_TARGETS = {
  'bench-press': 8, 'squat': 8, 'bent-row': 8, 'rdl': 10, 'lat-pulldown': 12,
  'leg-press': 12, 'ohp': 8, 'hip-thrust': 10, 'leg-curl': 12, 'lateral-raise': 15,
  'face-pull': 15, 'db-shoulder-press': 10, 'incline-db-press': 10, 'db-fly': 12,
  'cable-crossover': 15, 'seated-row': 10, 'db-row': 10, 'pull-up': 6, 'curl': 10,
  'hammer-curl': 12, 'pushdown': 12, 'french-press': 12, 'bulgarian-split': 10,
  'leg-ext': 12, 'calf-raise': 15, 'plank': 45, 'crunch': 15, 'hanging-knee-raise': 12,
  'cable-crunch': 12,
};

function dayTemplate(kind) {
  const t = {
    push: [
      ['bench-press', 4], ['ohp', 3], ['incline-db-press', 3], ['lateral-raise', 4],
      ['pushdown', 3], ['cable-crossover', 3],
    ],
    pull: [
      ['pull-up', 3], ['bent-row', 4], ['seated-row', 3], ['face-pull', 3],
      ['curl', 3], ['hammer-curl', 3],
    ],
    legs: [
      ['squat', 4], ['rdl', 3], ['leg-press', 4], ['leg-curl', 3],
      ['calf-raise', 4], ['hanging-knee-raise', 3],
    ],
  }[kind];
  return { kind, items: t };
}

const NAMES = { push: 'Жимы', pull: 'Тяги', legs: 'Ноги' };

export function seedDemo() {
  const workouts = [];
  const start = addDays(new Date(), -74);
  let week = 0;
  // 3 тренировки в неделю, 10 недель + постепенная прогрессия
  for (let d = 0; d < 75; d += 1) {
    const date = addDays(start, d);
    const dow = date.getDay(); // 1 пн, 3 ср, 5 пт
    const map = { 1: 'push', 3: 'pull', 5: 'legs' };
    const kind = map[dow];
    if (!kind) continue;
    if (Math.random() < 0.12) continue; // иногда пропуск
    const weekIdx = Math.floor(d / 7);
    const progress = 1 + weekIdx * 0.022; // +2.2% в неделю
    const tpl = dayTemplate(kind);
    const items = tpl.items.map(([exId, sets], idx) => {
      const base = BASE_WEIGHTS[exId] ?? 20;
      const repsTarget = REP_TARGETS[exId] ?? 10;
      const isTime = exId === 'plank' || exId === 'hanging-knee-raise' || exId === 'crunch';
      const weight = base ? Math.round((base * progress * (0.97 + Math.random() * 0.07)) / 2.5) * 2.5 : 0;
      const setList = Array.from({ length: sets }, (_, i) => {
        const fatigue = i > 1 ? 1 - (i - 1) * 0.04 : 1;
        const reps = isTime
          ? Math.max(20, Math.round(repsTarget * progress * (0.9 + Math.random() * 0.25)))
          : Math.max(4, Math.round(repsTarget * fatigue * (0.92 + Math.random() * 0.18) * progress));
        return { id: uid('s'), weight, reps, done: true };
      });
      return {
        id: uid('it'),
        exerciseId: exId,
        note: '',
        rest: 90,
        targetSets: sets,
        targetReps: `${Math.max(4, Math.round(repsTarget * 0.8))}-${Math.round(repsTarget * 1.2)}`,
        sets: setList,
      };
    });
    const startedAt = new Date(date);
    startedAt.setHours(19, 5 + Math.floor(Math.random() * 20), 0, 0);
    const durationMin = 55 + Math.round(Math.random() * 25);
    const finishedAt = startedAt.getTime() + durationMin * 60000 + 240000;
    workouts.push({
      id: uid('w'),
      name: `${NAMES[kind]} · PPL`,
      programId: 'ppl',
      dayIndex: kind === 'push' ? 0 : kind === 'pull' ? 1 : 2,
      date: isoDate(date),
      startedAt: startedAt.getTime(),
      finishedAt,
      notes: '',
      items,
    });
  }

  // замеры: вес снижается, грудь и руки растут
  const measurements = [];
  for (let d = 0; d <= 72; d += 7) {
    const date = addDays(start, d);
    const t = d / 72;
    measurements.push({
      id: uid('m'),
      date: isoDate(date),
      weight: Math.round((86 - t * 5.2 + (Math.random() - 0.5) * 0.8) * 10) / 10,
      waist: Math.round((92 - t * 4.5) * 10) / 10,
      chest: Math.round((104 + t * 3.2) * 10) / 10,
      biceps: Math.round((37 + t * 1.6) * 10) / 10,
      hips: Math.round((98 - t * 2.2) * 10) / 10,
      note: d === 0 ? 'старт' : '',
      createdAt: date.getTime(),
    });
  }

  state.workouts = [...workouts, ...(state.workouts || [])];
  state.measurements = [...measurements, ...(state.measurements || [])];
  state.settings.name = state.settings.name || 'Атлет';
  state.settings.weeklyGoal = state.settings.weeklyGoal || 4;
  state.settings.weight = measurements[measurements.length - 1].weight;
  state.activeProgramId = 'ppl';
  state.programStart = start.getTime();
  save({ immediate: true });
  return workouts.length;
}

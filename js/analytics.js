/* ============================================================
   Аналитика: объём, история упражнений, рекорды, стрики
   ============================================================ */
import { baseExercises, GROUPS } from './exercises.js';
import { SPORTS, isSport, sportOf, sportScore, MINUTES_PER_SET } from './sports.js';
import { MUSCLES, exerciseMuscles } from './muscles.js';
import { num, sum, e1rm, isoDate, startOfWeek, addDays, parseDate, daysBetween, groupBy } from './utils.js';
import { state } from './store.js';

function sportAsExercise(s) {
  return {
    id: s.id,
    name: s.name,
    group: 'sport',
    eq: 'sport',
    level: 1,
    compound: false,
    cues: ['Спортивная активность: учитывается время и нагрузка на группы мышц.'],
    alts: [],
    time: true,
    dist: !!s.dist,
    sport: true,
    load: s.load,
    custom: false,
  };
}

export function allExercises() {
  return [...baseExercises(), ...SPORTS.map(sportAsExercise), ...(state.customExercises || [])];
}

export function isSportExercise(id) {
  return isSport({ id });
}

export function exerciseById(id) {
  return allExercises().find((e) => e.id === id) || null;
}

export function exerciseName(id) {
  return exerciseById(id)?.name || 'Упражнение';
}

export function exerciseGroup(id) {
  return exerciseById(id)?.group || 'chest';
}

/** Суммарный тоннаж тренировки, кг */
export function workoutVolume(w) {
  let v = 0;
  for (const it of w.items || []) {
    for (const s of it.sets || []) {
      if (!s.done) continue;
      v += num(s.weight) * num(s.reps);
    }
  }
  return v;
}

export function workoutSets(w) {
  return (w.items || []).reduce((acc, it) => acc + (it.sets || []).filter((s) => s.done).length, 0);
}

export function workoutReps(w) {
  return (w.items || []).reduce(
    (acc, it) => acc + sum(it.sets || [], (s) => (s.done ? num(s.reps) : 0)),
    0
  );
}

export function workoutDuration(w) {
  if (!w.startedAt) return 0;
  const end = w.finishedAt || Date.now();
  return Math.max(0, Math.round((end - w.startedAt) / 1000));
}

export function workoutGroups(w) {
  const map = new Map();
  for (const it of w.items || []) {
    const g = exerciseGroup(it.exerciseId);
    const vol = sum(it.sets || [], (s) => (s.done ? num(s.weight) * num(s.reps) : 0));
    const sets = (it.sets || []).filter((s) => s.done).length;
    const cur = map.get(g) || { group: g, volume: 0, sets: 0, seconds: 0 };
    cur.volume += vol;
    cur.sets += sets;
    cur.seconds += sum(it.sets || [], (s) => (s.done ? num(s.duration) * 60 : 0));
    map.set(g, cur);
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume || b.sets - a.sets);
}

export function finishedWorkouts() {
  return (state.workouts || [])
    .filter((w) => w.finishedAt)
    .slice()
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

export function workoutsFrom(iso) {
  return finishedWorkouts().filter((w) => (w.date || isoDate(w.startedAt)) >= iso);
}

export function last7() {
  const from = isoDate(addDays(new Date(), -6));
  return workoutsFrom(from);
}

export function weekSummary(offsetWeeks = 0) {
  const start = startOfWeek(new Date());
  start.setDate(start.getDate() + offsetWeeks * 7);
  const from = isoDate(start);
  const to = isoDate(addDays(start, 6));
  const ws = finishedWorkouts().filter((w) => {
    const d = w.date || isoDate(w.startedAt);
    return d >= from && d <= to;
  });
  return {
    from,
    to,
    count: ws.length,
    volume: sum(ws, workoutVolume),
    seconds: sum(ws, workoutDuration),
    sets: sum(ws, workoutSets),
    workouts: ws,
  };
}

export function currentStreak() {
  const days = new Set(finishedWorkouts().map((w) => w.date || isoDate(w.startedAt)));
  let d = new Date();
  let streak = 0;
  // если сегодня ещё не тренировались — начинаем со вчера
  if (!days.has(isoDate(d))) d = addDays(d, -1);
  while (days.has(isoDate(d))) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

/** История подходов по упражнению: [{date, workoutId, sets:[...], best:{weight,reps,e1rm}, volume}] */
export function exerciseHistory(exerciseId) {
  const out = [];
  for (const w of finishedWorkouts()) {
    for (const it of w.items || []) {
      if (it.exerciseId !== exerciseId) continue;
      const sets = (it.sets || []).filter((s) => s.done);
      if (!sets.length) continue;
      let best = { weight: 0, reps: 0, e1rm: 0 };
      for (const s of sets) {
        const wv = num(s.weight);
        const rv = num(s.reps);
        const est = e1rm(wv, rv);
        if (est > best.e1rm) best = { weight: wv, reps: rv, e1rm: est, set: s };
      }
      out.push({
        date: w.date || isoDate(w.startedAt),
        workoutId: w.id,
        workoutName: w.name,
        sets,
        best,
        volume: sum(sets, (s) => num(s.weight) * num(s.reps)),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function lastPerformance(exerciseId) {
  const h = exerciseHistory(exerciseId);
  return h[0] || null;
}

export function personalRecords(exerciseId) {
  const h = exerciseHistory(exerciseId);
  let maxWeight = 0;
  let maxReps = 0;
  let maxVolume = 0;
  let best1rm = 0;
  for (const entry of h) {
    if (entry.best.weight > maxWeight) maxWeight = entry.best.weight;
    const reps = Math.max(...entry.sets.map((s) => num(s.reps)));
    if (reps > maxReps) maxReps = reps;
    const e = Math.max(...entry.sets.map((s) => e1rm(num(s.weight), num(s.reps))));
    if (e > best1rm) best1rm = e;
    if (entry.volume > maxVolume) maxVolume = entry.volume;
  }
  return { maxWeight, maxReps, maxVolume, best1rm, sessions: h.length };
}

/** Личные рекорды всей базы — топ упражнений по 1ПМ */
export function topRecords(limit = 12) {
  const seen = new Set();
  const recs = [];
  for (const w of finishedWorkouts()) {
    for (const it of w.items || []) {
      if (seen.has(it.exerciseId)) continue;
      seen.add(it.exerciseId);
      const sets = (it.sets || []).filter((s) => s.done && num(s.reps) > 0);
      if (!sets.length) continue;
      const bestSet = sets.reduce(
        (b, s) => (e1rm(num(s.weight), num(s.reps)) > e1rm(num(b.weight), num(b.reps)) ? s : b),
        sets[0]
      );
      const wv = num(bestSet.weight);
      if (wv <= 0) continue;
      recs.push({
        exerciseId: it.exerciseId,
        name: exerciseName(it.exerciseId),
        weight: wv,
        reps: num(bestSet.reps),
        e1rm: e1rm(wv, num(bestSet.reps)),
        date: w.date || isoDate(w.startedAt),
      });
    }
  }
  // max weight по упражнению, а не по всем сессиям
  const byEx = new Map();
  for (const r of recs) {
    const cur = byEx.get(r.exerciseId);
    if (!cur || r.e1rm > cur.e1rm) byEx.set(r.exerciseId, r);
  }
  return [...byEx.values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}

/** Объём по группам мышц за период */
export function groupVolume(fromIso, toIso = isoDate(new Date())) {
  const totals = {};
  for (const g of Object.keys(GROUPS)) totals[g] = { volume: 0, sets: 0 };
  const ws = finishedWorkouts().filter((w) => {
    const d = w.date || isoDate(w.startedAt);
    return d >= fromIso && d <= toIso;
  });
  for (const w of ws) {
    for (const it of w.items || []) {
      const g = exerciseGroup(it.exerciseId);
      if (!totals[g]) totals[g] = { volume: 0, sets: 0 };
      for (const s of it.sets || []) {
        if (!s.done) continue;
        totals[g].volume += num(s.weight) * num(s.reps) + (num(s.weight) === 0 ? num(s.reps) : 0);
        totals[g].sets += 1;
      }
    }
  }
  return totals;
}

/**
 * Нагрузка по группам мышц в процентах (как в Fitness Online):
 * силовые — подходы, спорт — минуты, пересчитанные в эквивалент подходов.
 * Возвращает { groups: [{group, pct, sets, seconds, isSport}], total, sportSeconds }
 */
export function muscleLoad(fromIso, toIso = isoDate(new Date())) {
  const scores = {};
  const seconds = {};
  const rawSets = {};
  for (const g of Object.keys(GROUPS)) {
    scores[g] = 0;
    seconds[g] = 0;
    rawSets[g] = 0;
  }
  const ws = finishedWorkouts().filter((w) => {
    const d = w.date || isoDate(w.startedAt);
    return d >= fromIso && d <= toIso;
  });
  for (const w of ws) {
    for (const it of w.items || []) {
      const ex = exerciseById(it.exerciseId);
      const g = ex?.group || 'chest';
      const done = (it.sets || []).filter((s) => s.done);
      if (!done.length) continue;

      if (ex?.sport || isSportExercise(it.exerciseId)) {
        const sp = sportOf(ex) || { load: { legs: 0.5, core: 0.5, cardio: 0.5 } };
        const minutes = sum(done, (s) => num(s.duration));
        const eq = sportScore(minutes || 30);
        for (const [mg, weight] of Object.entries(sp.load)) {
          if (mg === 'cardio') {
            scores.cardio = (scores.cardio || 0) + eq * weight;
          } else if (scores[mg] !== undefined) {
            scores[mg] += eq * weight;
          }
        }
        seconds.sport = (seconds.sport || 0) + (minutes || 30) * 60;
        rawSets.sport = (rawSets.sport || 0) + 1;
      } else {
        const factor = ex?.compound ? 1.2 : 1;
        scores[g] = (scores[g] || 0) + done.length * factor;
        rawSets[g] += done.length;
        seconds[g] += sum(done, (s) => num(s.duration) * 60);
      }
    }
  }
  const total = Object.values(scores).reduce((x, y) => x + y, 0);
  const display = Object.keys(GROUPS)
    .map((g) => ({
      group: g,
      pct: total > 0 ? (scores[g] / total) * 100 : 0,
      sets: rawSets[g] || 0,
      seconds: seconds[g] || 0,
      isSport: g === 'cardio' || g === 'sport',
    }))
    .filter((x) => x.pct > 0.01)
    .sort((x, y) => y.pct - x.pct);
  return { groups: display, total, sportSeconds: seconds.sport || 0, workouts: ws.length };
}

/** Время по видам спорта за период: [{name, minutes, sessions}] */
export function sportBreakdown(fromIso, toIso = isoDate(new Date())) {
  const map = new Map();
  const ws = finishedWorkouts().filter((w) => {
    const d = w.date || isoDate(w.startedAt);
    return d >= fromIso && d <= toIso;
  });
  for (const w of ws) {
    for (const it of w.items || []) {
      const ex = exerciseById(it.exerciseId);
      if (!ex?.sport) continue;
      const done = (it.sets || []).filter((s) => s.done);
      if (!done.length) continue;
      const minutes = sum(done, (s) => num(s.duration)) || workoutDuration(w) / 60;
      const cur = map.get(it.exerciseId) || { id: it.exerciseId, name: ex.name, minutes: 0, sessions: 0 };
      cur.minutes += minutes;
      cur.sessions += 1;
      map.set(it.exerciseId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes);
}


/** Нагрузка по конкретным мышцам (бицепс, трицепс, квадрицепс и т.д.) */
export function muscleLoadDetail(fromIso, toIso = isoDate(new Date())) {
  const scores = {};
  for (const m of MUSCLES) scores[m] = 0;
  const ws = finishedWorkouts().filter((w) => {
    const d = w.date || isoDate(w.startedAt);
    return d >= fromIso && d <= toIso;
  });
  for (const w of ws) {
    for (const it of w.items || []) {
      const ex = exerciseById(it.exerciseId);
      if (!ex) continue;
      const done = (it.sets || []).filter((s) => s.done);
      if (!done.length) continue;
      const mm = exerciseMuscles(ex);
      let amount;
      if (ex.sport) {
        const minutes = sum(done, (s) => num(s.duration)) || 45;
        amount = Math.max(0.6, minutes / 5);
      } else {
        amount = done.length * (ex.compound ? 1.15 : 1);
      }
      for (const [muscle, weight] of Object.entries(mm)) {
        if (scores[muscle] === undefined) continue;
        scores[muscle] += amount * weight;
      }
    }
  }
  const total = MUSCLES.reduce((x, m) => x + scores[m], 0);
  return MUSCLES.map((m) => ({
    muscle: m,
    score: scores[m],
    pct: total > 0 ? (scores[m] / total) * 100 : 0,
  })).sort((x, y) => y.pct - x.pct);
}

/** Данные для графика объёма по неделям: [{label, volume, count}] */
export function weeklySeries(weeks = 8) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = weekSummary(-i);
    out.push({
      label: i === 0 ? 'сейчас' : `${s.from.slice(8)}.${s.from.slice(5, 7)}`,
      volume: s.volume,
      count: s.count,
      seconds: s.seconds,
    });
  }
  return out;
}

/** Частота по неделям для графика */
export function weeklyCount(weeks = 8) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = weekSummary(-i);
    out.push({ label: i === 0 ? 'тек' : `${s.from.slice(8)}.${s.from.slice(5, 7)}`, value: s.count });
  }
  return out;
}

/** Топ упражнений по объёму и частоте */
export function topExercises(limit = 8, days = 90) {
  const from = isoDate(addDays(new Date(), -days));
  const map = new Map();
  for (const w of finishedWorkouts()) {
    const d = w.date || isoDate(w.startedAt);
    if (d < from) continue;
    for (const it of w.items || []) {
      const sets = (it.sets || []).filter((s) => s.done);
      if (!sets.length) continue;
      const cur = map.get(it.exerciseId) || {
        exerciseId: it.exerciseId,
        sessions: 0,
        sets: 0,
        volume: 0,
        best: 0,
      };
      cur.sessions += 1;
      cur.sets += sets.length;
      cur.volume += sum(sets, (s) => num(s.weight) * num(s.reps));
      cur.best = Math.max(cur.best, ...sets.map((s) => num(s.weight)));
      map.set(it.exerciseId, cur);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.sessions - a.sessions || b.volume - a.volume)
    .slice(0, limit)
    .map((r) => ({ ...r, name: exerciseName(r.exerciseId), group: exerciseGroup(r.exerciseId) }));
}

/** История замеров: последний и динамика */
export function measurementSeries() {
  return (state.measurements || [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function latestMeasurement() {
  const ser = measurementSeries();
  return ser.length ? ser[ser.length - 1] : null;
}

export function weightSeries() {
  return measurementSeries()
    .filter((m) => num(m.weight) > 0)
    .map((m) => ({ date: m.date, value: num(m.weight) }));
}

/** Средняя длительность тренировки, мин */
export function avgDuration() {
  const ws = finishedWorkouts();
  if (!ws.length) return 0;
  return Math.round(sum(ws.slice(0, 20), workoutDuration) / Math.min(20, ws.length) / 60);
}

export function totalStats() {
  const ws = finishedWorkouts();
  return {
    workouts: ws.length,
    volume: sum(ws, workoutVolume),
    sets: sum(ws, workoutSets),
    hours: sum(ws, workoutDuration) / 3600,
    firstDate: ws.length ? ws[ws.length - 1].date || isoDate(ws[ws.length - 1].startedAt) : null,
  };
}

/** Предложение следующей тренировки */
export function nextProgramDay(program) {
  if (!program || !program.days?.length) return null;
  const done = (state.workouts || []).filter(
    (w) => w.programId === program.id && w.finishedAt
  ).length;
  return program.days[done % program.days.length];
}

export function lastWorkoutForProgram(programId) {
  const ws = finishedWorkouts().filter((w) => w.programId === programId);
  return ws[0] || null;
}

/** Практические рекомендации по прогрессии для упражнения */
export function suggestionFor(exerciseId, targetReps = '8-12', targetSets = 3) {
  const last = lastPerformance(exerciseId);
  const range = parseReps(targetReps);
  if (!last) {
    return { text: 'Первый раз: подберите вес, с которым техника остаётся чистой', weight: 0, reps: range.lo };
  }
  const bestSet = last.best;
  const w = bestSet.weight;
  const r = bestSet.reps;
  if (w <= 0) return { text: `В прошлый раз: ${r} повторов`, weight: 0, reps: range.hi };
  if (r >= range.hi) {
    const inc = w >= 40 ? 5 : w >= 15 ? 2.5 : 1;
    return {
      text: `Прошлый раз: ${fmtW(w)} × ${r}. Готовы к ${fmtW(w + inc)}?`,
      weight: w + inc,
      reps: range.lo,
      increase: inc,
    };
  }
  if (r < range.lo) {
    return {
      text: `Прошлый раз: ${fmtW(w)} × ${r}. Оставьте тот же вес и доберите повторения`,
      weight: w,
      reps: range.lo,
    };
  }
  return {
    text: `Прошлый раз: ${fmtW(w)} × ${r}. Цель — ${range.lo}–${range.hi} повторений`,
    weight: w,
    reps: Math.min(range.hi, r + 1),
  };
}

function fmtW(w) {
  return Number.isInteger(w) ? `${w} кг` : `${w} кг`;
}

export function parseReps(reps) {
  const m = String(reps).match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { lo: num(m[1]), hi: num(m[2]) };
  const n = num(reps);
  return { lo: n || 10, hi: n || 10 };
}

/** Сколько раз упражнение встречается в программе */
export function countInProgram(program, exerciseId) {
  return (program?.days || []).reduce(
    (acc, d) => acc + d.items.filter((i) => i.exerciseId === exerciseId).length,
    0
  );
}

export function daysSinceLastWorkout() {
  const ws = finishedWorkouts();
  if (!ws.length) return null;
  return daysBetween(parseDate(ws[0].date || isoDate(ws[0].startedAt)), new Date());
}

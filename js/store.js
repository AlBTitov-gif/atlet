/* ============================================================
   Хранилище: единый стейт в localStorage + подписки
   ============================================================ */
import { debounce, uid } from './utils.js';

const KEY = 'atlet.state.v1';
const BACKUP_KEY = 'atlet.backup.v1';
export const SCHEMA_VERSION = 1;

export function defaultSettings() {
  return {
    name: '',
    height: 0,
    gender: 'm',
    birthYear: 0,
    unit: 'kg', // kg | lb
    theme: 'dark', // dark | light
    restSec: 90,
    restPresets: [45, 60, 90, 120, 180],
    autoTimer: true,
    sound: true,
    vibrate: true,
    keepAwake: true,
    notify: false,
    showPrev: true,
    e1rmFormula: 'epley',
    weeklyGoal: 4,
    onboardingDone: false,
    lastSeenAt: 0,
    installHintDone: false,
  };
}

export function defaultState() {
  return {
    v: SCHEMA_VERSION,
    settings: defaultSettings(),
    customExercises: [],
    programs: [],
    workouts: [],
    measurements: [],
    photos: [],
    session: null,
    activeProgramId: null,
    programStart: null,
    updatedAt: Date.now(),
  };
}

const listeners = new Set();
export let state = defaultState();

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch || {})) {
      out[k] = deepMerge(base[k], v);
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function migrate(data) {
  if (!data || typeof data !== 'object') return defaultState();
  const base = defaultState();
  const next = deepMerge(base, data);
  next.settings = { ...base.settings, ...(data.settings || {}) };
  next.customExercises = Array.isArray(data.customExercises) ? data.customExercises : [];
  next.programs = Array.isArray(data.programs) ? data.programs : [];
  next.workouts = Array.isArray(data.workouts) ? data.workouts : [];
  next.measurements = Array.isArray(data.measurements) ? data.measurements : [];
  next.photos = Array.isArray(data.photos) ? data.photos : [];
  next.session = data.session && data.session.workout && Array.isArray(data.session.workout.items)
    ? data.session
    : null;
  next.v = SCHEMA_VERSION;
  return next;
}

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (!raw) {
    try {
      raw = localStorage.getItem(BACKUP_KEY);
    } catch {}
  }
  const parsed = raw ? safeParse(raw) : null;
  if (parsed) {
    state = migrate(parsed);
  } else {
    state = defaultState();
  }
  return state;
}

const persist = debounce(() => {
  state.updatedAt = Date.now();
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(KEY, json);
    // лёгкая резервная копия раз в сутки
    const lastBackup = Number(localStorage.getItem('atlet.backup.at') || 0);
    if (Date.now() - lastBackup > 86400000) {
      localStorage.setItem(BACKUP_KEY, json);
      localStorage.setItem('atlet.backup.at', String(Date.now()));
    }
  } catch (e) {
    console.error('Не удалось сохранить данные', e);
    emit('storage:error', e);
  }
}, 300);

export function save(opts = {}) {
  if (opts.immediate) persist.flush();
  else persist();
  emit('change', state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(type, detail) {
  for (const fn of [...listeners]) {
    try {
      fn(type, detail ?? state);
    } catch (e) {
      console.error(e);
    }
  }
}

export function replaceState(next) {
  state = migrate(next);
  save({ immediate: true });
}

export function resetAll() {
  state = defaultState();
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem('atlet.backup.at');
  } catch {}
  save({ immediate: true });
}

/* ---------- сериализация ---------- */
export function exportJSON() {
  const data = { ...state, exportedAt: new Date().toISOString(), app: 'atlet' };
  return JSON.stringify(data, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Файл повреждён');
  if (!Array.isArray(data.workouts) && !Array.isArray(data.programs)) {
    throw new Error('Это не файл резервной копии Атлета');
  }
  replaceState(data);
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  save();
}

/* ---------- поиск по стейту ---------- */
export function workoutById(id) {
  return state.workouts.find((w) => w.id === id) || null;
}

export function customExercises() {
  return state.customExercises || [];
}

export function touchWorkout(w) {
  w.updatedAt = Date.now();
}

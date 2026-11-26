/* ============================================================
   Импорт истории тренировок из текста / CSV / скриншотов
   ============================================================ */
import { state, save } from './store.js';
import { uid, num, isoDate, parseDate, startOfDay } from './utils.js';
import { baseExercises } from './exercises.js';
import { e1rm } from './utils.js';

/* ---------- нормализация названий ---------- */
const ALIASES = {
  'жим лежа': 'bench-press',
  'жим штанги лежа': 'bench-press',
  'жим': 'bench-press',
  'присед': 'squat',
  'приседания': 'squat',
  'приседания со штангой': 'squat',
  'становая': 'rdl',
  'становая тяга': 'rdl',
  'румынская тяга': 'rdl',
  'тяга штанги в наклоне': 'bent-row',
  'тяга в наклоне': 'bent-row',
  'подтягивания': 'pull-up',
  'подтягивания на перекладине': 'pull-up',
  'тяга верхнего блока': 'lat-pulldown',
  'тяга нижнего блока': 'seated-row',
  'жим гантелей': 'bench-db',
  'жим гантелей лежа': 'bench-db',
  'жим гантелей на наклонной': 'incline-db-press',
  'жим штанги на наклонной': 'incline-bench',
  'разведение гантелей': 'db-fly',
  'сведение рук': 'cable-crossover',
  'махи гантелями': 'lateral-raise',
  'махи в стороны': 'lateral-raise',
  'подъем гантелей на бицепс': 'db-curl',
  'подъём гантелей на бицепс': 'db-curl',
  'подъем штанги на бицепс': 'curl',
  'подъём штанги на бицепс': 'curl',
  'сгибания на бицепс': 'curl',
  'французский жим': 'french-press',
  'разгибание на трицепс': 'pushdown',
  'жим ногами': 'leg-press',
  'разгибание ног': 'leg-ext',
  'сгибание ног': 'leg-curl',
  'подъем на носки': 'calf-raise',
  'подъём на носки': 'calf-raise',
  'жим стоя': 'ohp',
  'жим штанги стоя': 'ohp',
  'жим гантелей сидя': 'db-shoulder-press',
  'тяга к лицу': 'face-pull',
  'фейс пулл': 'face-pull',
  'планка': 'plank',
  'скручивания': 'crunch',
  'пресс': 'crunch',
  'подъем ног': 'leg-raise',
  'подъём ног': 'leg-raise',
  'ягодичный мост': 'hip-thrust',
  'выпады': 'lunge',
  'болгарский выпад': 'bulgarian-split',
  'гоблет присед': 'goblet-squat',
  'беговая дорожка': 'treadmill',
  'бег': 'treadmill',
  'велотренажер': 'bike',
  'велотренажёр': 'bike',
  'гребной тренажер': 'rower',
  'гребной тренажёр': 'rower',
  'скакалка': 'jump-rope',
  'бёрпи': 'burpee',
  'берпи': 'burpee',
  'махи гирей': 'kb-swing',
  'поочередное сгибание рук с разворотом сидя': 'db-curl',
  'поочередное сгибание рук с разворотом': 'db-curl',
  'сгибание рук с разворотом сидя': 'db-curl',
  'разведение гантелей на наклонной (30°) вверх скамье': 'db-fly',
  'разведение гантелей на наклонной вверх скамье': 'db-fly',
  'разведение гантелей на наклонной вверх': 'db-fly',
  'подъем гантелей на наклонной вверх': 'incline-db-press',
  'разведение гантелей на наклонной скамье': 'db-fly',
  'разведение гантелей на наклонной': 'db-fly',
  'жим гантелей на наклонной (30°) скамье вверх': 'incline-db-press',
  'подъем туловища лежа на полу': 'crunch',
  'становая тяга': 'rdl',
  'горизонтальная тяга блока сидя узким хватом': 'seated-row',
  'разгибание рук в блоке с веревками': 'pushdown',
  'подъем ног в висе на турнике': 'hanging-knee-raise',
  'подтягивания широким прямым хватом к груди': 'pull-up',
  'отжимания на брусьях': 'dips',
};

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanExerciseName(name) {
  return String(name || '')
    .replace(/[,\s;:]+$/g, '')
    .replace(/\(\d+°?\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function matchExercise(name) {
  const n = normalizeName(cleanExerciseName(name));
  if (!n) return null;
  const all = [...baseExercises(), ...(state.customExercises || [])];
  // точное
  let hit = all.find((e) => normalizeName(e.name) === n);
  if (hit) return hit;
  // алиасы
  const alias = ALIASES[n];
  if (alias) {
    hit = all.find((e) => e.id === alias);
    if (hit) return hit;
  }
  // частичное вхождение
  hit = all.find((e) => normalizeName(e.name).includes(n) || n.includes(normalizeName(e.name)));
  if (hit) return hit;
  return null;
}

/* ---------- парсер ---------- */
const DATE_RE = /^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TEXT_RE = /^(\d{1,2})\s+(янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек)[а-я]*\.?\s*(\d{4})?/i;
const MONTHS = { янв: 1, фев: 2, мар: 3, апр: 4, май: 5, мая: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12 };
const SET_RE = /(?:^|[\s,;])(\d+(?:[.,]\d+)?)\s*(?:кг|kg|x|×|\*)\s*(\d+)(?:\s*(?:х|раз|повт\.?))?(?=[\s,;]|$)/gi;
const REPS_ONLY_RE = /^(?:[^\d,;]+?)\s*((?:\d+\s*[,;]\s*)+\d+)$/;
const MEASURE_RE = /(вес|талия|грудь|бёдра|бедра|бицепс|шея|бедро|голень|жир|hips|waist|chest|weight)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(кг|kg|см|cm|%)?/i;

const MEASURE_KEYS = {
  вес: 'weight', weight: 'weight',
  талия: 'waist', waist: 'waist',
  грудь: 'chest', chest: 'chest',
  бёдра: 'hips', бедра: 'hips', hips: 'hips',
  бицепс: 'biceps',
  шея: 'neck',
  бедро: 'thigh',
  голень: 'calf',
  жир: 'bodyfat',
};

/** строки-замеры: «Вес: 82.5 кг», «Талия 87» */
export function parseMeasurements(text) {
  const out = {};
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(new RegExp('^' + MEASURE_RE.source + '$', 'i'));
    if (!m) continue;
    const key = MEASURE_KEYS[normalizeName(m[1])];
    if (!key) continue;
    const v = num(m[2]);
    if (v > 0) out[key] = v;
  }
  return out;
}

export function isMeasureLine(line) {
  return new RegExp('^' + MEASURE_RE.source + '$', 'i').test(String(line || '').trim());
}

/**
 * Парсит текст вида:
 * 12.11.2026
 * Жим штанги лёжа 60x10, 65x8, 65x8
 * ...
 * или CSV: дата;упражнение;подходы
 */
export function parseHistoryText(text) {
  const rawLines = String(text || '').replace(/\r/g, '').split('\n');
  const lines = rawLines.map((l) => l.trim()).filter((l) => l && !/^[-=_\s]+$/.test(l));

  const workouts = [];
  const unknown = [];
  let current = null;
  const problems = [];

  const dateFromLine = (line) => {
    const clean = line.replace(/^(дата|date)[:\s]*/i, '').trim();
    let m = clean.match(ISO_RE);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const noYearBracket = clean.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    m = noYearBracket.match(DATE_RE) || clean.match(DATE_RE);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      let y = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
        return isoDate(new Date(y, mo - 1, d));
      }
    }
    m = clean.match(DATE_TEXT_RE);
    if (m) {
      const mon = MONTHS[(m[2] || '').toLowerCase().slice(0, 3)];
      const y = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (mon) return isoDate(new Date(y, mon - 1, Number(m[1])));
    }
    return null;
  };

  const parseSets = (chunk) => {
    const sets = [];
    SET_RE.lastIndex = 0;
    let m;
    while ((m = SET_RE.exec(chunk))) {
      const w = num(m[1]);
      const r = num(m[2]);
      if (r > 0) sets.push({ weight: w, reps: r });
    }
    if (!sets.length) {
      // «8, 7, 6» — повторы своим весом
      const ro = chunk.match(REPS_ONLY_RE);
      if (ro) {
        for (const p of ro[1].split(/[,;]/)) {
          const r = num(p);
          if (r > 0 && r <= 100) sets.push({ weight: 0, reps: r });
        }
      }
    }
    return sets;
  };

  const parseCSV = (line) => {
    const parts = line.split(/[;\t]|,(?=\s*[^,\d])/).map((p) => p.trim()).filter((p) => p.length);
    if (parts.length < 3) return null;
    const dateIso = dateFromLine(parts[0]);
    if (!dateIso) return null;
    const name = parts[1];
    const setsChunk = parts.slice(2).join(' ');
    const sets = parseSets(setsChunk);
    if (!sets.length) return null;
    return { dateIso, name, sets };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isMeasureLine(line)) continue; // строки замеров не упражнения

    // строка только с датой (возможно «дата: 12.11.2026»)
    const onlyDate = line.match(/^(?:дата|date)[:\s]*/i) ? dateFromLine(line) : null;
    if (onlyDate && !SET_RE.test(line)) {
      current = { date: onlyDate, name: 'Тренировка', items: [] };
      workouts.push(current);
      SET_RE.lastIndex = 0;
      continue;
    }

    // дата в начале строки + название тренировки, но без подходов
    if (!SET_RE.test(line) && !REPS_ONLY_RE.test(line)) {
      SET_RE.lastIndex = 0;
      const iso = line.match(ISO_RE);
      if (iso) {
        const rest = line.replace(ISO_RE, '').replace(/^[—–-]\s*/, '').trim();
        current = { date: `${iso[1]}-${iso[2]}-${iso[3]}`, name: rest || 'Тренировка', items: [] };
        workouts.push(current);
        continue;
      }
      const d = dateFromLine(line);
      if (d) {
        const rest = line.replace(DATE_RE, '').replace(DATE_TEXT_RE, '').replace(/^(дата|date)[:\s]*/i, '').replace(/^[—–-]\s*/, '').trim();
        current = { date: d, name: rest || 'Тренировка', items: [] };
        workouts.push(current);
        continue;
      }
    }
    SET_RE.lastIndex = 0;

    // CSV-строка с датой
    const csv = parseCSV(line);
    if (csv) {
      let w = workouts.find((x) => x.date === csv.dateIso);
      if (!w) {
        w = { date: csv.dateIso, name: 'Тренировка', items: [] };
        workouts.push(w);
      }
      const ex = matchExercise(csv.name);
      if (!ex) {
        problems.push(`Не найдено упражнение: «${csv.name}»`);
        continue;
      }
      w.items.push({ exerciseId: ex.id, sets: csv.sets });
      continue;
    }

    if (!current) {
      current = { date: isoDate(new Date()), name: 'Импорт', items: [] };
      workouts.push(current);
    }

    // строка: название упражнения + подходы
    const setList = parseSets(line);
    if (setList.length) {
      const namePart = line
        .replace(SET_RE, '')
        .replace(REPS_ONLY_RE, (m, g) => m.slice(0, m.indexOf(g)))
        .replace(/[—–\-:]+$/, '')
        .replace(/[,\s]+$/, '')
        .trim();
      const ex = matchExercise(namePart);
      if (ex) {
        current.items.push({ exerciseId: ex.id, sets: setList });
        continue;
      }
      if (namePart) {
        problems.push(`Не найдено упражнение: «${namePart}»`);
        unknown.push({ name: cleanExerciseName(namePart), sets: setList, date: current?.date });
      }
    } else {
      const ex = matchExercise(line);
      if (ex) {
        current.items.push({ exerciseId: ex.id, sets: [] });
        continue;
      }
    }
  }

  const measurements = parseMeasurements(text);

  return {
    unknown,
    workouts: workouts
      .map((w) => ({ ...w, items: w.items.filter((it) => it.sets.length) }))
      .filter((w) => w.items.length),
    measurements,
    problems,
  };
}

/** Превращает распознанное в полноценный объект state */
export function buildWorkouts(parsed) {
  const out = [];
  for (const w of parsed.workouts) {
    const startedAt = new Date(`${w.date}T19:00:00`).getTime();
    const items = w.items.map((it) => ({
      id: uid('it'),
      exerciseId: it.exerciseId,
      note: '',
      rest: null,
      targetSets: it.sets.length,
      targetReps: String(it.sets[0]?.reps || 8),
      sets: it.sets.map((s) => ({
        id: uid('s'),
        weight: s.weight,
        reps: s.reps,
        done: true,
        completedAt: startedAt,
      })),
    }));
    let volume = 0;
    for (const it of items) for (const s of it.sets) volume += s.weight * s.reps;
    const durationMin = Math.max(25, Math.min(120, 20 + items.length * 6));
    out.push({
      id: uid('w'),
      name: w.name || 'Тренировка',
      programId: null,
      dayIndex: null,
      date: w.date,
      startedAt,
      finishedAt: startedAt + durationMin * 60000,
      notes: '',
      items,
      imported: true,
    });
  }
  return out;
}

export function importWorkouts(list, { replace = false } = {}) {
  const existing = replace ? [] : state.workouts || [];
  // не дублируем одинаковые записи
  const key = (w) =>
    `${w.date}|${(w.items || []).map((i) => i.exerciseId + ':' + i.sets.map((s) => `${s.weight}x${s.reps}`).join(',')).join('|')}`;
  const have = new Set(existing.map(key));
  const fresh = list.filter((w) => !have.has(key(w)));
  state.workouts = [...existing, ...fresh].sort((a, b) => b.startedAt - a.startedAt);
  save({ immediate: true });
  return fresh.length;
}

/** Создаёт свои упражнения для незнакомых названий и добавляет подходы в тренировки */
export function adoptUnknown(parsed) {
  if (!parsed?.unknown?.length) return 0;
  let created = 0;
  for (const u of parsed.unknown) {
    let ex = matchExercise(u.name);
    if (!ex) {
      const guessGroup = /присед|выпад|ног|ягод/i.test(u.name)
        ? 'legs'
        : /жим|груд|развед/i.test(u.name)
          ? 'chest'
          : /тяга|спин|подтяг/i.test(u.name)
            ? 'back'
            : /бицепс|трицепс|рук/i.test(u.name)
              ? 'arms'
              : /плеч|дельт|мах/i.test(u.name)
                ? 'shoulders'
                : /пресс|планк|скруч|живот/i.test(u.name)
                  ? 'core'
                  : 'other';
      ex = {
        id: 'c-' + uid('x'),
        name: u.name,
        group: guessGroup,
        eq: 'other',
        level: 1,
        compound: false,
        cues: ['Своё упражнение, добавлено при импорте истории.'],
        alts: [],
        time: false,
        dist: false,
        custom: true,
      };
      state.customExercises = [...(state.customExercises || []), ex];
      created++;
    }
    const w = (parsed.workouts || []).find((x) => x.date === u.date);
    if (w) w.items.push({ exerciseId: ex.id, sets: u.sets });
  }
  if (created) save({ immediate: true });
  parsed.unknown = [];
  parsed.problems = (parsed.problems || []).filter((p) => !p.startsWith('Не найдено упражнение'));
  return created;
}

/** Добавляет замеры (вес/обхваты), по одной записи на дату */
export function importMeasurements(measures, dateIso = isoDate(new Date())) {
  if (!measures || !Object.keys(measures).length) return 0;
  const clean = {};
  for (const [k, v] of Object.entries(measures)) {
    const n = num(v);
    if (n > 0 && n < 1000) clean[k] = n;
  }
  if (!Object.keys(clean).length) return 0;
  const list = state.measurements || [];
  const existing = list.find((m) => m.date === dateIso);
  if (existing) Object.assign(existing, clean, { updatedAt: Date.now() });
  else list.push({ id: uid('m'), date: dateIso, ...clean, createdAt: Date.now() });
  state.measurements = list.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (clean.weight) state.settings.weight = clean.weight;
  save({ immediate: true });
  return 1;
}

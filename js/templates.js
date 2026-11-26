/* ============================================================
   Готовые программы тренировок (аналоги платных в Fitness Online,
   но у нас бесплатно и редактируемо)
   ============================================================ */

import { baseExercises } from './exercises.js';

export const GOALS = {
  mass: { label: 'Масса', icon: 'trend-up' },
  strength: { label: 'Сила', icon: 'bolt' },
  fatloss: { label: 'Похудение', icon: 'flame' },
  tone: { label: 'Тонус', icon: 'sparkles' },
  health: { label: 'Здоровье', icon: 'heart' },
};

export const LEVEL_LABEL = { 1: 'Новичок', 2: 'Средний', 3: 'Продвинутый' };

/** Сколько упражнений в программе */
export function programExerciseCount(p) {
  return p.days.reduce((acc, d) => acc + d.items.length, 0);
}

/** Короткая строка для карточки: «3 дня · 18 упражнений · 6 недель» */
export function programMeta(p) {
  const n = programExerciseCount(p);
  return `${p.days.length} ${p.days.length === 1 ? 'день' : p.days.length < 5 ? 'дня' : 'дней'} · ${n} упр. · ${p.weeks} нед.`;
}

const s = (id, sets = 3, reps = '8-12', rest = 90, opts = {}) => ({
  id,
  sets,
  reps,
  rest,
  ...opts,
});

/* ---------- Пресеты ---------- */
const PRESET_RAW = [
  {
    id: 'start-fullbody',
    name: 'Старт: всё тело 3×/нед',
    goal: 'health',
    level: 1,
    weeks: 6,
    color: '#c6f24a',
    icon: 'sparkles',
    tagline: 'Первая программа для зала',
    description:
      'Базовая программа на всё тело: закладывает технику и привычку тренироваться. Каждая тренировка ~50 минут, отдых 60–90 секунд.',
    tips: ['Не гонитесь за весом первые 2 недели — техника важнее.', 'Между тренировками минимум 1 день отдыха.', 'Если успеваете 12 повторений легко — добавляйте 2,5 кг.'],
    days: [
      {
        name: 'День A',
        focus: 'Всё тело',
        items: [s('squat', 3, '8-10', 120), s('bench-press', 3, '8-10', 120), s('lat-pulldown', 3, '10-12'), s('db-shoulder-press', 3, '10-12', 75), s('leg-curl', 3, '12-15', 75), s('plank', 3, '30-45', 60, { note: 'секунд' })],
      },
      {
        name: 'День B',
        focus: 'Всё тело',
        items: [s('rdl', 3, '10', 120), s('bench-db', 3, '10-12'), s('seated-row', 3, '10-12'), s('leg-press', 3, '12-15', 90), s('lateral-raise', 3, '12-15', 60), s('hammer-curl', 2, '12-15', 60)],
      },
      {
        name: 'День C',
        focus: 'Всё тело',
        items: [s('hip-thrust', 3, '10-12', 120), s('incline-db-press', 3, '10-12'), s('db-row', 3, '10-12'), s('goblet-squat', 3, '12', 90), s('face-pull', 3, '15-20', 60), s('crunch', 3, '15-20', 45)],
      },
    ],
  },
  {
    id: 'newbie-split',
    name: 'Новичок: грудь · спина · ноги',
    goal: 'mass',
    level: 1,
    weeks: 8,
    color: '#5b9dff',
    icon: 'layers',
    tagline: 'Классический трёхдневный сплит',
    description:
      'Самая понятная схема для первых месяцев: день груди, день спины, день ног и плеч. Много базовых движений и немного изоляции.',
    tips: ['Отдых между подходами 90–120 секунд на базовых.', 'Добавляйте вес, когда выполняете верх диапазона во всех подходах.', 'Пресс можно добавить в конец любой тренировки.'],
    days: [
      {
        name: 'Грудь + трицепс',
        focus: 'Грудь',
        items: [s('bench-press', 4, '8-10', 120), s('incline-db-press', 3, '10-12'), s('db-fly', 3, '12-15', 60), s('dips', 3, '8-12', 90), s('pushdown', 3, '12-15', 60)],
      },
      {
        name: 'Спина + бицепс',
        focus: 'Спина',
        items: [s('lat-pulldown', 4, '10-12'), s('bent-row', 4, '8-10', 120), s('seated-row', 3, '10-12'), s('face-pull', 3, '15-20', 60), s('curl', 3, '10-12', 60)],
      },
      {
        name: 'Ноги + плечи',
        focus: 'Ноги',
        items: [s('squat', 4, '8-10', 150), s('rdl', 3, '10', 120), s('leg-press', 3, '12-15', 90), s('lateral-raise', 3, '12-15', 60), s('calf-raise', 3, '15-20', 45)],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Верх / Низ 4 дня',
    goal: 'mass',
    level: 2,
    weeks: 8,
    color: '#a78bfa',
    icon: 'split',
    tagline: '4 тренировки в неделю — золотая середина',
    description:
      'Каждая группа мышц прорабатывается дважды в неделю — оптимальная частота для роста при 4 занятиях. Подходит, когда уже есть база.',
    tips: ['Верх A / Низ A — тяжёлые (6–8 повторов), Верх B / Низ B — объёмные (10–15).', 'Следите за прогрессией весов хотя бы раз в 2 недели.', 'Сон 7–9 часов влияет не меньше тренировок.'],
    days: [
      {
        name: 'Верх A (тяжёлый)',
        focus: 'Верх',
        items: [s('bench-press', 4, '6-8', 150), s('bent-row', 4, '6-8', 150), s('ohp', 3, '8-10', 120), s('lat-pulldown', 3, '8-10', 90), s('lateral-raise', 3, '12-15', 60), s('curl', 2, '10-12', 60)],
      },
      {
        name: 'Низ A (тяжёлый)',
        focus: 'Низ',
        items: [s('squat', 4, '6-8', 150), s('rdl', 3, '8-10', 150), s('leg-press', 3, '10-12', 90), s('leg-curl', 3, '10-12', 75), s('calf-raise', 4, '12-15', 45)],
      },
      {
        name: 'Верх B (объёмный)',
        focus: 'Верх',
        items: [s('incline-db-press', 4, '10-12'), s('seated-row', 4, '10-12'), s('db-shoulder-press', 3, '10-12', 75), s('cable-crossover', 3, '12-15', 60), s('rear-fly', 3, '15-20', 45), s('pushdown', 3, '12-15', 60)],
      },
      {
        name: 'Низ B (объёмный)',
        focus: 'Низ',
        items: [s('hip-thrust', 4, '10-12', 120), s('bulgarian-split', 3, '10-12', 90), s('leg-ext', 3, '12-15', 60), s('seated-leg-curl', 3, '12-15', 60), s('calf-raise-seated', 3, '15-20', 45)],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Жим · Тяга · Ноги (PPL)',
    goal: 'mass',
    level: 2,
    weeks: 8,
    color: '#fbbf24',
    icon: 'bolt',
    tagline: 'Самый популярный массонаборный сплит',
    description:
      'Три разных тренировки: жимовые, тяговые и ноги. Выполняется 3 дня в неделю с отдыхом между, или 6 дней для продвинутых.',
    tips: ['Начинайте с 3 дней в неделю (Пн/Ср/Пт).', 'Каждую неделю старайтесь добавить повтор или немного веса.', 'Не пропускайте день ног — он даёт самый большой гормональный отклик.'],
    days: [
      {
        name: 'Push — жимы',
        focus: 'Грудь',
        items: [s('bench-press', 4, '6-8', 150), s('ohp', 3, '8-10', 120), s('incline-db-press', 3, '10-12'), s('lateral-raise', 4, '12-15', 60), s('pushdown', 3, '12-15', 60), s('ab-wheel', 3, '10-12', 60)],
      },
      {
        name: 'Pull — тяги',
        focus: 'Спина',
        items: [s('pull-up', 3, '6-10', 120), s('bent-row', 4, '8-10', 120), s('seated-row', 3, '10-12'), s('face-pull', 3, '15-20', 45), s('hammer-curl', 3, '10-12', 60), s('shrug', 3, '12-15', 60)],
      },
      {
        name: 'Legs — ноги',
        focus: 'Ноги',
        items: [s('squat', 4, '6-8', 150), s('rdl', 3, '8-10', 150), s('leg-press', 4, '10-12', 90), s('leg-curl', 3, '12-15', 60), s('calf-raise', 4, '12-15', 45), s('hanging-knee-raise', 3, '12-15', 60)],
      },
    ],
  },
  {
    id: 'strength-5x5',
    name: 'Сила 5×5',
    goal: 'strength',
    level: 2,
    weeks: 10,
    color: '#ff6b6b',
    icon: 'trend-up',
    tagline: 'Простые движения, тяжёлые веса',
    description:
      'Работа на силу и плотность: 5 подходов по 5 повторений в базовых движениях. Прогрессия — линейная, по 1,25–2,5 кг при успешном выполнении.',
    tips: ['5×5 — это не разминка: первые 2 подхода делайте с 50–70% рабочего веса.', 'Если не удалось 5×5 — повторите вес на следующей тренировке.', 'Спите и ешьте достаточно, иначе прогресса не будет.'],
    days: [
      {
        name: 'Тренировка A',
        focus: 'Всё тело',
        items: [s('squat', 5, '5', 180), s('bench-press', 5, '5', 180), s('bent-row', 5, '5', 180), s('plank', 3, '45-60', 60)],
      },
      {
        name: 'Тренировка B',
        focus: 'Всё тело',
        items: [s('squat', 5, '5', 180), s('ohp', 5, '5', 180), s('rdl', 3, '5', 180), s('pull-up', 3, '6-10', 120)],
      },
      {
        name: 'Тренировка C',
        focus: 'Всё тело',
        items: [s('squat', 5, '5', 180), s('bench-press', 5, '5', 180), s('db-row', 4, '8-10', 120), s('hyperextension', 3, '12-15', 60)],
      },
    ],
  },
  {
    id: 'glutes',
    name: 'Ягодицы и бёдра',
    goal: 'tone',
    level: 1,
    weeks: 8,
    color: '#f472b6',
    icon: 'flame',
    tagline: 'Акцент на форму без «накачки ног»',
    description:
      'Программа для развития ягодичных и задней поверхности бедра. Упражнения подобраны так, чтобы работать над формой, не увеличивая сильно квадрицепс.',
    tips: ['Два дня с акцентом на мосты и отведения, один — общий.', 'Обязательно чувствуйте ягодицы в каждом повторе, иначе вес слишком большой.', 'Пятки ближе к тазу, чтобы включить ягодицы сильнее.'],
    days: [
      {
        name: 'Ягодицы A',
        focus: 'Ягодицы',
        items: [s('hip-thrust', 4, '10-12', 120), s('bulgarian-split', 3, '10-12', 90), s('cable-kickback', 3, '12-15', 60), s('hip-abduction', 3, '15-20', 45), s('glute-bridge', 3, '15-20', 45)],
      },
      {
        name: 'Ягодицы + задняя поверхность',
        focus: 'Ягодицы',
        items: [s('rdl', 4, '8-10', 120), s('step-up-glute', 3, '10-12', 90), s('seated-leg-curl', 3, '12-15', 60), s('cable-kickback', 3, '15', 45), s('side-plank', 2, '30-45', 45, { note: 'на каждую сторону' })],
      },
      {
        name: 'Общий день ног',
        focus: 'Ноги',
        items: [s('goblet-squat', 3, '12', 90), s('leg-press', 3, '12-15', 90), s('calf-raise', 4, '15-20', 45), s('hip-thrust', 3, '12-15', 90)],
      },
    ],
  },
  {
    id: 'aesthetic',
    name: 'Эстетика верха: грудь и руки',
    goal: 'tone',
    level: 2,
    weeks: 8,
    color: '#2dd4bf',
    icon: 'sparkles',
    tagline: 'Грудь, плечи, руки — без ног',
    description:
      'Если цель — визуальный верх тела: объёмная грудь, широкие плечи и руки. Ноги можно добавить своими упражнениями.',
    tips: ['Работайте в диапазоне 8–15 повторений с контролем.', 'В изоляции важнее ощущение мышцы, чем вес.', 'Добавьте 10 минут кардио в конце для рельефа.'],
    days: [
      {
        name: 'Грудь',
        focus: 'Грудь',
        items: [s('bench-press', 4, '8-10', 120), s('incline-db-press', 3, '10-12'), s('pec-deck', 3, '12-15', 60), s('cable-crossover', 3, '15-20', 45), s('push-up', 2, '12-20', 60)],
      },
      {
        name: 'Плечи + руки',
        focus: 'Плечи',
        items: [s('db-shoulder-press', 4, '8-12', 90), s('lateral-raise', 4, '12-15', 45), s('rear-fly', 3, '15-20', 45), s('curl', 3, '10-12', 60), s('pushdown', 3, '12-15', 60)],
      },
      {
        name: 'Руки + спина',
        focus: 'Руки',
        items: [s('seated-row', 3, '10-12'), s('pull-up', 3, '6-10', 120), s('hammer-curl', 3, '10-12', 60), s('french-press', 3, '10-12', 60), s('reverse-curl', 2, '12-15', 45)],
      },
    ],
  },
  {
    id: 'fatloss',
    name: 'Жиросжигание в зале',
    goal: 'fatloss',
    level: 1,
    weeks: 6,
    color: '#38bdf8',
    icon: 'flame',
    tagline: 'Круговой формат + кардио',
    description:
      'Сочетание силовых по кругу и кардио: выше пульс, больше калорий, но мышцы сохраняются. Отдых короткий — 30–45 секунд.',
    tips: ['Круг = все упражнения подряд на 1 подход, затем 2 минуты отдыха.', 'Техника важнее скорости: усталость не оправдывает кривую спину.', 'Дефицит калорий — главный фактор результата, тренировки поддерживают мышцы.'],
    days: [
      {
        name: 'Круг A',
        focus: 'Всё тело',
        items: [s('goblet-squat', 3, '12-15', 45), s('push-up', 3, '10-15', 45), s('db-row', 3, '10-12', 45), s('lunge', 3, '10-12', 45, { note: 'на каждую ногу' }), s('mountain-climber', 3, '30-40', 45, { note: 'секунд' }), s('plank', 3, '40-60', 45, { note: 'секунд' })],
      },
      {
        name: 'Кардио + кор',
        focus: 'Кардио',
        items: [s('walking-treadmill', 1, '20-30', 0, { note: 'минут', time: true }), s('russian-twist', 3, '20-30', 45), s('leg-raise', 3, '12-15', 45), s('dead-bug', 3, '10-12', 45)],
      },
      {
        name: 'Круг B',
        focus: 'Всё тело',
        items: [s('kb-swing', 3, '15-20', 45), s('hip-thrust', 3, '12-15', 60), s('bench-db', 3, '10-12', 60), s('lat-pulldown', 3, '12-15', 45), s('burpee', 3, '8-10', 60), s('jump-rope', 3, '60-90', 45, { note: 'секунд' })],
      },
    ],
  },
  {
    id: 'chest-biceps',
    name: 'Грудь + бицепс',
    goal: 'mass',
    level: 1,
    weeks: 8,
    color: '#ff6b6b',
    icon: 'layers',
    tagline: 'Ваш сплит: жимы и руки',
    description:
      'Программа по вашей тренировке: жим штанги, жимы и разведения гантелей на наклонной, сгибания на бицепс и пресс. Хорошо работает в паре с днём «Спина + трицепс».',
    tips: [
      'Начинайте с жима штанги — это главное движение дня.',
      'Разведения делайте лёгкими: вес уменьшается по подходам, чтобы держать технику.',
      'Когда 10 повторений в жиме даются легко — добавьте 2,5 кг.',
    ],
    days: [
      {
        name: 'Грудь + бицепс',
        focus: 'Грудь · Бицепс',
        items: [
          s('bench-press', 4, '8-10', 120, { note: 'разминка: пустой гриф, затем 50%' }),
          s('db-curl', 3, '10-12', 75, { note: 'поочерёдно, с разворотом кисти' }),
          s('db-shoulder-press', 3, '10-12', 90),
          s('incline-db-press', 3, '8-12', 90, { note: 'скамья 30°' }),
          s('db-fly', 3, '10-15', 60, { note: 'скамья 30°, вес уменьшать по подходам' }),
          s('crunch', 3, '15-20', 45, { note: 'секунд' }),
        ],
      },
    ],
  },
  {
    id: 'back-triceps',
    name: 'Спина + трицепс',
    goal: 'mass',
    level: 1,
    weeks: 8,
    color: '#5b9dff',
    icon: 'layers',
    tagline: 'Ваш сплит: тяги и трицепс',
    description:
      'Программа по вашей тренировке: становая, подтягивания, брусья, горизонтальная тяга, разгибания на трицепс, пресс и планка. Дополняет день «Грудь + бицепс».',
    tips: [
      'Становая — первым движением, пока есть силы.',
      'Если подтягивания пока тяжело — используйте гравитрон или резинку.',
      'Планку держите в конце: 1–2 подхода по 45–60 секунд достаточно.',
    ],
    days: [
      {
        name: 'Спина + трицепс',
        focus: 'Спина · Трицепс',
        items: [
          s('rdl', 4, '8-10', 150, { note: 'спина прямая, гриф близко' }),
          s('pull-up', 3, '6-10', 120),
          s('dips', 3, '8-10', 90),
          s('seated-row', 3, '10-15', 90),
          s('pushdown', 3, '10-12', 60),
          s('hanging-knee-raise', 3, '10-12', 60),
          s('plank', 2, '45-60', 45, { note: 'секунд' }),
        ],
      },
    ],
  },
];

/* ---------- нормализация и валидация ---------- */
export function normalizeProgram(p) {
  const known = new Set(baseExercises().map((e) => e.id));
  const days = (p.days || []).map((d, i) => ({
    id: d.id || 'd' + i,
    name: d.name || `День ${i + 1}`,
    focus: d.focus || '',
    items: (d.items || [])
      .filter((it) => !it.exerciseId || known.has(it.exerciseId) || true)
      .map((it) => ({
        id: it.id || it.exerciseId,
        exerciseId: it.exerciseId || it.id,
        sets: Math.max(1, Number(it.sets) || 3),
        reps: String(it.reps || '8-12'),
        rest: Number.isFinite(Number(it.rest)) ? Number(it.rest) : 90,
        note: it.note || '',
        time: !!it.time,
      })),
  }));
  return {
    id: p.id,
    name: p.name,
    goal: p.goal || 'mass',
    level: p.level || 1,
    weeks: p.weeks || 8,
    color: p.color || '#c6f24a',
    icon: p.icon || 'layers',
    tagline: p.tagline || '',
    description: p.description || '',
    tips: p.tips || [],
    days,
    preset: !!p.preset,
    createdAt: p.createdAt || Date.now(),
  };
}

export function presetPrograms() {
  return PRESET_RAW.map((p) => normalizeProgram({ ...p, preset: true }));
}

export const DAY_SUGGESTIONS = ['Пн', 'Ср', 'Пт'];

/* ============================================================
   Мышцы: точная привязка упражнений и видов спорта
   ============================================================ */

export const MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'glutes', 'quads', 'hamstrings', 'calves',
];

export const MUSCLE_LABEL = {
  chest: 'Грудь',
  back: 'Спина',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  core: 'Пресс',
  glutes: 'Ягодицы',
  quads: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  calves: 'Голень',
};

/* упражнение → мышцы с весами */
const M = {
  // грудь
  'bench-press': { chest: 1, triceps: 0.35, shoulders: 0.25 },
  'incline-bench': { chest: 1, shoulders: 0.45, triceps: 0.25 },
  'incline-db-press': { chest: 1, shoulders: 0.4, triceps: 0.25 },
  'bench-db': { chest: 1, triceps: 0.3, shoulders: 0.2 },
  'machine-press': { chest: 1, triceps: 0.3 },
  'db-fly': { chest: 1 },
  'cable-crossover': { chest: 1 },
  'pec-deck': { chest: 1 },
  'push-up': { chest: 0.9, triceps: 0.4, shoulders: 0.2, core: 0.2 },
  pullover: { chest: 0.6, back: 0.4 },
  // спина
  'pull-up': { back: 1, biceps: 0.45, forearms: 0.2 },
  'chin-up': { back: 0.9, biceps: 0.55, forearms: 0.2 },
  'assisted-pullup': { back: 0.9, biceps: 0.4 },
  'lat-pulldown': { back: 1, biceps: 0.35 },
  'straight-arm-pulldown': { back: 1 },
  'bent-row': { back: 1, biceps: 0.35, core: 0.2 },
  'tbar-row': { back: 1, biceps: 0.3 },
  'db-row': { back: 1, biceps: 0.3 },
  'seated-row': { back: 1, biceps: 0.3 },
  'machine-row': { back: 1, biceps: 0.3 },
  'lat-pullover': { back: 1 },
  hyperextension: { back: 0.7, glutes: 0.5, hamstrings: 0.4 },
  'back-extension': { back: 0.7, glutes: 0.4, hamstrings: 0.3 },
  shrug: { back: 1, shoulders: 0.3 },
  'shrug-barbell': { back: 1, shoulders: 0.3 },
  'face-pull': { shoulders: 0.7, back: 0.5 },
  // плечи
  ohp: { shoulders: 1, triceps: 0.4, core: 0.2 },
  'db-shoulder-press': { shoulders: 1, triceps: 0.35 },
  'arnold-press': { shoulders: 1, triceps: 0.3 },
  'lateral-raise': { shoulders: 1 },
  'cable-lateral': { shoulders: 1 },
  'lateral-machine': { shoulders: 1 },
  'front-raise': { shoulders: 1 },
  'upright-row': { shoulders: 0.9, back: 0.3 },
  'rear-fly': { shoulders: 0.8, back: 0.4 },
  'pec-deck-reverse': { shoulders: 0.8, back: 0.4 },
  // руки
  curl: { biceps: 1, forearms: 0.2 },
  'db-curl': { biceps: 1, forearms: 0.2 },
  'hammer-curl': { biceps: 0.7, forearms: 0.6 },
  'cable-curl': { biceps: 1 },
  'preacher-curl': { biceps: 1 },
  'concentration-curl': { biceps: 1 },
  pushdown: { triceps: 1 },
  'french-press': { triceps: 1 },
  'skull-crusher': { triceps: 1 },
  dips: { triceps: 0.9, chest: 0.6, shoulders: 0.2 },
  'wrist-curl': { forearms: 1 },
  'reverse-curl': { forearms: 0.8, biceps: 0.4 },
  // пресс
  plank: { core: 1 },
  'side-plank': { core: 1 },
  crunch: { core: 1 },
  'cable-crunch': { core: 1 },
  'hanging-knee-raise': { core: 1, forearms: 0.2 },
  'leg-raise': { core: 1 },
  'russian-twist': { core: 1 },
  'dead-bug': { core: 1 },
  'pallof-press': { core: 1 },
  'ab-wheel': { core: 1 },
  // ноги
  squat: { quads: 1, glutes: 0.5, hamstrings: 0.3, core: 0.3 },
  'front-squat': { quads: 1, glutes: 0.4, core: 0.3 },
  'hack-squat': { quads: 1, glutes: 0.4 },
  'leg-press': { quads: 1, glutes: 0.4, hamstrings: 0.2 },
  'bulgarian-split': { quads: 0.9, glutes: 0.6, hamstrings: 0.3 },
  lunge: { quads: 0.9, glutes: 0.6, hamstrings: 0.3 },
  'goblet-squat': { quads: 1, glutes: 0.4, core: 0.3 },
  rdl: { hamstrings: 1, glutes: 0.7, back: 0.4 },
  'stiff-leg-deadlift': { hamstrings: 1, glutes: 0.6, back: 0.4 },
  'good-morning': { hamstrings: 0.9, back: 0.4, glutes: 0.5 },
  'leg-ext': { quads: 1 },
  'leg-curl': { hamstrings: 1 },
  'seated-leg-curl': { hamstrings: 1 },
  'calf-raise': { calves: 1 },
  'calf-raise-seated': { calves: 1 },
  'calf-raise-barbell': { calves: 1 },
  'step-up': { quads: 0.8, glutes: 0.6 },
  // ягодицы
  'hip-thrust': { glutes: 1, hamstrings: 0.4 },
  'glute-bridge': { glutes: 1, hamstrings: 0.3 },
  'cable-kickback': { glutes: 1 },
  'hip-abduction': { glutes: 1 },
  'sumo-deadlift': { glutes: 0.8, quads: 0.6, hamstrings: 0.5, back: 0.3 },
  'step-up-glute': { glutes: 0.8, quads: 0.6 },
  // кардио
  treadmill: { quads: 0.5, hamstrings: 0.3, calves: 0.5, core: 0.2 },
  'walking-treadmill': { quads: 0.4, calves: 0.5, glutes: 0.3 },
  bike: { quads: 0.8, hamstrings: 0.3, calves: 0.4 },
  rower: { back: 0.6, quads: 0.5, core: 0.4, biceps: 0.3 },
  elliptical: { quads: 0.5, glutes: 0.3, calves: 0.4 },
  'jump-rope': { calves: 0.9, quads: 0.4, core: 0.3 },
  burpee: { chest: 0.4, triceps: 0.4, quads: 0.5, core: 0.5, calves: 0.4 },
  'mountain-climber': { core: 0.8, quads: 0.4, shoulders: 0.3 },
  'kb-swing': { glutes: 0.8, hamstrings: 0.6, back: 0.4, core: 0.4 },
  'farmer-walk': { forearms: 1, core: 0.6, back: 0.4, calves: 0.3 },
  sprint: { quads: 0.8, hamstrings: 0.6, calves: 0.7, core: 0.3 },
};

/* виды спорта → мышцы */
const SPORT_M = {
  'sport-football': { quads: 0.9, hamstrings: 0.7, calves: 0.8, glutes: 0.5, core: 0.4 },
  'sport-volleyball': { shoulders: 0.8, triceps: 0.4, quads: 0.6, calves: 0.7, core: 0.5 },
  'sport-basketball': { quads: 0.8, calves: 0.8, glutes: 0.5, shoulders: 0.5, core: 0.4 },
  'sport-tennis': { forearms: 0.9, biceps: 0.4, shoulders: 0.7, core: 0.6, quads: 0.5 },
  'sport-table-tennis': { forearms: 0.7, shoulders: 0.4, core: 0.4 },
  'sport-badminton': { shoulders: 0.7, triceps: 0.4, quads: 0.5, calves: 0.5, core: 0.4 },
  'sport-hockey': { quads: 0.8, glutes: 0.6, back: 0.5, core: 0.5, forearms: 0.4 },
  'sport-swimming': { back: 0.8, shoulders: 0.9, triceps: 0.5, core: 0.5, quads: 0.3 },
  'sport-running': { quads: 0.9, hamstrings: 0.6, calves: 0.8, glutes: 0.4 },
  'sport-cycling': { quads: 0.9, glutes: 0.5, hamstrings: 0.4, calves: 0.5 },
  'sport-skiing': { quads: 0.8, glutes: 0.5, core: 0.6, calves: 0.5 },
  'sport-martial': { shoulders: 0.6, triceps: 0.5, core: 0.8, quads: 0.5, forearms: 0.5 },
  'sport-gym-dance': { quads: 0.6, core: 0.6, glutes: 0.4, calves: 0.4 },
  'sport-hiking': { quads: 0.8, glutes: 0.4, hamstrings: 0.4, calves: 0.8 },
  'sport-yoga': { core: 0.6, back: 0.5, quads: 0.4, shoulders: 0.4 },
  'sport-other': { quads: 0.4, core: 0.5, back: 0.4 },
};

export function exerciseMuscles(ex) {
  if (!ex) return {};
  if (ex.sport) return SPORT_M[ex.id] || SPORT_M['sport-other'];
  return M[ex.id] || fallbackByGroup(ex);
}

function fallbackByGroup(ex) {
  const g = ex.group;
  if (g === 'chest') return { chest: 1 };
  if (g === 'back') return { back: 1 };
  if (g === 'shoulders') return { shoulders: 1 };
  if (g === 'arms') return { biceps: 0.5, triceps: 0.5 };
  if (g === 'core') return { core: 1 };
  if (g === 'glutes') return { glutes: 1 };
  if (g === 'legs') return { quads: 0.6, hamstrings: 0.4 };
  if (g === 'cardio') return { quads: 0.5, calves: 0.4, core: 0.3 };
  return { core: 1 };
}

/* ---------- отрисовка: зона маски → мышца в зависимости от ракурса ---------- */
const FRONT_ANGLES = new Set([0, 45, 315]);
const BACK_ANGLES = new Set([135, 180, 225]);

export const ZONES = [
  'chest', 'back', 'shoulders', 'arms_up', 'arms_lo',
  'core', 'glutes', 'legs_up', 'legs_lo',
];

/** какая мышца показывается зоной в данном ракурсе */
export function zoneMuscle(zone, angle) {
  const front = FRONT_ANGLES.has(angle);
  const back = BACK_ANGLES.has(angle);
  switch (zone) {
    case 'arms_up':
      if (front) return 'biceps';
      if (back) return 'triceps';
      return null; // сбоку — по max
    case 'arms_lo':
      return 'forearms';
    case 'legs_up':
      if (front) return 'quads';
      if (back) return 'hamstrings';
      return null;
    case 'legs_lo':
      return 'calves';
    case 'chest':
      return 'chest';
    case 'back':
      return 'back';
    case 'shoulders':
      return 'shoulders';
    case 'core':
      return 'core';
    case 'glutes':
      return 'glutes';
    default:
      return null;
  }
}

/** значение для зоны: для боковых ракурсов — максимум из пары мышц */
export function zoneValue(zone, angle, pct) {
  const direct = zoneMuscle(zone, angle);
  if (direct) return pct[direct] || 0;
  if (zone === 'arms_up') return Math.max(pct.biceps || 0, pct.triceps || 0);
  if (zone === 'legs_up') return Math.max(pct.quads || 0, pct.hamstrings || 0);
  return 0;
}

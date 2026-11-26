/* ============================================================
   Спорт: футбол, волейбол, теннис и т.д.
   Каждый вид спорта даёт нагрузку на группы мышц для аналитики.
   ============================================================ */

/* load — распределение нагрузки по группам (0–1), сумма не обязана быть 1 */
export const SPORTS = [
  { id: 'sport-football', name: 'Футбол', load: { legs: 1.0, glutes: 0.5, core: 0.6, cardio: 1.0, back: 0.2 }, dist: true, time: true },
  { id: 'sport-volleyball', name: 'Волейбол', load: { shoulders: 0.8, legs: 0.7, core: 0.6, arms: 0.5, cardio: 0.8 }, dist: false, time: true },
  { id: 'sport-basketball', name: 'Баскетбол', load: { legs: 0.9, glutes: 0.6, shoulders: 0.6, core: 0.5, cardio: 0.9 }, dist: false, time: true },
  { id: 'sport-tennis', name: 'Теннис', load: { arms: 0.9, shoulders: 0.8, core: 0.7, legs: 0.6, cardio: 0.7 }, dist: false, time: true },
  { id: 'sport-table-tennis', name: 'Настольный теннис', load: { arms: 0.6, shoulders: 0.5, core: 0.4, cardio: 0.4 }, dist: false, time: true },
  { id: 'sport-badminton', name: 'Бадминтон', load: { arms: 0.7, shoulders: 0.7, legs: 0.6, core: 0.5, cardio: 0.8 }, dist: false, time: true },
  { id: 'sport-hockey', name: 'Хоккей', load: { legs: 0.9, glutes: 0.7, back: 0.6, core: 0.6, cardio: 1.0 }, dist: false, time: true },
  { id: 'sport-swimming', name: 'Плавание', load: { back: 0.8, shoulders: 0.9, core: 0.6, arms: 0.6, cardio: 0.9 }, dist: true, time: true },
  { id: 'sport-running', name: 'Бег на улице', load: { legs: 1.0, glutes: 0.6, core: 0.4, cardio: 1.0 }, dist: true, time: true },
  { id: 'sport-cycling', name: 'Велосипед', load: { legs: 0.9, glutes: 0.6, cardio: 0.9 }, dist: true, time: true },
  { id: 'sport-skiing', name: 'Лыжи / сноуборд', load: { legs: 0.8, glutes: 0.5, core: 0.6, cardio: 0.8 }, dist: false, time: true },
  { id: 'sport-martial', name: 'Единоборства', load: { shoulders: 0.7, arms: 0.6, core: 0.8, legs: 0.6, cardio: 0.9 }, dist: false, time: true },
  { id: 'sport-gym-dance', name: 'Танцы / аэробика', load: { legs: 0.7, core: 0.6, glutes: 0.4, cardio: 0.9 }, dist: false, time: true },
  { id: 'sport-hiking', name: 'Поход / ходьба', load: { legs: 0.9, glutes: 0.5, cardio: 0.7 }, dist: true, time: true },
  { id: 'sport-yoga', name: 'Йога / растяжка', load: { core: 0.6, back: 0.5, legs: 0.4, shoulders: 0.4 }, dist: false, time: true },
  { id: 'sport-other', name: 'Другой спорт', load: { legs: 0.5, core: 0.5, cardio: 0.5 }, dist: false, time: true },
];

export const SPORTS_BY_ID = new Map(SPORTS.map((s) => [s.id, s]));

export function isSport(ex) {
  if (!ex) return false;
  return ex.group === 'sport' || ex.id?.startsWith('sport-');
}

export function sportOf(ex) {
  if (!ex) return null;
  return SPORTS_BY_ID.get(ex.id) || null;
}

/** Эквивалент «подходов» для спорта: 1 подход ≈ 5 минут нагрузки */
export const MINUTES_PER_SET = 5;

export function sportScore(minutes) {
  return Math.max(0.5, minutes / MINUTES_PER_SET);
}

/* ============================================================
   Атлет — точка входа
   ============================================================ */
import { state, load, save, setSettings, subscribe } from './store.js';
import { uid, isoDate, num, haptic, escapeHtml, fmtDate, download } from './utils.js';
import {
  exerciseById, exerciseName, lastPerformance, workoutVolume, workoutSets, workoutDuration,
} from './analytics.js';
import { presetPrograms, normalizeProgram, programExerciseCount, GOALS } from './templates.js';
import { restTimer, applySettings } from './timer.js';
import {
  registerView, setRenderer, mountTabbar, initActions, go, refresh, ui, action, toast,
  sheet, confirmDialog, promptDialog, closeSheets, topSheet,
} from './ui.js';
import {
  activeSession, startSession, startEmpty, startFromProgramDay, completeSet, uncompleteSet,
  addSet, removeSet, updateSet, addExercise, removeItem, moveItem, replaceExercise, fillFromLast,
  finishSession, discardSession, repeatWorkout, syncTimerSettings,
} from './session.js';
import renderToday from './views/today.js';
import renderSessionView, { openRestSheet, itemMenu, requestFinish } from './views/session.js';
import renderPrograms, {
  renderProgramDetail, renderProgramEdit, createProgramFlow,
} from './views/programs.js';
import renderJournal, { renderWorkoutDetail } from './views/journal.js';
import renderProgress from './views/progress.js';
import renderProfile, {
  editProfileSheet, weeklyGoalSheet, restDefaultSheet, installHelpSheet, aboutSheet,
  doExport, doImport, doReset, themeSheet, applyTheme,
} from './views/profile.js';
import renderExercises, { renderExerciseDetail } from './views/exercises.js';
import { openExercisePicker, createCustomExercise } from './views/picker.js';
import { chooseGroup } from './views/group-picker.js';
import {
  openMeasureSheet, openMeasureHistory, openPhotoSheet, viewPhoto, viewAllPhotos,
} from './views/measure.js';
import { seedDemo } from './seed.js';

/* ---------- хранилище навигации ---------- */
const history = [];

function navigate(view, params = {}) {
  if (ui.view !== view) history.push({ view: ui.view, params: ui.params });
  go(view, params);
}

function back() {
  const prev = history.pop();
  if (prev) go(prev.view, prev.params);
  else go('today');
}

/* ---------- загрузка ---------- */
load();
applySettings(state.settings);
applyTheme();
if (!state.programs || !state.programs.length) {
  state.programs = presetPrograms().map((p) => normalizeProgram({ ...p, preset: true }));
  save({ immediate: true });
} else {
  // добавляем новые пресеты, если появились
  const have = new Set(state.programs.map((p) => p.id));
  const missing = presetPrograms().filter((p) => !have.has(p.id));
  if (missing.length) {
    state.programs = [...missing.map((p) => normalizeProgram({ ...p, preset: true })), ...state.programs];
    save({ immediate: true });
  }
}

/* ---------- тема/настройки ---------- */
subscribe((type) => {
  if (type === 'change') {
    applySettings(state.settings);
    applyTheme();
  }
});

/* ---------- рендер ---------- */
registerView('today', renderToday);
registerView('session', renderSessionView);
registerView('programs', renderPrograms);
registerView('program', renderProgramDetail);
registerView('program-edit', renderProgramEdit);
registerView('journal', renderJournal);
registerView('workout', renderWorkoutDetail);
registerView('progress', renderProgress);
registerView('profile', renderProfile);
registerView('exercises', renderExercises);
registerView('exercise', renderExerciseDetail);

let lastMountedView = null;

function paint() {
  if (ui.view === 'session' && !activeSession()) {
    ui.view = 'today';
    ui.sessionMode = false;
    document.getElementById('app').classList.remove('is-session');
  }
  const renderer = {
    today: renderToday,
    session: renderSessionView,
    programs: renderPrograms,
    program: renderProgramDetail,
    'program-edit': renderProgramEdit,
    journal: renderJournal,
    workout: renderWorkoutDetail,
    progress: renderProgress,
    profile: renderProfile,
    exercises: renderExercises,
    exercise: renderExerciseDetail,
  }[ui.view] || renderToday;
  const res = renderer(ui.params) || {};
  if (window.__DSH_DEBUG) console.log('[paint]', ui.view, 'renderer', renderer.name, 'res', res && typeof res, res?.html?.length);
  const app = document.getElementById('app');
  app.innerHTML = res.html || '';
  if (!app.innerHTML && ui.view) {
    console.error('[paint] пустой HTML для экрана', ui.view, ui.params);
    app.innerHTML = `<div class="pad" style="padding-top:40px"><div class="card card--pad"><div class="h3">Не удалось открыть экран</div><div class="muted" style="margin-top:6px">Проверьте консоль. Экран: ${ui.view}</div></div></div>`;
  }
  try {
    res.mount?.();
  } catch (e) {
    console.error('mount', e);
  }
  lastMountedView = ui.view;
  window.scrollTo({ top: 0 });
}

setRenderer(paint);

/* ---------- tabbar ---------- */
mountTabbar((kind) => {
  if (kind === 'session') {
    if (activeSession()) navigate('session');
  }
});

// повторная отрисовка при смене страницы
const _go = go;
window.addEventListener('hashchange', () => {});

/* ============================================================
   Действия
   ============================================================ */
initActions();

/* навигация */
action('go', (el) => navigate(el.dataset.view, {}));
action('go-back', () => back());
action('open-session', () => {
  if (activeSession()) navigate('session');
  else toast('Активной тренировки нет', 'info');
});
action('open-program', (el) => navigate('program', { id: el.dataset.id }));
action('edit-program', (el) => navigate('program-edit', { id: el.dataset.id }));
action('open-workout', (el) => navigate('workout', { id: el.dataset.id }));
action('open-exercise', (el) => navigate('exercise', { id: el.dataset.id }));

/* таймер */
action('open-timer', () => openRestSheet(null));
action('open-rest', () => {
  const sheetEl = document.getElementById('rest-sheet');
  if (sheetEl) return;
  openRestSheet(null);
});
action('rest-toggle', () => {
  if (restTimer.running) restTimer.pause();
  else if (restTimer.remaining > 0) restTimer.resume();
  else restTimer.start(state.settings.restSec || 90);
});
action('rest-plus', () => restTimer.add(15));
action('rest-minus', () => restTimer.add(-15));
action('skip-rest', () => {
  restTimer.skip();
  const sh = document.getElementById('rest-sheet');
  if (sh) sh.remove();
});
action('rest-set', (el) => {
  const sec = Number(el.dataset.sec);
  if (restTimer.running) restTimer.start(sec);
  else restTimer.start(sec);
});

/* сессия */
action('start-blank', () => {
  if (activeSession()) {
    navigate('session');
    return;
  }
  startEmpty();
  syncTimerSettings();
  navigate('session');
});

action('start-program-day', (el) => {
  const program = (state.programs || []).find((p) => p.id === state.activeProgramId);
  if (!program) return;
  const day = program.days[Number(el.dataset.index)];
  if (!day) return;
  if (activeSession()) {
    navigate('session');
    return;
  }
  startFromProgramDay(program, day);
  navigate('session');
});

action('continue-program', () => {
  const program = (state.programs || []).find((p) => p.id === state.activeProgramId);
  if (!program) {
    toast('Сначала выберите программу', 'info');
    navigate('programs');
    return;
  }
  // ищем день, которого ещё не делали в этом цикле
  const done = (state.workouts || []).filter((w) => w.programId === program.id).length;
  const day = program.days[done % program.days.length];
  if (activeSession()) {
    navigate('session');
    return;
  }
  startFromProgramDay(program, day);
  navigate('session');
});

action('activate-program', (el) => {
  const p = (state.programs || []).find((x) => x.id === el.dataset.id);
  if (!p) return;
  state.activeProgramId = p.id;
  state.programStart = state.programStart || Date.now();
  save({ immediate: true });
  toast('Программа выбрана: ' + p.name);
  navigate('program', { id: p.id });
});

action('deactivate-program', async () => {
  const ok = await confirmDialog({ title: 'Завершить программу?', text: 'История сохранится, но следующая тренировка не будет подставляться.', ok: 'Завершить', danger: false });
  if (!ok) return;
  state.activeProgramId = null;
  save({ immediate: true });
  refresh();
});

action('start-day', (el) => {
  const p = (state.programs || []).find((x) => x.id === el.dataset.id);
  const day = p?.days[Number(el.dataset.index)];
  if (!p || !day) return;
  if (activeSession()) {
    toast('Сначала завершите текущую тренировку', 'danger');
    navigate('session');
    return;
  }
  startFromProgramDay(p, day);
  navigate('session');
});

action('change-program', () => navigate('programs'));

action('toggle-set', (el) => {
  const itemId = el.dataset.item;
  const setId = el.dataset.set;
  const s = activeSession();
  if (!s) return;
  const it = s.workout.items.find((x) => x.id === itemId);
  const set = it?.sets.find((x) => x.id === setId);
  if (!set) return;
  if (set.done) {
    uncompleteSet(itemId, setId);
    haptic();
    paint();
    return;
  }
  // если пусто — подставляем предыдущие значения
  if (!num(set.weight) && !num(set.reps)) {
    const last = lastPerformance(it.exerciseId);
    const idx = it.sets.indexOf(set);
    const prev = last?.sets?.[Math.min(idx, (last.sets?.length || 1) - 1)];
    if (prev) {
      updateSet(itemId, setId, { weight: num(prev.weight), reps: num(prev.reps) });
    } else if (!set.reps) {
      const ex = exerciseById(it.exerciseId);
      updateSet(itemId, setId, { reps: ex?.group === 'core' ? 30 : 10 });
    }
  }
  const res = completeSet(itemId, setId, { startRest: true });
  paint();
  if (res?.restStarted) {
    // даём DOM обновиться
    requestAnimationFrame(() => openRestSheet(null));
  } else if (res?.nextItem) {
    toast('Упражнение выполнено 💪');
  }
});

action('add-set', (el) => {
  addSet(el.dataset.item);
  paint();
});
action('fill-last', (el) => {
  const ok = fillFromLast(el.dataset.item);
  if (ok === false) toast('Нет прошлых данных', 'info');
  else toast('Подходы скопированы');
  paint();
});
action('add-exercise', () => {
  openExercisePicker({
    title: 'Добавить упражнение',
    onPick: (ex) => {
      if (!activeSession()) return;
      addExercise(ex.id);
      paint();
    },
  });
});
action('swap-exercise', (el) => {
  const itemId = el.dataset.item;
  const s = activeSession();
  const it = s?.workout.items.find((x) => x.id === itemId);
  if (!it) return;
  const ex = exerciseById(it.exerciseId);
  openExercisePicker({
    title: 'Заменить упражнение',
    sub: ex ? `${ex.name} →` : '',
    excludeIds: [it.exerciseId],
    onPick: (newEx) => {
      replaceExercise(itemId, newEx.id);
      toast('Заменено на «' + newEx.name + '»');
      paint();
    },
  });
});
action('item-menu', (el) => itemMenu(el.dataset.item));
action('item-move', (el) => {
  moveItem(el.dataset.item, Number(el.dataset.dir));
  closeSheets();
  paint();
});
action('item-remove', async (el) => {
  const ok = await confirmDialog({ title: 'Удалить упражнение?', text: 'Все отмеченные подходы в нём тоже удалятся.', ok: 'Удалить' });
  if (!ok) return;
  removeItem(el.dataset.item);
  paint();
});
action('toggle-collapse', (el) => {
  const s = activeSession();
  const it = s?.workout.items.find((x) => x.id === el.dataset.item);
  if (!it) return;
  it.collapsed = !it.collapsed;
  save();
  paint();
});
action('session-notes', async () => {
  const s = activeSession();
  if (!s) return;
  const v = await promptDialog({
    title: 'Заметка к тренировке',
    value: s.workout.notes || '',
    placeholder: 'Самочувствие, веса, что менять',
    multiline: true,
  });
  if (v === null) return;
  s.workout.notes = v;
  save({ immediate: true });
  paint();
});
action('session-date', () => {
  const s = activeSession();
  if (!s) return;
  const w = s.workout;
  const body = `<div class="dialog" style="padding:0">
    <p style="margin-top:0">Дата, которой запишется тренировка. Можно заполнить прошедшую тренировку.</p>
    <div class="field" style="margin-top:14px">
      <div class="field__label">Дата</div>
      <input class="input" type="date" data-field="d" value="${w.date || isoDate(new Date())}" max="${isoDate(new Date())}">
    </div>
    <div class="field" style="margin-top:10px">
      <div class="field__label">Название</div>
      <input class="input" data-field="n" value="${(w.name || '').replace(/"/g, '&quot;')}" maxlength="40">
    </div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn--soft" data-close>Отмена</button>
      <button class="btn btn--primary" data-save-date>Сохранить</button>
    </div>
  </div>`;
  const sh = sheet({ title: 'Дата тренировки', body });
  sh.el.querySelector('[data-save-date]').addEventListener('click', () => {
    const d = sh.el.querySelector('[data-field="d"]').value;
    const n = sh.el.querySelector('[data-field="n"]').value.trim();
    if (d) w.date = d;
    if (n) w.name = n;
    save({ immediate: true });
    sh.close('save');
    paint();
  });
});
action('finish-session', () => requestFinish());
action('leave-session', async () => {
  if (!activeSession()) {
    navigate('today');
    return;
  }
  const choice = await confirmDialog({
    title: 'Выйти из тренировки?',
    text: 'Тренировка сохранится как активная — вы сможете продолжить её с главного экрана.',
    ok: 'Выйти',
    cancel: 'Остаться',
    danger: false,
  });
  if (!choice) return;
  navigate('today');
});
action('close-summary', () => {
  closeSheets();
  navigate('today');
});
action('summary-details', (el) => {
  closeSheets();
  navigate('workout', { id: el.dataset.id });
});

/* экраны упражнений */
action('create-exercise', async () => {
  const ex = await createCustomExercise();
  if (ex) {
    paint();
  }
});

/* замеры и фото */
action('open-measure', () => openMeasureSheet());
action('measure-history', () => openMeasureHistory());
action('open-photo', () => openPhotoSheet());
action('view-photo', (el) => viewPhoto(el.dataset.id));
action('all-photos', () => viewAllPhotos());

/* профиль */
action('edit-profile', () => editProfileSheet());
action('weekly-goal', () => weeklyGoalSheet());
action('rest-default', () => restDefaultSheet());
action('toggle-auto-timer', () => {
  setSettings({ autoTimer: !state.settings.autoTimer });
  paint();
});
action('toggle-sound', () => {
  setSettings({ sound: !state.settings.sound });
  applySettings(state.settings);
  if (state.settings.sound) restTimer.beep(880, 0.12);
  paint();
});
action('toggle-vibrate', () => {
  setSettings({ vibrate: !state.settings.vibrate });
  applySettings(state.settings);
  if (state.settings.vibrate) haptic('heavy');
  paint();
});
action('toggle-notify', async () => {
  if (state.settings.notify) {
    setSettings({ notify: false });
    paint();
    return;
  }
  if (!('Notification' in window)) {
    toast('Уведомления недоступны в этом браузере', 'danger');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    setSettings({ notify: true });
    applySettings(state.settings);
    toast('Уведомления включены');
  } else {
    toast('Разрешение не выдано', 'danger');
  }
  paint();
});
action('toggle-keepawake', () => {
  setSettings({ keepAwake: !state.settings.keepAwake });
  applySettings(state.settings);
  if (state.settings.keepAwake) restTimer.requestWake();
  paint();
});
action('toggle-theme', () => themeSheet());
action('install-help', () => installHelpSheet());
action('about', () => aboutSheet());
action('export-data', () => doExport());
action('import-data', () => doImport());
action('reset-all', () => doReset());
action('seed-demo', async () => {
  const ok = await confirmDialog({
    title: 'Заполнить демо-данными?',
    text: 'Добавятся 10 недель тренировок, замеров и активная программа PPL. Ваши текущие записи сохранятся.',
    ok: 'Заполнить',
    cancel: 'Отмена',
    danger: false,
  });
  if (!ok) return;
  const n = seedDemo();
  toast(`Добавлено ${n} тренировок`);
  navigate('today');
});

/* программы: создание и редактор */
action('create-program', () => createProgramFlow());

action('add-day', () => {
  const p = (state.programs || []).find((x) => x.id === ui.params.id);
  if (!p) return;
  p.days.push({ id: 'd' + uid(), name: `День ${p.days.length + 1}`, focus: '', items: [] });
  save({ immediate: true });
  paint();
});
action('delete-day', async (el) => {
  const p = (state.programs || []).find((x) => x.id === ui.params.id);
  const idx = Number(el.dataset.index);
  if (!p || p.days.length <= 1) {
    toast('Должен остаться хотя бы один день', 'danger');
    return;
  }
  const ok = await confirmDialog({ title: 'Удалить день?', text: p.days[idx]?.name, ok: 'Удалить' });
  if (!ok) return;
  p.days.splice(idx, 1);
  save({ immediate: true });
  paint();
});
action('add-day-item', (el) => {
  const p = (state.programs || []).find((x) => x.id === ui.params.id);
  const di = Number(el.dataset.index);
  if (!p) return;
  openExercisePicker({
    title: 'Добавить в ' + p.days[di].name,
    onPick: (ex) => {
      p.days[di].items.push({
        id: uid('it'),
        exerciseId: ex.id,
        sets: 3,
        reps: '8-12',
        rest: 90,
        note: '',
      });
      save({ immediate: true });
      paint();
    },
  });
});
action('remove-day-item', (el) => {
  const p = (state.programs || []).find((x) => x.id === ui.params.id);
  const di = Number(el.dataset.di);
  const ii = Number(el.dataset.ii);
  if (!p) return;
  p.days[di].items.splice(ii, 1);
  save({ immediate: true });
  paint();
});
action('save-program', (el) => {
  const p = (state.programs || []).find((x) => x.id === el.dataset.id);
  if (!p) return;
  const norm = normalizeProgram(p);
  p.name = norm.name || 'Без названия';
  p.days = norm.days.filter((d) => d.items.length);
  if (!p.days.length) {
    toast('Добавьте хотя бы одно упражнение', 'danger');
    return;
  }
  save({ immediate: true });
  toast('Программа сохранена');
  history.length = 0;
  navigate('program', { id: p.id });
});
action('delete-program', async (el) => {
  const p = (state.programs || []).find((x) => x.id === el.dataset.id);
  if (!p) return;
  const ok = await confirmDialog({ title: 'Удалить программу?', text: 'История тренировок останется, но программа исчезнет из списка.', ok: 'Удалить' });
  if (!ok) return;
  state.programs = (state.programs || []).filter((x) => x.id !== p.id);
  if (state.activeProgramId === p.id) state.activeProgramId = null;
  save({ immediate: true });
  history.length = 0;
  navigate('programs');
  toast('Программа удалена');
});

/* общее */
action('share-workout', async (el) => {
  const w = (state.workouts || []).find((x) => x.id === el.dataset.id);
  if (!w) return;
  const text = shareText(w);
  if (navigator.share) {
    try {
      await navigator.share({ title: w.name, text });
      return;
    } catch {}
  }
  await navigator.clipboard?.writeText(text).catch(() => {});
  toast('Текст скопирован');
});
action('share-program', async (el) => {
  const p = (state.programs || []).find((x) => x.id === el.dataset.id);
  if (!p) return;
  const text = programText(p);
  if (navigator.share) {
    try {
      await navigator.share({ title: p.name, text });
      return;
    } catch {}
  }
  await navigator.clipboard?.writeText(text).catch(() => {});
  toast('Скопировано');
});
action('repeat-workout', async (el) => {
  const w = (state.workouts || []).find((x) => x.id === el.dataset.id);
  if (!w) return;
  if (activeSession()) {
    const ok = await confirmDialog({ title: 'Уже есть активная тренировка', text: 'Начать новую с нуля? Текущая будет потеряна.', ok: 'Начать новую' });
    if (!ok) return;
    discardSession();
  }
  repeatWorkout(w);
  closeSheets();
  navigate('session');
  toast('Тренировка создана');
});
action('delete-workout', async (el) => {
  const ok = await confirmDialog({ title: 'Удалить тренировку?', text: 'Запись исчезнет из истории и аналитики.', ok: 'Удалить' });
  if (!ok) return;
  state.workouts = (state.workouts || []).filter((x) => x.id !== el.dataset.id);
  save({ immediate: true });
  history.length = 0;
  navigate('journal');
  toast('Удалено');
});

/* ---------- helpers ---------- */
function shareText(w) {
  const lines = [`${w.name} · ${fmtDate(w.date)}`, `Объём: ${Math.round(workoutVolume(w))} кг · ${workoutSets(w)} подходов`];
  const rows = [];
  for (const it of w.items || []) {
    const best = (it.sets || []).reduce((b, s) => (num(s.weight) > num(b?.weight) ? s : b), null);
    rows.push(`• ${exerciseName(it.exerciseId)}: ${(it.sets || []).map((s) => `${num(s.weight)}×${num(s.reps)}`).join(', ')}`);
  }
  return lines.concat(rows).join('\n');
}

function programText(p) {
  const out = [p.name, `${p.days.length} дня · ${programExerciseCount(p)} упражнений`];
  p.days.forEach((d, i) => {
    out.push('', `${i + 1}. ${d.name}${d.focus ? ' — ' + d.focus : ''}`);
    d.items.forEach((it) => out.push(`  • ${exerciseName(it.exerciseId)} — ${it.sets}×${it.reps}`));
  });
  return out.join('\n');
}

/* ============================================================
   Старт
   ============================================================ */
paint();

restTimer.restore();

// скрыть таймер при уходе
document.addEventListener('visibilitychange', () => {
  if (document.hidden) restTimer.save();
});

// service worker
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// hash-route (просто чтобы не терять состояние при перезагрузке)
window.addEventListener('popstate', () => {
  if (topSheet()) {
    topSheet().close('popstate');
    return;
  }
  back();
});

// защита от случайного закрытия во время тренировки
window.addEventListener('beforeunload', (e) => {
  if (activeSession()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// обновление «сегодня» после возврата
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && activeSession() && ui.view === 'session') paint();
});

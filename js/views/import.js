/* ============================================================
   Импорт истории: текст со скриншотов / CSV / замеры
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import { escapeHtml, num, isoDate, fmtDate, fmtVolume, plural, uid, parseDate, startOfDay } from '../utils.js';
import { sheet, toast, refresh, confirmDialog } from '../ui.js';
import { parseHistoryText, buildWorkouts, importWorkouts, importMeasurements, matchExercise, adoptUnknown } from '../importer.js';
import { workoutVolume, exerciseName, exerciseGroup } from '../analytics.js';

const MEASURE_LABELS = { weight: 'вес', waist: 'талия', chest: 'грудь', hips: 'бёдра', biceps: 'бицепс', neck: 'шея', thigh: 'бедро', calf: 'голень', bodyfat: 'жир %' };

export const IMPORT_EXAMPLE = `12.11.2026
Жим штанги лёжа 60x10, 65x8, 65x8
Тяга штанги в наклоне 50x10, 55x8, 55x8
Приседания со штангой 80x8, 80x8, 80x6

14.11.2026
Жим гантелей лёжа 24x12, 26x10, 26x10
Подтягивания 8, 7, 6

Вес: 82.5 кг
Талия: 87 см`;

const LABELS = { chest: 'Грудь', back: 'Спина', legs: 'Ноги', glutes: 'Ягодицы', shoulders: 'Плечи', arms: 'Руки', core: 'Пресс', cardio: 'Кардио', sport: 'Спорт' };
const GENERIC_NAME = /^(Тренировка|Импорт|Грудь \+ Руки|Ноги \+ Спина|Грудь \+ Спина|Ноги \+ Руки|Спина \+ Руки|Грудь \+ Плечи|Ноги \+ Ягодицы)$/;

/** Имя тренировки по двум самым нагруженным группам мышц */
export function workoutNameByGroups(w) {
  const sets = new Map();
  for (const it of w.items || []) {
    if (it.exerciseId && it.exerciseId.startsWith('sport-')) {
      sets.set('sport', (sets.get('sport') || 0) + 3);
      continue;
    }
    const g = exerciseGroup(it.exerciseId);
    const n = (it.sets || []).filter((x) => x.done).length || (it.sets || []).length;
    sets.set(g, (sets.get(g) || 0) + n);
  }
  const top = [...sets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => LABELS[g]).filter(Boolean);
  return top.join(' + ') || 'Тренировка';
}

/** Исправляет имена уже импортированных записей «Тренировка» → по группам мышц */
export function fixNoNameWorkouts() {
  const labels = { chest: 'Грудь', back: 'Спина', legs: 'Ноги', glutes: 'Ягодицы', shoulders: 'Плечи', arms: 'Руки', core: 'Пресс', cardio: 'Кардио', sport: 'Спорт' };
  let fixed = 0;
  for (const w of state.workouts || []) {
    if (!w.imported && w.name && !GENERIC_NAME.test(w.name)) continue;
    if (w.name && !GENERIC_NAME.test(w.name) && w.name !== 'Тренировка') continue;
    const name = workoutNameByGroups(w);
    if (name && name !== w.name) {
      w.name = name;
      fixed++;
    }
  }
  if (fixed) save({ immediate: true });
  return fixed;
}

export function openImporter() {
  const sh = sheet({
    title: 'Импорт истории',
    sub: 'Тренировки и замеры из другого приложения',
    body: `<div class="import">
      <div class="segmented" style="margin-bottom:14px">
        <button class="is-on" data-im-tab="text">Вставить текст</button>
        <button data-im-tab="file">Загрузить файл</button>
      </div>

      <div data-im-pane="text">
        <div class="hint-box" style="margin-bottom:10px">
          ${icon('info', 16)}
          <span>Можно вставить текст, переписанный со скриншотов, или CSV. Формат: дата, затем упражнение и подходы «вес×повторы».</span>
        </div>
        <textarea class="textarea" data-im-text rows="10" placeholder="${escapeHtml(IMPORT_EXAMPLE)}" spellcheck="false" style="min-height:220px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.55"></textarea>
        <button class="btn btn--ghost btn--sm btn--block" data-im-example style="margin-top:6px">Показать пример формата</button>
      </div>

      <div data-im-pane="file" class="hidden">
        <label class="photo-drop" for="im-file">
          <div class="empty__icon" style="margin:0 auto 8px">${icon('upload', 26)}</div>
          <div class="h3">Выбрать CSV или JSON</div>
          <div class="muted" style="margin-top:4px">CSV: дата;упражнение;подходы. JSON из других дневников.</div>
        </label>
        <input id="im-file" type="file" accept=".csv,.txt,.json,text/*,application/json" hidden>
        <div class="muted" style="margin-top:10px;font-size:12.5px" data-im-file-status></div>
      </div>

      <div data-im-preview style="margin-top:14px"></div>
    </div>`,
    foot: `<button class="btn btn--soft" data-close>Отмена</button><button class="btn btn--primary" data-im-run disabled>Импортировать</button>`,
  });

  let mode = 'text';
  let parsed = null;
  let fileList = null;
  const textEl = sh.el.querySelector('[data-im-text]');
  const previewEl = sh.el.querySelector('[data-im-preview]');
  const runBtn = sh.el.querySelector('[data-im-run]');
  const fileStatus = sh.el.querySelector('[data-im-file-status]');

  const renderPreview = () => {
    runBtn.disabled = true;
    let workouts = parsed ? buildWorkouts(parsed) : [];
    if (fileList) workouts = fileList;

    if (!workouts.length) {
      previewEl.innerHTML = parsed && parsed.problems.length
        ? `<div class="hint-box" style="border-color:rgba(255,182,72,.35)">${icon('alert', 16)}<span>Не удалось разобрать. Проверьте формат: ${escapeHtml(parsed.problems.slice(0, 3).join('; '))}</span></div>`
        : '';
      return;
    }

    const totalSets = workouts.reduce((a, w) => a + w.items.reduce((b, i) => b + i.sets.length, 0), 0);
    const volume = workouts.reduce((a, w) => a + workoutVolume(w), 0);
    const problems = parsed?.problems || [];
    const measures = parsed?.measurements || {};

    previewEl.innerHTML = `
      <div class="card card--pad" style="background:var(--surface-2)">
        <div class="tiny">РАСПОЗНАНО</div>
        <div class="row" style="gap:16px;margin-top:8px;flex-wrap:wrap">
          <div><div class="num" style="font-size:20px;font-weight:750">${workouts.length}</div><div class="tiny">${plural(workouts.length, 'тренировка', 'тренировки', 'тренировок')}</div></div>
          <div><div class="num" style="font-size:20px;font-weight:750">${totalSets}</div><div class="tiny">подходов</div></div>
          <div><div class="num" style="font-size:20px;font-weight:750">${fmtVolume(volume)}</div><div class="tiny">объём</div></div>
        </div>
        <div class="divider"></div>
        <div style="max-height:190px;overflow:auto">
          ${workouts
            .slice(0, 12)
            .map(
              (w) => `<div class="import-row">
                <span class="import-row__date">${fmtDate(w.date)}</span>
                <span class="grow ellipsis">${escapeHtml(w.items.map((i) => exerciseName(i.exerciseId)).join(', ').slice(0, 46))}</span>
                <span class="badge">${w.items.reduce((a, i) => a + i.sets.length, 0)}</span>
              </div>`
            )
            .join('')}
        </div>
        ${workouts.length > 12 ? `<div class="tiny" style="margin-top:6px">и ещё ${workouts.length - 12}…</div>` : ''}
        ${parsed?.unknown?.length ? `<div class="tiny" style="margin-top:8px;color:var(--info)">Незнакомые упражнения (${parsed.unknown.length}) будут созданы как свои: ${escapeHtml([...new Set(parsed.unknown.map((u) => u.name))].slice(0, 3).join(', '))}</div>` : ''}
        ${
          problems.length
            ? `<div class="tiny" style="margin-top:8px;color:var(--warn)">Пропущено: ${escapeHtml(problems.slice(0, 3).join('; '))}</div>`
            : ''
        }
      </div>
      ${Object.keys(measures).length ? `<div class="hint-box" style="margin-top:8px">${icon('ruler', 16)}<span>Замеры: ${Object.entries(measures).map(([k, v]) => MEASURE_LABELS[k] + ' ' + v).join(', ')}</span></div>` : ''}
      <label class="row" style="gap:8px;margin-top:10px;font-size:13px;color:var(--text-2)">
        <input type="checkbox" data-im-replace style="width:18px;height:18px;accent-color:var(--accent)"> Заменить историю (а не добавить)
      </label>`;
    runBtn.disabled = false;
  };

  textEl.addEventListener('input', () => {
    const text = textEl.value.trim();
    if (!text) {
      parsed = null;
      renderPreview();
      return;
    }
    parsed = parseHistoryText(text);
    renderPreview();
  });

  sh.el.querySelector('[data-im-example]').addEventListener('click', () => {
    textEl.value = IMPORT_EXAMPLE;
    textEl.dispatchEvent(new Event('input'));
    textEl.focus();
  });

  for (const b of sh.el.querySelectorAll('[data-im-tab]')) {
    b.addEventListener('click', () => {
      mode = b.dataset.imTab;
      for (const x of sh.el.querySelectorAll('[data-im-tab]')) x.classList.toggle('is-on', x === b);
      sh.el.querySelector('[data-im-pane="text"]').classList.toggle('hidden', mode !== 'text');
      sh.el.querySelector('[data-im-pane="file"]').classList.toggle('hidden', mode !== 'file');
    });
  }

  sh.el.querySelector('#im-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    fileStatus.textContent = `${file.name} · ${Math.round(file.size / 1024)} КБ`;
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          fileList = data.map(normalizeForeignWorkout).filter(Boolean);
        } else if (Array.isArray(data.workouts)) {
          fileList = data.workouts.map(normalizeForeignWorkout).filter(Boolean);
        } else {
          fileStatus.textContent = 'JSON не похож на историю тренировок';
        }
      } catch {
        fileStatus.textContent = 'Не удалось прочитать JSON';
      }
    } else {
      parsed = parseHistoryText(text);
      fileList = null;
    }
    renderPreview();
  });

  runBtn.addEventListener('click', async () => {
    let list = fileList;
    if (!list) {
      if (parsed?.unknown?.length) adoptUnknown(parsed);
      list = buildWorkouts(parsed);
    }
    // осмысленные названия: по самым нагруженным группам
    for (const w of list) {
      if (!w.name || GENERIC_NAME.test(w.name) || w.name === 'Импорт') {
        w.name = workoutNameByGroups(w);
      }
    }
    if (!list.length) return;
    const replaceEl = sh.el.querySelector('[data-im-replace]');
    const replace = !!replaceEl?.checked;
    if (replace) {
      const ok = await confirmDialog({
        title: 'Заменить историю?',
        text: 'Текущие тренировки будут удалены и заменены импортированными.',
        ok: 'Заменить',
      });
      if (!ok) return;
    }
    const n = importWorkouts(list, { replace });
    const ml = parsed?.measurements ? importMeasurements(parsed.measurements, parsed.workouts?.[0]?.date) : 0;
    sh.close('import');
    toast(`Импортировано тренировок: ${n}${ml ? ', замеры' : ''}`);
    refresh();
  });

  return sh;
}

/** Приводит чужой JSON к нашему виду (дата, упражнение, подходы) */
function normalizeForeignWorkout(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dateRaw = raw.date || raw.day || raw.startedAt || raw.created_at || raw.finishedAt;
  let dateIso = isoDate(new Date());
  if (typeof dateRaw === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) dateIso = dateRaw.slice(0, 10);
    else {
      const d = parseDate(dateRaw);
      if (d) dateIso = isoDate(d);
    }
  } else if (typeof dateRaw === 'number') {
    dateIso = isoDate(new Date(dateRaw));
  }

  let items = [];
  if (Array.isArray(raw.items)) items = raw.items;
  else if (Array.isArray(raw.exercises)) items = raw.exercises;
  else if (Array.isArray(raw.sets)) {
    // плоский формат: [{exercise, weight, reps}]
    items = [];
    for (const s of raw.sets) {
      const name = s.exercise || s.exerciseName || s.title;
      if (!name) continue;
      items.push({ name, sets: [{ weight: s.weight ?? s.kg, reps: s.reps ?? s.repeat }] });
    }
  }

  const out = [];
  for (const it of items) {
    const name = it.name || it.exercise || it.title || it.exerciseName;
    if (!name) continue;
    let ex = matchExercise(name);
    if (!ex) continue; // неизвестные добавляются отдельно
    const rawSets = it.sets || it.reps || it.performedSets || [];
    let sets = [];
    if (Array.isArray(rawSets)) {
      for (const s of rawSets) {
        if (typeof s === 'number') sets.push({ weight: 0, reps: s });
        else if (typeof s === 'string') {
          const m = s.match(/(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+)/i);
          if (m) sets.push({ weight: num(m[1]), reps: num(m[2]) });
          else {
            const r = num(s);
            if (r > 0 && r <= 100) sets.push({ weight: 0, reps: r });
          }
        } else if (s && typeof s === 'object') {
          const w = num(s.weight ?? s.kg ?? s.load);
          const r = num(s.reps ?? s.repeat ?? s.repsCount ?? s.count);
          if (r > 0) sets.push({ weight: w, reps: r });
        }
      }
    }
    if (sets.length) out.push({ exerciseId: ex.id, sets });
  }
  if (!out.length) return null;
  const startedAt = new Date(`${dateIso}T19:00:00`).getTime();
  return {
    id: uid('w'),
    name: raw.name || raw.title || 'Импортированная тренировка',
    programId: null,
    dayIndex: null,
    date: dateIso,
    startedAt,
    finishedAt: startedAt + 60 * 60000,
    notes: raw.notes || raw.note || '',
    items: out.map((it) => ({
      id: uid('it'),
      exerciseId: it.exerciseId,
      note: '',
      rest: null,
      targetSets: it.sets.length,
      targetReps: String(it.sets[0].reps || 8),
      sets: it.sets.map((s) => ({ id: uid('s'), weight: s.weight, reps: s.reps, done: true })),
    })),
    imported: true,
  };
}

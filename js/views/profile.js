/* ============================================================
   Профиль: настройки, программа, данные, установка
   ============================================================ */
import { state, save, setSettings, exportJSON, importJSON, resetAll } from '../store.js';
import { icon } from '../icons.js';
import {
  escapeHtml, num, fmt, fmtVolume, fmtDate, isoDate, plural, isIOS, isStandalone, download, haptic,
} from '../utils.js';
import { totalStats, currentStreak, weightSeries, finishedWorkouts } from '../analytics.js';
import { topbar, emptyState, sheet, toast, confirmDialog, promptDialog, refresh, go, closeSheets } from '../ui.js';
import { restTimer, applySettings } from '../timer.js';
import { openMeasureSheet, openMeasureHistory, viewAllPhotos } from './measure.js';
import { seedDemo } from '../seed.js';
import { allExercises } from '../analytics.js';

let installOpen = false;

export default function renderProfile() {
  const s = state.settings;
  const stats = totalStats();
  const streak = currentStreak();
  const program = (state.programs || []).find((p) => p.id === state.activeProgramId);
  const weight = s.weight || weightSeries().slice(-1)[0]?.value || 0;

  const body = `
    <div class="pad" style="margin-top:4px">
      <div class="card card--pad profile-head">
        <div class="row">
          <div class="avatar" style="width:54px;height:54px;font-size:20px">${escapeHtml(initialsOf(s.name))}</div>
          <div class="grow" style="min-width:0">
            <div class="h2 ellipsis">${escapeHtml(s.name || 'Без имени')}</div>
            <div class="muted">${weight ? fmt(weight, 1) + ' кг · ' : ''}${stats.workouts} ${plural(stats.workouts, 'тренировка', 'тренировки', 'тренировок')}</div>
          </div>
          <button class="btn btn--icon btn--soft" data-action="edit-profile" aria-label="Изменить профиль">${icon('edit', 18)}</button>
        </div>
        <div class="metrics" style="margin-top:14px">
          <div class="metric metric--accent"><div class="metric__v">${streak}</div><div class="metric__l">Дней подряд</div></div>
          <div class="metric"><div class="metric__v">${fmtVolume(stats.volume)}</div><div class="metric__l">Всего объём</div></div>
          <div class="metric"><div class="metric__v">${stats.workouts}</div><div class="metric__l">Тренировок</div></div>
        </div>
      </div>
    </div>

    <div class="section-title"><h2>Тренировки</h2></div>
    <div class="pad">
      <div class="list">
        <button class="list__row" data-action="go" data-view="programs">
          <span class="list__icon list__icon--accent">${icon('layers', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Программа</span>
            <span class="list__sub">${program ? escapeHtml(program.name) : 'Не выбрана'}</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="weekly-goal">
          <span class="list__icon">${icon('target', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Цель недели</span>
            <span class="list__sub">${s.weeklyGoal} ${plural(s.weeklyGoal, 'тренировка', 'тренировки', 'тренировок')} в неделю</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="rest-default">
          <span class="list__icon">${icon('timer', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Отдых по умолчанию</span>
            <span class="list__sub">${s.restSec} секунд между подходами</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="toggle-auto-timer">
          <span class="list__icon">${icon('play', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Автостарт таймера</span>
            <span class="list__sub">Запускать отдых после каждого подхода</span></span>
          ${switchEl(s.autoTimer)}
        </button>
        <button class="list__row" data-action="go" data-view="exercises">
          <span class="list__icon">${icon('book', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">База упражнений</span>
            <span class="list__sub">${allExercises().length} упражнений с техникой</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
      </div>
    </div>

    <div class="section-title"><h2>Звук и экран</h2></div>
    <div class="pad">
      <div class="list">
        <button class="list__row" data-action="toggle-sound">
          <span class="list__icon">${icon('volume', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Звук таймера</span></span>
          ${switchEl(s.sound)}
        </button>
        <button class="list__row" data-action="toggle-vibrate">
          <span class="list__icon">${icon('bolt', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Вибрация</span></span>
          ${switchEl(s.vibrate)}
        </button>
        <button class="list__row" data-action="toggle-notify">
          <span class="list__icon">${icon('bell', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Уведомление об отдыхе</span>
            <span class="list__sub">${s.notify ? 'Включено — придёт, когда телефон заблокирован' : 'Показывать, когда приложение свёрнуто'}</span></span>
          ${switchEl(s.notify)}
        </button>
        <button class="list__row" data-action="toggle-keepawake">
          <span class="list__icon">${icon('sun', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Не гасить экран</span>
            <span class="list__sub">Во время тренировки и отдыха</span></span>
          ${switchEl(s.keepAwake)}
        </button>
        <button class="list__row" data-action="toggle-theme">
          <span class="list__icon">${icon(s.theme === 'light' ? 'sun' : 'moon', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Тема</span>
            <span class="list__sub">${s.theme === 'light' ? 'Светлая' : 'Тёмная'}</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
      </div>
    </div>

    <div class="section-title"><h2>Прогресс в цифрах</h2></div>
    <div class="pad">
      <div class="list">
        <button class="list__row" data-action="open-measure">
          <span class="list__icon">${icon('ruler', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Добавить замер</span></span>
          ${icon('plus', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="measure-history">
          <span class="list__icon">${icon('history', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">История замеров</span>
            <span class="list__sub">${(state.measurements || []).length} записей</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="all-photos">
          <span class="list__icon">${icon('camera', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Фото прогресса</span>
            <span class="list__sub">${(state.photos || []).length} фото</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
      </div>
    </div>

    <div class="section-title"><h2>Данные</h2></div>
    <div class="pad">
      <div class="list">
        <button class="list__row" data-action="export-data">
          <span class="list__icon">${icon('download', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Экспорт резервной копии</span>
            <span class="list__sub">JSON-файл с историей и настройками</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="import-data">
          <span class="list__icon">${icon('upload', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Импорт резервной копии</span>
            <span class="list__sub">JSON-файл Атлета</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="export-programs">
          <span class="list__icon">${icon('layers', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Экспорт программ</span>
            <span class="list__sub">Файл со всеми программами тренировок</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="import-programs">
          <span class="list__icon">${icon('upload', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Импорт программ</span>
            <span class="list__sub">Добавить программы из файла</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="import-history">
          <span class="list__icon list__icon--accent">${icon('history', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Импорт истории тренировок</span>
            <span class="list__sub">Из другого приложения: текст, CSV, JSON</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="seed-demo">
          <span class="list__icon">${icon('sparkles', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Заполнить демо-данными</span>
            <span class="list__sub">Посмотреть, как выглядит прогресс</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row list__row--danger" data-action="reset-all">
          <span class="list__icon list__icon--danger">${icon('trash', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Удалить все данные</span></span>
        </button>
      </div>
    </div>

    <div class="section-title"><h2>Приложение</h2></div>
    <div class="pad">
      <div class="list">
        <button class="list__row" data-action="install-help">
          <span class="list__icon list__icon--accent">${icon('plusCircle', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">Установить на iPhone</span>
            <span class="list__sub">Как добавить на главный экран</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
        <button class="list__row" data-action="about">
          <span class="list__icon">${icon('info', 18)}</span>
          <span class="grow"><span class="list__label" style="display:block">О приложении</span>
            <span class="list__sub">Версия 1.0 · работает офлайн</span></span>
          ${icon('chevronRight', 18, 'list__chev')}
        </button>
      </div>
      <div class="tiny" style="text-align:center;margin-top:14px;line-height:1.5">
        Данные хранятся только на вашем устройстве.<br>Никаких подписок и рекламы.
      </div>
    </div>`;

  return {
    html: topbar({ title: 'Профиль', actions: `<button class="btn btn--icon btn--soft" data-action="open-timer" aria-label="Таймер">${icon('timer', 20)}</button>` }) + `<div class="view">${body}</div>`,
    mount() {},
  };
}

function switchEl(on) {
  return `<span class="switch ${on ? 'is-on' : ''}"><span class="switch__knob"></span></span>`;
}

function initialsOf(name) {
  const t = (name || '').trim();
  if (!t) return 'А';
  return t.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ============================================================
   Шторки настроек
   ============================================================ */
export function editProfileSheet() {
  const s = state.settings;
  const sh = sheet({
    title: 'Профиль',
    body: `<div class="field"><div class="field__label">Имя</div>
      <input class="input" data-field="name" value="${escapeHtml(s.name || '')}" placeholder="Как вас называть" maxlength="30"></div>
      <div class="row" style="gap:10px;margin-top:12px">
        <div class="field grow"><div class="field__label">Рост, см</div>
          <input class="input" type="number" inputmode="numeric" data-field="height" value="${s.height || ''}" placeholder="180"></div>
        <div class="field grow"><div class="field__label">Вес, кг</div>
          <input class="input" type="number" inputmode="decimal" step="0.1" data-field="weight" value="${s.weight || ''}" placeholder="80"></div>
      </div>
      <div class="field" style="margin-top:12px"><div class="field__label">Пол</div>
        <div class="segmented" data-gender>
          <button data-g="m" class="${s.gender !== 'f' ? 'is-on' : ''}">Мужской</button>
          <button data-g="f" class="${s.gender === 'f' ? 'is-on' : ''}">Женский</button>
        </div></div>
      <div class="field" style="margin-top:12px"><div class="field__label">Год рождения</div>
        <input class="input" type="number" inputmode="numeric" data-field="birthYear" value="${s.birthYear || ''}" placeholder="1995" maxlength="4"></div>`,
    foot: `<button class="btn btn--soft" data-close>Отмена</button><button class="btn btn--primary" data-save>Сохранить</button>`,
  });
  let gender = s.gender || 'm';
  for (const b of sh.el.querySelectorAll('[data-g]')) {
    b.addEventListener('click', () => {
      gender = b.dataset.g;
      sh.el.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('is-on', x === b));
    });
  }
  sh.el.querySelector('[data-save]').addEventListener('click', () => {
    setSettings({
      name: sh.el.querySelector('[data-field="name"]').value.trim().slice(0, 30),
      height: num(sh.el.querySelector('[data-field="height"]').value),
      weight: num(sh.el.querySelector('[data-field="weight"]').value),
      gender,
      birthYear: num(sh.el.querySelector('[data-field="birthYear"]').value),
    });
    sh.close('save');
    refresh();
  });
  return sh;
}

export function weeklyGoalSheet() {
  const s = state.settings;
  const sh = sheet({
    title: 'Цель на неделю',
    sub: 'Сколько тренировок хотите делать',
    body: `<div class="days-grid">
      ${[2, 3, 4, 5, 6, 7].map((n) => `<button class="day-pick ${s.weeklyGoal === n ? 'is-on' : ''}" data-n="${n}">
        <span class="day-pick__v num">${n}</span><span class="day-pick__l">${plural(n, 'тренировка', 'тренировки', 'тренировок')}</span>
      </button>`).join('')}
    </div>`,
  });
  for (const b of sh.el.querySelectorAll('[data-n]')) {
    b.addEventListener('click', () => {
      setSettings({ weeklyGoal: Number(b.dataset.n) });
      sh.close('pick');
      refresh();
    });
  }
  return sh;
}

export function restDefaultSheet() {
  const s = state.settings;
  const vals = [45, 60, 75, 90, 120, 150, 180, 240, 300];
  const sh = sheet({
    title: 'Отдых по умолчанию',
    sub: 'Применяется, если в упражнении не указано иное',
    body: `<div class="chip-row" style="gap:10px">
      ${vals.map((v) => `<button class="chip ${s.restSec === v ? 'is-on' : ''}" data-sec="${v}">${v >= 60 ? Math.floor(v / 60) + ' мин' + (v % 60 ? ' ' + (v % 60) + 'с' : '') : v + ' сек'}</button>`).join('')}
    </div>
    <div class="field" style="margin-top:16px"><div class="field__label">Своё значение, секунды</div>
      <input class="input" type="number" inputmode="numeric" data-field="sec" value="${s.restSec}" min="10" max="900"></div>
    <button class="btn btn--soft btn--block" style="margin-top:12px" data-test>${icon('play', 16)} Проверить таймер</button>`,
  });
  const apply = (sec) => {
    if (sec >= 10 && sec <= 900) {
      setSettings({ restSec: sec });
      toast('Отдых: ' + sec + ' сек');
      sh.close('pick');
      refresh();
    }
  };
  for (const b of sh.el.querySelectorAll('[data-sec]')) b.addEventListener('click', () => apply(Number(b.dataset.sec)));
  sh.el.querySelector('[data-field="sec"]').addEventListener('change', (e) => apply(Number(e.target.value)));
  sh.el.querySelector('[data-test]').addEventListener('click', () => {
    const sec = Number(sh.el.querySelector('[data-field="sec"]').value) || 90;
    apply(sec);
    restTimer.start(sec);
    document.querySelector('[data-action="open-rest"]')?.click();
  });
  return sh;
}

export function installHelpSheet() {
  const ios = isIOS();
  const standalone = isStandalone();
  const sh = sheet({
    title: 'Установка на iPhone',
    sub: standalone ? 'Приложение уже открыто как отдельное' : 'Safari → «На экран Домой»',
    body: `<div class="steps">
      ${(ios
        ? [
            ['Откройте приложение в Safari', 'Если ссылка открылась в другом браузере, скопируйте её в Safari.'],
            ['Нажмите кнопку «Поделиться»', 'Квадрат со стрелкой вверх в нижней панели.'],
            ['Выберите «На экран Домой»', 'Пролистайте список действий вниз.'],
            ['Нажмите «Добавить»', 'На главном экране появится иконка «Атлет».'],
          ]
        : [
            ['Откройте приложение в браузере', 'Chrome, Safari или Edge — на телефоне или компьютере.'],
            ['Добавьте на главный экран', 'В меню браузера выберите «Установить приложение» или «На экран Домой».'],
          ]
      )
        .map(
          ([t, d], i) => `<div class="step"><span class="step__n">${i + 1}</span><div><div class="step__t">${t}</div><div class="step__d">${d}</div></div></div>`
        )
        .join('')}
    </div>
    <div class="hint-box" style="margin-top:8px">${icon('info', 16)}<span>После установки приложение работает без интернета, данные сохраняются на телефоне. Обновлять не нужно — просто открывайте иконку.</span></div>`,
  });
  return sh;
}

export function aboutSheet() {
  sheet({
    title: 'Атлет',
    sub: 'Дневник тренировок v1.0',
    body: `<div class="about">
      <p>Бесплатный дневник силовых тренировок. Без подписок, рекламы и ограничений: программы, таймер отдыха, замена упражнений, аналитика, замеры и фото — всё доступно.</p>
      <div class="divider"></div>
      <div class="tiny" style="line-height:1.7">
        • Работает офлайн, данные в вашем телефоне<br>
        • Экспорт и импорт резервной копии<br>
        • Расчёт 1ПМ по формуле Эпли<br>
        • Готовые программы: масса, сила, тонус, похудение
      </div>
      <div class="divider"></div>
      <p class="muted" style="font-size:12.5px">Приложение не заменяет тренера и врача. Перед началом занятий проконсультируйтесь со специалистом.</p>
    </div>`,
  });
}

/* ---------- программы: экспорт / импорт ---------- */
export function doExportPrograms() {
  const list = (state.programs || []).map((p) => ({ ...p }));
  const payload = {
    app: 'atlet-programs',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: list.length,
    programs: list,
  };
  download(`atlet-programmy-${isoDate(new Date())}.json`, JSON.stringify(payload, null, 2));
  toast(`Экспортировано программ: ${list.length}`);
}

export function doImportPrograms() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.programs;
      if (!Array.isArray(list) || !list.length) {
        toast("В файле нет программ", "danger");
        return;
      }
      const have = new Set((state.programs || []).map((p) => p.id));
      const fresh = list.filter((p) => p && p.id && p.name && !have.has(p.id));
      state.programs = [...(state.programs || []), ...fresh];
      save({ immediate: true });
      toast(fresh.length ? `Добавлено программ: ${fresh.length}` : "Все программы уже есть");
      refresh();
    } catch (e) {
      console.error(e);
      toast("Не удалось прочитать файл программ", "danger");
    }
  };
  input.click();
}

/* ---------- операции с данными ---------- */
export function doExport() {
  const json = exportJSON();
  const name = `atlet-backup-${isoDate(new Date())}.json`;
  download(name, json);
  toast('Файл резервной копии скачан');
}

export function doImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importJSON(text);
      applySettings(state.settings);
      toast('Данные восстановлены');
      refresh();
    } catch (e) {
      console.error(e);
      toast('Не удалось прочитать файл: ' + (e.message || 'ошибка'), 'danger', 3200);
    }
  };
  input.click();
}

export async function doReset() {
  const ok = await confirmDialog({
    title: 'Удалить все данные?',
    text: 'История тренировок, программы, замеры и фото будут удалены безвозвратно. Сначала лучше сделать резервную копию.',
    ok: 'Удалить всё',
  });
  if (!ok) return;
  resetAll();
  applySettings(state.settings);
  toast('Данные удалены');
  refresh();
}

export function themeSheet() {
  const sh = sheet({
    title: 'Тема оформления',
    body: `<div class="theme-pick">
      <button class="theme-opt ${state.settings.theme !== 'light' ? 'is-on' : ''}" data-theme-pick="dark">
        <span class="theme-opt__preview theme-opt__preview--dark"></span>Тёмная
      </button>
      <button class="theme-opt ${state.settings.theme === 'light' ? 'is-on' : ''}" data-theme-pick="light">
        <span class="theme-opt__preview theme-opt__preview--light"></span>Светлая
      </button>
    </div>`,
  });
  for (const b of sh.el.querySelectorAll('[data-theme-pick]')) {
    b.addEventListener('click', () => {
      setSettings({ theme: b.dataset.themePick });
      applyTheme();
      sh.close('pick');
      refresh();
    });
  }
  return sh;
}

export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme === 'light' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', state.settings.theme === 'light' ? '#f3f4f6' : '#0b0c0f');
}

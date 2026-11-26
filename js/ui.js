/* ============================================================
   UI-инфраструктура: роутер, навигация, шторки, тосты, действия
   ============================================================ */
import { $, h, escapeHtml, haptic } from './utils.js';
import { icon } from './icons.js';

/* ---------- приложение / роутер ---------- */
export const ui = {
  view: 'today',
  tab: 'today',
  params: {},
  scrollY: 0,
  sessionMode: false,
};

const routes = new Map();
let renderCurrent = () => {};

export function registerView(name, fn) {
  routes.set(name, fn);
}

export function setRenderer(fn) {
  renderCurrent = fn;
}

export function go(view, params = {}, opts = {}) {
  if (!routes.has(view)) {
    console.warn('Нет представления', view);
    return;
  }
  if (ui.view === 'session' && view !== 'session' && !opts.fromSession) {
    // не мешаем активной тренировке
  }
  ui.view = view;
  ui.params = params || {};
  ui.sessionMode = view === 'session';
  if (['today', 'programs', 'journal', 'progress', 'profile', 'exercises'].includes(view)) {
    if (view !== 'exercises') ui.tab = view;
  }
  document.getElementById('app').classList.toggle('is-session', ui.sessionMode);
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderCurrent();
  updateTabbar();
}

export function refresh() {
  renderCurrent();
  updateTabbar();
}

/* ---------- tabbar ---------- */
const TABS = [
  { id: 'today', label: 'Сегодня', icon: 'home' },
  { id: 'programs', label: 'Программы', icon: 'layers' },
  { id: 'journal', label: 'Журнал', icon: 'calendar' },
  { id: 'progress', label: 'Прогресс', icon: 'chart' },
  { id: 'profile', label: 'Профиль', icon: 'user' },
];

export function mountTabbar(onNavigate) {
  const host = document.getElementById('app');
  const bar = h('nav', { class: 'tabbar', role: 'tablist' });
  for (const t of TABS) {
    const btn = h('button', {
      class: 'tabbar__item',
      'data-tab': t.id,
      role: 'tab',
      'aria-label': t.label,
      html: `${icon(t.icon, 24)}<span>${t.label}</span>`,
      onclick: () => {
        haptic();
        if (ui.view === 'session') {
          if (typeof onNavigate === 'function' && onNavigate('session')) return;
          return;
        }
        go(t.id);
      },
    });
    bar.append(btn);
  }
  document.body.append(bar);
  updateTabbar();
  return bar;
}

export function updateTabbar() {
  const bar = $('.tabbar');
  if (!bar) return;
  bar.classList.toggle('hidden', ui.sessionMode);
  for (const btn of bar.querySelectorAll('.tabbar__item')) {
    btn.classList.toggle('is-active', btn.dataset.tab === ui.tab);
  }
}

/* ---------- chrome: верхняя панель ---------- */
export function topbar({ title = '', sub = '', back = null, actions = '', cls = '' }) {
  return `<header class="top ${cls}">
    <div class="top__bar">
      ${back ? `<button class="top__back" data-action="${back}" aria-label="Назад">${icon('chevronLeft', 22)}</button>` : ''}
      <div class="grow">
        <h1 class="top__title">${title}${sub ? `<small>${sub}</small>` : ''}</h1>
      </div>
      ${actions ? `<div class="top__actions">${actions}</div>` : ''}
    </div>
  </header>`;
}

export function emptyState({ iconName = 'sparkles', title, text, action = '' }) {
  return `<div class="empty">
    <div class="empty__icon">${icon(iconName, 26)}</div>
    <h3>${title}</h3>
    <p>${text}</p>
    ${action}
  </div>`;
}

/* ---------- действий-делегирование ---------- */
const actions = new Map();

export function action(name, fn) {
  actions.set(name, fn);
}

export function initActions() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const name = el.dataset.action;
    const fn = actions.get(name);
    if (!fn) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      fn(el, e);
    } catch (err) {
      console.error('action', name, err);
      toast('Что-то пошло не так. Попробуйте ещё раз', 'danger');
    }
  });
}

export function getAction(name) {
  return actions.get(name);
}

/* ---------- формы ---------- */
export function formValues(root, scope = '') {
  const out = {};
  const q = scope ? `${scope} [data-field]` : '[data-field]';
  for (const el of root.querySelectorAll(q)) {
    const k = el.dataset.field;
    if (el.type === 'checkbox') out[k] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[k] = el.value;
    } else out[k] = el.value;
  }
  return out;
}

/* ---------- тосты ---------- */
export function toast(text, kind = 'ok', ms = 2400) {
  const host = document.getElementById('toasts');
  const el = h('div', {
    class: `toast ${kind === 'danger' ? 'toast--danger' : ''}`,
    html: `${icon(kind === 'danger' ? 'alert' : kind === 'info' ? 'info' : 'check', 17)}<span>${escapeHtml(text)}</span>`,
  });
  host.append(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 240);
  }, ms);
  while (host.children.length > 3) host.firstElementChild.remove();
}

/* ---------- оверлеи / шторки ---------- */
const overlayStack = [];

function overlayRoot() {
  return document.getElementById('overlays');
}

export function sheet({ title = '', sub = '', body = '', foot = '', onClose = null, center = false, closeOnMask = true, id = '' }) {
  const root = overlayRoot();
  const wrap = h('div', { class: `sheet ${center ? 'sheet--center' : ''}`, id: id || undefined });
  wrap.innerHTML = `
    <div class="sheet__mask"></div>
    <div class="sheet__panel" role="dialog" aria-modal="true">
      ${center ? '' : '<div class="sheet__handle"></div>'}
      ${
        title
          ? `<div class="sheet__head">
              <div class="grow">
                <div class="sheet__title">${title}</div>
                ${sub ? `<div class="sheet__sub">${sub}</div>` : ''}
              </div>
              <button class="sheet__close" data-close aria-label="Закрыть">${icon('x', 18)}</button>
            </div>`
          : ''
      }
      <div class="sheet__body">${body}</div>
      ${foot ? `<div class="sheet__foot">${foot}</div>` : ''}
    </div>`;
  let closed = false;
  const close = (reason = 'close') => {
    if (closed) return;
    closed = true;
    const i = overlayStack.indexOf(entry);
    if (i >= 0) overlayStack.splice(i, 1);
    wrap.remove();
    if (!overlayStack.length) document.documentElement.classList.remove('has-sheet');
    onClose?.(reason);
  };
  wrap.querySelector('.sheet__mask').addEventListener('click', () => {
    if (closeOnMask) close('mask');
  });
  for (const el of wrap.querySelectorAll('[data-close]')) el.addEventListener('click', () => close('button'));
  root.append(wrap);
  const entry = { el: wrap, close };
  overlayStack.push(entry);
  document.documentElement.classList.add('has-sheet');
  return entry;
}

export function closeSheets() {
  for (const s of [...overlayStack]) s.close('all');
}

export function topSheet() {
  return overlayStack[overlayStack.length - 1] || null;
}

export function confirmDialog({ title, text, ok = 'Удалить', cancel = 'Отмена', danger = true }) {
  return new Promise((resolve) => {
    let answered = false;
    const s = sheet({
      center: true,
      body: `<div class="dialog">
        <h3>${title}</h3>
        ${text ? `<p>${text}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn--soft" data-answer="0">${cancel}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-answer="1">${ok}</button>
        </div>
      </div>`,
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
    for (const btn of s.el.querySelectorAll('[data-answer]')) {
      btn.addEventListener('click', () => {
        answered = true;
        resolve(btn.dataset.answer === '1');
        s.close('answer');
      });
    }
  });
}

export function promptDialog({ title, label = '', value = '', placeholder = '', ok = 'Сохранить', multiline = false, inputType = 'text' }) {
  return new Promise((resolve) => {
    let answered = false;
    const s = sheet({
      center: true,
      body: `<div class="dialog">
        <h3>${title}</h3>
        <div style="margin-top:16px">
          ${label ? `<div class="field__label" style="margin-bottom:6px">${label}</div>` : ''}
          ${
            multiline
              ? `<textarea class="textarea" data-pv placeholder="${placeholder}">${escapeHtml(value)}</textarea>`
              : `<input class="input" data-pv type="${inputType}" value="${escapeHtml(value)}" placeholder="${placeholder}" />`
          }
        </div>
        <div class="btn-row">
          <button class="btn btn--soft" data-cancel>Отмена</button>
          <button class="btn btn--primary" data-ok>${ok}</button>
        </div>
      </div>`,
      onClose: () => {
        if (!answered) resolve(null);
      },
    });
    const input = s.el.querySelector('[data-pv]');
    setTimeout(() => input?.focus(), 120);
    const submit = () => {
      answered = true;
      resolve(input.value.trim());
      s.close('answer');
    };
    s.el.querySelector('[data-ok]').addEventListener('click', submit);
    s.el.querySelector('[data-cancel]').addEventListener('click', () => {
      answered = true;
      resolve(null);
      s.close('cancel');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !multiline) submit();
    });
  });
}

/* ---------- сегменты-переключатели ---------- */
export function segmented(items, value, actionName, attr = 'value') {
  return `<div class="segmented">${items
    .map(
      (it) =>
        `<button data-action="${actionName}" data-${attr}="${escapeHtml(it.id)}" class="${it.id === value ? 'is-on' : ''}">${escapeHtml(it.label)}</button>`
    )
    .join('')}</div>`;
}

/* ---------- аватар-инициалы ---------- */
export function initials(name) {
  const t = (name || '').trim();
  if (!t) return 'А';
  return t
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* ---------- нижний «липкий» блок ---------- */
export function stickyFoot(inner) {
  return `<div class="sticky-foot">${inner}</div>`;
}

/* ---------- форматирование дельт ---------- */
export function deltaHtml(cur, prev, unit = '') {
  if (!prev) return '';
  const d = cur - prev;
  if (Math.abs(d) < 0.01) return `<span class="muted">${icon('equal', 12)}</span>`;
  const up = d > 0;
  return `<span class="delta ${up ? 'delta--up' : 'delta--down'}">${icon(up ? 'arrowUpRight' : 'arrowDownRight', 12)}${Math.abs(d) < 10 ? d.toFixed(1).replace('.0', '') : Math.round(Math.abs(d))}${unit}</span>`;
}

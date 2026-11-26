/* ============================================================
   Утилиты: id, даты, числа, DOM-хелперы
   ============================================================ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const cs = Array.isArray(children) ? children : [children];
  for (const c of cs) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

let idc = 0;
export function uid(prefix = '') {
  idc = (idc + 1) % 100000;
  return (
    prefix +
    Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 6) +
    idc.toString(36)
  );
}

/* ---------- числа ---------- */
export function num(v, def = 0) {
  if (v === '' || v === null || v === undefined) return def;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : def;
}

export function fmt(n, maxFrac = 1) {
  const v = num(n);
  const r = Math.round(v * 10 ** maxFrac) / 10 ** maxFrac;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: maxFrac }).format(r);
}

/** 12 500 кг -> "12,5 т" */
export function fmtVolume(kg) {
  const v = num(kg);
  if (v >= 10000) return fmt(v / 1000, 1) + ' т';
  if (v >= 1000) return fmt(v / 1000, 2) + ' т';
  return fmt(v, 1);
}

export function fmtWeight(kg, unit = 'кг') {
  const v = num(kg);
  return (Number.isInteger(v) ? fmt(v, 0) : fmt(v, 1)) + ' ' + unit;
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(num(sec)));
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function fmtMinutes(sec) {
  const m = Math.round(num(sec) / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h} ч ${m % 60} мин`;
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/* ---------- даты ---------- */
const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // пн = 0
  x.setDate(x.getDate() - day);
  return x;
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isoDate(d = new Date()) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
export function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}
export function sameDay(a, b) {
  return isoDate(a) === isoDate(b);
}
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}
export function fmtDate(d) {
  const x = d instanceof Date ? d : parseDate(d);
  if (!x) return '—';
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}
export function fmtDateShort(d) {
  const x = d instanceof Date ? d : parseDate(d);
  if (!x) return '—';
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}`;
}
export function fmtDateFull(d, lower = false) {
  const x = d instanceof Date ? d : parseDate(d);
  if (!x) return '—';
  const y = x.getFullYear() === new Date().getFullYear() ? '' : ` ${x.getFullYear()}`;
  const month = MONTHS[x.getMonth()];
  const cap = lower ? month : month.charAt(0).toUpperCase() + month.slice(1);
  return `${x.getDate()} ${cap}${y}, ${WEEKDAYS[x.getDay()]}`;
}
export function fmtDateTime(ts) {
  const x = new Date(ts);
  return `${fmtDate(x)}, ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}
export function relDay(iso) {
  const d = daysBetween(parseDate(iso), new Date());
  if (d === 0) return 'сегодня';
  if (d === 1) return 'вчера';
  if (d === 2) return 'позавчера';
  if (d > 0 && d < 7) return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
  return fmtDate(parseDate(iso));
}
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase() + name.slice(1)} ${y}`;
}
export function weekdayShort(d) {
  return WEEKDAYS_SHORT[(d instanceof Date ? d : parseDate(d)).getDay()];
}
export function greeting() {
  const hh = new Date().getHours();
  if (hh < 5) return 'Доброй ночи';
  if (hh < 12) return 'Доброе утро';
  if (hh < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/* ---------- прочее ---------- */
export function debounce(fn, ms = 250) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

export function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

export function sum(arr, valFn = (x) => x) {
  return arr.reduce((acc, x) => acc + (num(valFn(x)) || 0), 0);
}

export function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function haptic(style = 'light') {
  try {
    if (navigator.vibrate) navigator.vibrate(style === 'heavy' ? 30 : 8);
  } catch {}
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* Оценка 1ПМ (Эпли) */
export function e1rm(weight, reps) {
  const w = num(weight);
  const r = num(reps);
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

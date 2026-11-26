/* ============================================================
   Замеры тела и фото прогресса
   ============================================================ */
import { state, save } from '../store.js';
import { icon } from '../icons.js';
import {
  escapeHtml, uid, num, fmt, fmtDate, isoDate, haptic,
} from '../utils.js';
import { measurementSeries } from '../analytics.js';
import { sheet, toast, refresh, confirmDialog, promptDialog } from '../ui.js';

export const MEASURE_FIELDS = [
  { id: 'weight', label: 'Вес', unit: 'кг', icon: 'scale', step: 0.1 },
  { id: 'neck', label: 'Шея', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'chest', label: 'Грудь', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'waist', label: 'Талия', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'hips', label: 'Бёдра', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'biceps', label: 'Бицепс', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'thigh', label: 'Бедро', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'calf', label: 'Голень', unit: 'см', icon: 'ruler', step: 0.5 },
  { id: 'bodyfat', label: 'Жир', unit: '%', icon: 'target', step: 0.5 },
];

export const PHOTO_TYPES = { front: 'Спереди', side: 'Сбоку', back: 'Сзади', other: 'Другое' };

export function openMeasureSheet() {
  const last = measurementSeries().slice(-1)[0] || {};
  const body = `<div class="measure-form">
    <div class="row" style="gap:8px;margin-bottom:12px">
      <div class="field grow"><div class="field__label">Дата</div>
        <input class="input" type="date" data-field="date" value="${isoDate(new Date())}" max="${isoDate(new Date())}">
      </div>
    </div>
    <div class="measure-grid">
      ${MEASURE_FIELDS.map(
        (f) => `<div class="field">
          <div class="field__label">${f.label}${f.unit ? `, ${f.unit}` : ''}</div>
          <input class="input" type="number" inputmode="decimal" step="${f.step}" min="0" max="999"
            data-field="${f.id}" value="${last[f.id] ? last[f.id] : ''}" placeholder="">
        </div>`
      ).join('')}
    </div>
    <div class="field" style="margin-top:12px">
      <div class="field__label">Заметка</div>
      <input class="input" data-field="note" placeholder="Например: утро, натощак" maxlength="80">
    </div>
  </div>`;
  const sh = sheet({
    title: 'Новый замер',
    sub: 'Все поля необязательны',
    body,
    foot: `<button class="btn btn--soft" data-close>Отмена</button><button class="btn btn--primary" data-save-measure>${icon('check', 17)} Сохранить</button>`,
  });
  sh.el.querySelector('[data-save-measure]').addEventListener('click', () => {
    const vals = {};
    let any = false;
    for (const f of MEASURE_FIELDS) {
      const el = sh.el.querySelector(`[data-field="${f.id}"]`);
      const v = num(el?.value);
      if (v > 0) {
        vals[f.id] = v;
        any = true;
      }
    }
    if (!any) {
      toast('Введите хотя бы один показатель', 'danger');
      return;
    }
    const date = sh.el.querySelector('[data-field="date"]').value || isoDate(new Date());
    const note = sh.el.querySelector('[data-field="note"]').value.trim();
    const existing = (state.measurements || []).find((m) => m.date === date);
    if (existing) {
      Object.assign(existing, vals, { note, updatedAt: Date.now() });
    } else {
      state.measurements = [...(state.measurements || []), { id: uid('m'), date, ...vals, note, createdAt: Date.now() }]
        .sort((a, b) => (a.date < b.date ? -1 : 1));
    }
    // вес из замеров синхронизируем в профиль
    if (vals.weight) state.settings.weight = vals.weight;
    save({ immediate: true });
    haptic('heavy');
    sh.close('save');
    toast('Замер сохранён');
    refresh();
  });
  return sh;
}

export function openMeasureHistory() {
  const ser = measurementSeries().slice().reverse();
  if (!ser.length) {
    toast('Пока нет замеров');
    return;
  }
  const sh = sheet({
    title: 'История замеров',
    sub: `${ser.length} записей`,
    body: `<div class="card list">
      ${ser
        .map((m) => {
          const parts = MEASURE_FIELDS.filter((f) => num(m[f.id])).map((f) => `${f.label}: ${fmt(m[f.id], 1)}${f.unit === '%' ? '%' : ''}`);
          return `<button class="list__row" data-measure="${m.id}">
            <span class="list__icon">${icon('ruler', 17)}</span>
            <span class="grow">
              <span class="list__label" style="display:block">${fmtDate(m.date)}${m.note ? ` · ${escapeHtml(m.note)}` : ''}</span>
              <span class="list__sub ellipsis">${parts.slice(0, 3).join(' · ')}${parts.length > 3 ? '…' : ''}</span>
            </span>
            ${icon('chevronRight', 18, 'list__chev')}
          </button>`;
        })
        .join('')}
    </div>`,
  });
  for (const b of sh.el.querySelectorAll('[data-measure]')) {
    b.addEventListener('click', () => {
      const m = state.measurements.find((x) => x.id === b.dataset.measure);
      if (m) openMeasureEdit(m);
    });
  }
  return sh;
}

function openMeasureEdit(m) {
  const body = `<div class="measure-form">
    <div class="measure-grid">
      ${MEASURE_FIELDS.map(
        (f) => `<div class="field">
          <div class="field__label">${f.label}, ${f.unit}</div>
          <input class="input" type="number" inputmode="decimal" step="${f.step}" min="0"
            data-field="${f.id}" value="${m[f.id] ?? ''}" placeholder="—">
        </div>`
      ).join('')}
    </div>
    <div class="field" style="margin-top:12px"><div class="field__label">Заметка</div>
      <input class="input" data-field="note" value="${escapeHtml(m.note || '')}" maxlength="80">
    </div>
  </div>`;
  const sh = sheet({
    title: `Замер ${fmtDate(m.date)}`,
    body,
    foot: `<button class="btn btn--danger" data-del>${icon('trash', 17)}</button><button class="btn btn--primary" data-save>Сохранить</button>`,
  });
  sh.el.querySelector('[data-save]').addEventListener('click', () => {
    for (const f of MEASURE_FIELDS) {
      const v = num(sh.el.querySelector(`[data-field="${f.id}"]`)?.value);
      if (v > 0) m[f.id] = v;
      else delete m[f.id];
    }
    m.note = sh.el.querySelector('[data-field="note"]').value.trim();
    save({ immediate: true });
    sh.close('save');
    toast('Обновлено');
    refresh();
  });
  sh.el.querySelector('[data-del]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Удалить замер?', text: 'Действие нельзя отменить.', ok: 'Удалить' });
    if (!ok) return;
    state.measurements = (state.measurements || []).filter((x) => x.id !== m.id);
    save({ immediate: true });
    sh.close('del');
    refresh();
  });
}

/* ============================================================
   Фото
   ============================================================ */
export function openPhotoSheet() {
  const body = `
    <div class="photo-add">
      <label class="photo-drop" for="photo-input">
        <div class="empty__icon" style="margin:0 auto 8px">${icon('camera', 26)}</div>
        <div class="h3">Снять или выбрать фото</div>
        <div class="muted" style="margin-top:4px">Фото обрабатывается на устройстве и никуда не отправляется.</div>
      </label>
      <input id="photo-input" type="file" accept="image/*" capture="environment" hidden>
      <div class="field" style="margin-top:14px">
        <div class="field__label">Ракурс</div>
        <div class="chip-row" data-photo-types>
          ${Object.entries(PHOTO_TYPES).map(([k, v], i) => `<button class="chip ${i === 0 ? 'is-on' : ''}" data-ptype="${k}">${v}</button>`).join('')}
        </div>
      </div>
      <div class="field" style="margin-top:12px">
        <div class="field__label">Дата</div>
        <input class="input" type="date" data-field="date" value="${isoDate(new Date())}" max="${isoDate(new Date())}">
      </div>
      <div class="hint-box" style="margin-top:14px">${icon('info', 16)}<span>Совет: фотографируйтесь в одном свете и позе — так прогресс виден честнее.</span></div>
    </div>`;
  const sh = sheet({ title: 'Фото прогресса', body });
  let ptype = 'front';
  for (const b of sh.el.querySelectorAll('[data-ptype]')) {
    b.addEventListener('click', () => {
      ptype = b.dataset.ptype;
      sh.el.querySelectorAll('[data-ptype]').forEach((x) => x.classList.toggle('is-on', x === b));
    });
  }
  const input = sh.el.querySelector('#photo-input');
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      toast('Обрабатываю фото…', 'info', 1500);
      const data = await compressImage(file, 1100, 0.72);
      const date = sh.el.querySelector('[data-field="date"]').value || isoDate(new Date());
      const photo = { id: uid('ph'), date, type: ptype, data, createdAt: Date.now() };
      const used = estimateUsage();
      if (used + data.length > 4_200_000) {
        toast('Мало места: удалите старые фото', 'danger', 3200);
        return;
      }
      state.photos = [...(state.photos || []), photo];
      save({ immediate: true });
      sh.close('save');
      toast('Фото добавлено');
      haptic('heavy');
      refresh();
    } catch (e) {
      console.error(e);
      toast('Не удалось обработать фото', 'danger');
    }
  });
  sh.el.querySelector('.photo-drop').addEventListener('click', () => input.click());
  return sh;
}

function estimateUsage() {
  let total = 0;
  for (const p of state.photos || []) total += (p.data || '').length;
  return total;
}

export function compressImage(file, maxSide = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0b0c0f';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function viewPhoto(id) {
  const p = (state.photos || []).find((x) => x.id === id);
  if (!p) return;
  const sh = sheet({
    title: `${PHOTO_TYPES[p.type] || 'Фото'} · ${fmtDate(p.date)}`,
    body: `<img src="${p.data}" alt="Фото прогресса" style="width:100%;border-radius:16px">`,
    foot: `<button class="btn btn--danger" data-del-photo>${icon('trash', 17)} Удалить</button>`,
  });
  sh.el.querySelector('[data-del-photo]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Удалить фото?', ok: 'Удалить' });
    if (!ok) return;
    state.photos = (state.photos || []).filter((x) => x.id !== p.id);
    save({ immediate: true });
    sh.close('del');
    refresh();
  });
  return sh;
}

export function viewAllPhotos() {
  const photos = (state.photos || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const sh = sheet({
    title: 'Фото прогресса',
    sub: `${photos.length} шт.`,
    body: `<div class="photo-grid">${photos
      .map(
        (p) => `<button class="photo-card" data-photo="${p.id}">
          <img src="${p.data}" alt="${fmtDate(p.date)}" loading="lazy">
          <span class="photo-card__date">${fmtDate(p.date)}</span>
          <span class="photo-card__tag">${PHOTO_TYPES[p.type] || 'Фото'}</span>
        </button>`
      )
      .join('')}</div>`,
  });
  for (const b of sh.el.querySelectorAll('[data-photo]')) {
    b.addEventListener('click', () => viewPhoto(b.dataset.photo));
  }
  return sh;
}

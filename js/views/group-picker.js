/* ============================================================
   Выбор группы мышц
   ============================================================ */
import { icon } from '../icons.js';
import { GROUPS, GROUP_ORDER } from '../exercises.js';
import { sheet } from '../ui.js';

export function chooseGroup({ title = 'Группа мышц', current = null } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const s = sheet({
      center: true,
      body: `<div class="dialog">
        <h3>${title}</h3>
        <div class="group-grid">
          ${GROUP_ORDER.map(
            (g) =>
              `<button class="group-pick ${current === g ? 'is-on' : ''}" data-group="${g}">
                <span class="group-pick__dot" style="background:${GROUPS[g].color}"></span>${GROUPS[g].label}
              </button>`
          ).join('')}
        </div>
        <button class="btn btn--ghost btn--block" style="margin-top:10px" data-cancel>Отмена</button>
      </div>`,
      onClose: () => {
        if (!answered) resolve(null);
      },
    });
    for (const b of s.el.querySelectorAll('[data-group]')) {
      b.addEventListener('click', () => {
        answered = true;
        resolve(b.dataset.group);
        s.close('pick');
      });
    }
    s.el.querySelector('[data-cancel]')?.addEventListener('click', () => {
      answered = true;
      resolve(null);
      s.close('cancel');
    });
  });
}

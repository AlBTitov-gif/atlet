/* ============================================================
   Таймер отдыха: фон, звук, вибрация, уведомление, экран не гаснет
   ============================================================ */
import { fmtDuration, haptic } from './utils.js';

const TKEY = 'atlet.timer.v1';

class RestTimer {
  constructor() {
    this.total = 90;
    this.remaining = 90;
    this.running = false;
    this.startedAt = 0;
    this.endsAt = 0;
    this.pausedLeft = 0;
    this.listeners = new Set();
    this._raf = null;
    this._lastShown = -1;
    this._done = false;
    this._audioCtx = null;
    this._wake = null;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type) {
    for (const fn of [...this.listeners]) {
      try {
        fn(type, this);
      } catch (e) {
        console.error(e);
      }
    }
  }

  start(seconds, opts = {}) {
    this.total = Math.max(5, Math.round(seconds));
    this.remaining = this.total;
    this.startedAt = Date.now();
    this.endsAt = this.startedAt + this.total * 1000;
    this.running = true;
    this._done = false;
    this._lastShown = -1;
    this.label = opts.label || '';
    if (opts.title) this.title = opts.title;
    this.save();
    this.requestWake();
    this.playStartCue();
    this.startLoop();
    this.emit('start');
    return this;
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.pausedLeft = Math.max(0, (this.endsAt - Date.now()) / 1000);
    this.save();
    this.stopLoop();
    this.releaseWake();
    this.emit('pause');
  }

  resume() {
    if (this.running || this.remaining <= 0) return;
    this.endsAt = Date.now() + this.remaining * 1000;
    this.running = true;
    this._done = false;
    this.save();
    this.requestWake();
    this.startLoop();
    this.emit('resume');
  }

  add(seconds) {
    const next = Math.max(0, this.remaining + seconds);
    this.remaining = next;
    this.total = Math.max(this.total, next);
    if (this.running) {
      this.endsAt = Date.now() + next * 1000;
      if (next <= 0) this.finish();
    } else {
      this.pausedLeft = next;
    }
    this.save();
    this.emit('tick');
  }

  skip() {
    this.running = false;
    this.remaining = 0;
    this.stopLoop();
    this.releaseWake();
    this.clearSaved();
    this.emit('stop');
  }

  finish() {
    if (this._done) return;
    this._done = true;
    this.running = false;
    this.remaining = 0;
    this.stopLoop();
    this.save();
    this.releaseWake();
    this.alert();
    this.emit('finish');
    setTimeout(() => {
      if (!this.running) this.emit('idle');
    }, 2600);
  }

  restart() {
    this.start(this.total, { label: this.label, title: this.title });
  }

  startLoop() {
    this.stopLoop();
    this._raf = setInterval(() => this.tick(), 250);
    this.tick();
  }
  stopLoop() {
    if (this._raf) clearInterval(this._raf);
    this._raf = null;
  }

  tick() {
    if (!this.running) return;
    const left = Math.max(0, (this.endsAt - Date.now()) / 1000);
    this.remaining = left;
    if (left <= 0) {
      this.finish();
      return;
    }
    this.emit('tick');
  }

  get display() {
    return fmtDuration(Math.ceil(this.remaining));
  }

  /* ---------- звук ---------- */
  audioCtx() {
    if (!this._audioCtx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try {
        this._audioCtx = new C();
      } catch {
        return null;
      }
    }
    if (this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(() => {});
    return this._audioCtx;
  }

  beep(freq = 880, dur = 0.13, when = 0, vol = 0.16) {
    const ctx = this.audioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  playStartCue() {
    if (!settings.sound) return;
    try {
      this.beep(660, 0.09, 0);
      this.beep(990, 0.09, 0.1);
    } catch {}
  }

  alert() {
    const s = settings;
    if (s.vibrate) {
      try {
        if (navigator.vibrate) navigator.vibrate([160, 90, 160, 90, 240]);
      } catch {}
    }
    haptic('heavy');
    if (s.sound) {
      try {
        this.beep(880, 0.14, 0);
        this.beep(880, 0.14, 0.2);
        this.beep(1320, 0.28, 0.4, 0.2);
      } catch {}
    }
    if (s.notify) {
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          const n = new Notification('Отдых закончен 💪', {
            body: 'Пора делать следующий подход',
            tag: 'atlet-rest',
            silent: false,
          });
          n.onclick = () => window.focus();
        }
      } catch {}
    }
  }

  /* ---------- wake lock ---------- */
  async requestWake() {
    if (!settings.keepAwake) return;
    try {
      if ('wakeLock' in navigator && !this._wake) {
        this._wake = await navigator.wakeLock.request('screen');
        this._wake.addEventListener?.('release', () => {
          this._wake = null;
        });
      }
    } catch {}
  }
  releaseWake() {
    try {
      this._wake?.release?.();
    } catch {}
    this._wake = null;
  }

  /* ---------- сохранение ---------- */
  save() {
    try {
      localStorage.setItem(
        TKEY,
        JSON.stringify({
          total: this.total,
          running: this.running,
          endsAt: this.endsAt,
          paused: this.pausedLeft,
          label: this.label || '',
          title: this.title || '',
          at: Date.now(),
        })
      );
    } catch {}
  }
  clearSaved() {
    try {
      localStorage.removeItem(TKEY);
    } catch {}
  }
  restore() {
    try {
      const raw = localStorage.getItem(TKEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.total = d.total || 90;
      this.label = d.label || '';
      this.title = d.title || '';
      if (d.running && d.endsAt) {
        const left = (d.endsAt - Date.now()) / 1000;
        if (left > 0) {
          this.endsAt = d.endsAt;
          this.remaining = left;
          this.running = true;
          this.startLoop();
          this.requestWake();
          return true;
        }
      }
      // истёк в фоне — покажем «готово»
      if (d.running) {
        this.remaining = 0;
        this.running = false;
        this._done = true;
        this.emit('finish');
        return false;
      }
    } catch {}
    return false;
  }
}

/* доступ к настройкам без циклического импорта */
export const settings = { sound: true, vibrate: true, notify: false, keepAwake: true, autoTimer: true };
export function applySettings(s) {
  if (!s) return;
  settings.sound = s.sound !== false;
  settings.vibrate = s.vibrate !== false;
  settings.notify = !!s.notify;
  settings.keepAwake = s.keepAwake !== false;
  settings.autoTimer = s.autoTimer !== false;
}

export const restTimer = new RestTimer();

/* при возврате на вкладку — пересчитываем */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    restTimer.tick();
    if (restTimer.running) restTimer.requestWake();
  }
});

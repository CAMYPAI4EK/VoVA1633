import {
  BOTTLE,
  DEAD,
  DUCK,
  FEET,
  FLOORBAG,
  JUMP,
  PHOTO_ITEM,
  PHOTOS,
  RACKBAG,
  RUN_A,
  RUN_B,
  SLIPPER,
  SUITCASE,
  drawSprite,
} from './sprites';
import { SoundKit } from './audio';

export type GameState = 'menu' | 'playing' | 'paused' | 'dying' | 'quiz' | 'gameover';

export interface HudData {
  score: number;
  best: number;
  kmh: number;
  newBest: boolean;
  level: number;
  levelName: string;
  progress: number;
  revive: boolean;
}

// 4 уровня маршрута: 100 + 200 + 300 + 300 очков (порог — накопительный)
export const LEVELS = [
  { name: 'ОТПРАВЛЕНИЕ', to: 100 },
  { name: 'РАЗГОН', to: 300 },
  { name: 'ПЕРЕГОН', to: 600 },
  { name: 'ФИНАЛЬНЫЙ РЫВОК', to: 900 },
];

export function levelForScore(s: number): number {
  if (s < LEVELS[0].to) return 1;
  if (s < LEVELS[1].to) return 2;
  if (s < LEVELS[2].to) return 3;
  return 4;
}

function levelProgress(s: number): number {
  const lv = levelForScore(s);
  const from = lv === 1 ? 0 : LEVELS[lv - 2].to;
  const to = LEVELS[lv - 1].to;
  return Math.min(1, Math.max(0, (s - from) / (to - from)));
}

export interface EngineHooks {
  onState: (s: GameState) => void;
  onHud: (h: HudData) => void;
  onToast: (t: string) => void;
  onMute: (m: boolean) => void;
  onPhoto: (p: { id: number; title: string; count: number; total: number }) => void;
  onAlbum: (ids: number[]) => void;
}

const H = 540;
const GROUND_Y = 464;
const GRAV = 2600;
const JUMP_V = -890;
const BASE_SPEED = 420;
const MAX_SPEED = 1150;

const STATIONS = [
  'ЗАХОЛЮСТЬЕВО',
  'ПЕРЕДЕЛКИНО',
  'ВЫШНИЙ ВОЛОЧЁК',
  'СОРТИРОВКА',
  'ПОЛТОРАКОВО',
  'КИПЯТИНО',
  'ОБЛЕПИХА',
  'СТАРЫЙ ПЕРЕВОЗ',
  'РАЗЪЕЗД 9-Й',
  'ХВОЙНАЯ',
];

type Kind =
  | 'bottle'
  | 'bottles'
  | 'slipper'
  | 'suitcase'
  | 'floorbag'
  | 'feet'
  | 'rackbag'
  | 'rackcase';

interface ObDef {
  lane: 'ground' | 'over';
  w: number;
  h: number;
  bottom?: number;
}

const OB: Record<Kind, ObDef> = {
  bottle: { lane: 'ground', w: 25, h: 56 },
  bottles: { lane: 'ground', w: 68, h: 56 },
  slipper: { lane: 'ground', w: 64, h: 28 },
  suitcase: { lane: 'ground', w: 70, h: 46 },
  floorbag: { lane: 'ground', w: 64, h: 48 },
  feet: { lane: 'over', w: 48, h: 52, bottom: 418 },
  rackbag: { lane: 'over', w: 56, h: 44, bottom: 416 },
  rackcase: { lane: 'over', w: 70, h: 46, bottom: 414 },
};

interface Obstacle {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  lane: 'ground' | 'over';
  bottom: number;
  seed: number;
}

interface PhotoDrop {
  x: number;
  y: number;
  air: boolean;
  seed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  t: number;
  max: number;
  color: string;
}

const rnd = Math.random;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr2 = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr2, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr2);
  ctx.arcTo(x + w, y + h, x, y + h, rr2);
  ctx.arcTo(x, y + h, x, y, rr2);
  ctx.arcTo(x, y, x + w, y, rr2);
  ctx.closePath();
}

export class PlatskartGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hooks: EngineHooks;
  readonly sound = new SoundKit();

  private dpr = 1;
  private cw = 960;
  private ch = 540;
  private scale = 1;
  private w = 960;
  private playerX = 150;

  state: GameState = 'menu';
  private stateT = 0;
  private t = 0;
  private raf = 0;
  private last = 0;

  private speed = BASE_SPEED;
  private worldX = 0;
  private score = 0;
  private best = 0;
  private newBest = false;
  private milestoneNext = 500;
  private stationIdx = 0;
  private lastHud = '';

  private py = GROUND_Y;
  private vy = 0;
  private grounded = true;
  private ducking = false;
  private duckHeld = false;
  private jumpBuf = 0;
  private coyote = 0;
  private jumpCut = false;
  private runT = 0;
  private stepTimer = 0;
  private stepAlt = false;

  private obstacles: Obstacle[] = [];
  private photos: PhotoDrop[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private album = new Set<number>();

  private distSince = 0;
  private nextGap = 640;
  private nextPhoto = 4200;
  private lastLane: 'ground' | 'over' = 'ground';

  private shake = 0;
  private deathT = 0;
  private invincibleT = 0;
  private revivalUsed = false;
  private level = 1;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onResize: () => void;
  private onVis: () => void;
  private onPointer: (e: PointerEvent) => void;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.hooks = hooks;

    this.best = Number(localStorage.getItem('platskart-best-v1') || 0) || 0;
    this.sound.muted = localStorage.getItem('platskart-mute-v1') === '1';
    hooks.onMute(this.sound.muted);
    try {
      const saved = JSON.parse(localStorage.getItem('platskart-album-v1') || '[]');
      if (Array.isArray(saved)) {
        for (const id of saved) this.album.add(Number(id));
      }
    } catch {
      /* повреждённое сохранение — начинаем с чистого альбома */
    }
    hooks.onAlbum([...this.album]);
    this.pushHud(true);

    this.onResize = () => this.resize();
    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => this.keyUp(e);
    this.onVis = () => {
      if (document.hidden && this.state === 'playing') this.togglePause();
    };
    this.onPointer = (e) => {
      e.preventDefault();
      this.sound.ensure();
      if (this.state === 'playing') this.jumpBuf = 0.12;
    };

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVis);
    canvas.addEventListener('pointerdown', this.onPointer);

    this.resize();
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = clamp((now - this.last) / 1000, 0, 0.033);
      this.last = now;
      this.t += dt;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
  }

  // ------------------------------------------------- управление состоянием
  private setState(s: GameState) {
    this.state = s;
    this.stateT = 0;
    this.hooks.onState(s);
  }

  private reset() {
    this.speed = BASE_SPEED;
    this.score = 0;
    this.newBest = false;
    this.milestoneNext = 500;
    this.stationIdx = 0;
    this.invincibleT = 0;
    this.revivalUsed = false;
    this.level = 1;
    this.py = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.duckHeld = false;
    this.jumpBuf = 0;
    this.coyote = 0;
    this.jumpCut = false;
    this.obstacles = [];
    this.photos = [];
    this.particles = [];
    this.popups = [];
    this.distSince = 0;
    this.nextGap = 640;
    this.nextPhoto = 4200 + rnd() * 2000;
    this.lastLane = 'ground';
    this.shake = 0;
    this.deathT = 0;
    this.pushHud(true);
  }

  start() {
    this.sound.ensure();
    this.sound.whistle();
    this.reset();
    this.setState('playing');
  }

  restart() {
    this.start();
  }

  toMenu() {
    this.reset();
    this.setState('menu');
  }

  /** Полная очистка альбома (кнопка в интерфейсе). */
  resetAlbum() {
    this.album.clear();
    try {
      localStorage.removeItem('platskart-album-v1');
    } catch {
      /* ignore */
    }
    this.hooks.onAlbum([]);
  }

  // Верный ответ в квизе: пассажир встаёт на том же месте, путь впереди расчищен
  revive() {
    if (this.state !== 'quiz') return;
    this.revivalUsed = true;
    this.obstacles = [];
    this.py = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.duckHeld = false;
    this.jumpBuf = 0;
    this.coyote = 0;
    this.jumpCut = false;
    this.invincibleT = 2.5;
    this.distSince = 0;
    this.nextGap = 760;
    this.shake = 0;
    this.sound.milestone();
    this.hooks.onToast('ВОЗРОЖДЕНИЕ — ПУТЬ СВОБОДЕН');
    this.popup('ВОЗРОЖДЕНИЕ!', this.playerX + 30, this.py - 130, '#8fd6b8');
    this.pushHud(true);
    this.setState('playing');
  }

  // Неверный ответ: маршрут начинается сначала
  failQuiz() {
    if (this.state !== 'quiz') return;
    this.hooks.onToast('НЕВЕРНО — МАРШРУТ СНАЧАЛА');
    this.start();
  }

  // Отказ от возрождения: обычная конечная
  skipRevive() {
    if (this.state !== 'quiz') return;
    this.setState('gameover');
  }

  togglePause() {
    if (this.state === 'playing') {
      this.setState('paused');
    } else if (this.state === 'paused') {
      this.sound.ensure();
      this.setState('playing');
    }
  }

  toggleMute() {
    this.sound.ensure();
    this.sound.setMuted(!this.sound.muted);
    localStorage.setItem('platskart-mute-v1', this.sound.muted ? '1' : '0');
    this.hooks.onMute(this.sound.muted);
  }

  duckOn() {
    this.duckHeld = true;
    if (this.state === 'playing' && this.grounded) this.sound.duck();
  }
  duckOff() {
    this.duckHeld = false;
  }

  /** Для сенсорных кнопок. */
  jumpPress() {
    this.sound.ensure();
    if (this.state === 'playing') this.jumpBuf = 0.12;
  }

  // ------------------------------------------------- ввод
  private keyDown(e: KeyboardEvent) {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(c)) e.preventDefault();
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') {
      this.sound.ensure();
      if (this.state === 'menu') this.start();
      else if (this.state === 'gameover' && this.stateT > 0.45) this.restart();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'playing') this.jumpBuf = 0.12;
      return;
    }
    if (c === 'ArrowDown' || c === 'KeyS') {
      if (!e.repeat) this.duckOn();
      return;
    }
    if (c === 'KeyP' || c === 'Escape') {
      this.togglePause();
      return;
    }
    if (c === 'KeyM') {
      this.toggleMute();
      return;
    }
    if (c === 'KeyR' && this.state === 'gameover') {
      this.restart();
    }
  }

  private keyUp(e: KeyboardEvent) {
    const c = e.code;
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') {
      if (this.vy < 0 && !this.jumpCut) {
        this.vy *= 0.55;
        this.jumpCut = true;
      }
    }
    if (c === 'ArrowDown' || c === 'KeyS') this.duckOff();
  }

  // ------------------------------------------------- HUD
  private pushHud(force = false) {
    const s = Math.floor(this.score);
    // 420 px/s на табло = 40 км/ч (старт), максимум ≈ 110 км/ч
    const kmh = Math.round((this.speed * 0.0952) / 5) * 5;
    const lv = levelForScore(s);
    const prog = Math.round(levelProgress(s) * 100) / 100;
    const rev = !this.revivalUsed;
    const key = `${s}|${this.best}|${kmh}|${this.newBest}|${lv}|${prog}|${rev}`;
    if (force || key !== this.lastHud) {
      this.lastHud = key;
      this.hooks.onHud({
        score: s,
        best: this.best,
        kmh,
        newBest: this.newBest,
        level: lv,
        levelName: LEVELS[lv - 1].name,
        progress: prog,
        revive: rev,
      });
    }
  }

  // ------------------------------------------------- спавн
  private spawnObstacle() {
    const score = this.score;
    let lane: 'ground' | 'over' = 'ground';
    const overProb = clamp(0.3 + score / 5000, 0.3, 0.44);
    if (score > 220 && rnd() < overProb && !(this.lastLane === 'over' && this.speed < 760)) {
      lane = 'over';
    }
    let kind: Kind;
    if (lane === 'over') {
      const r = rnd();
      kind = r < 0.45 ? 'feet' : r < 0.78 ? 'rackbag' : 'rackcase';
    } else {
      const pool: [Kind, number][] = [
        ['bottle', 3],
        ['slipper', 2.6],
        ['floorbag', 2.1],
        ['suitcase', 1.7],
      ];
      if (score > 500) pool.push(['bottles', 1.6]);
      let sum = 0;
      for (const p of pool) sum += p[1];
      let r = rnd() * sum;
      kind = pool[0][0];
      for (const p of pool) {
        r -= p[1];
        if (r <= 0) {
          kind = p[0];
          break;
        }
      }
    }
    const def = OB[kind];
    const x = this.w + 90;
    const y = def.lane === 'over' ? (def.bottom ?? 416) - def.h : GROUND_Y - def.h;
    this.obstacles.push({
      kind,
      x,
      y,
      w: def.w,
      h: def.h,
      lane: def.lane,
      bottom: def.bottom ?? GROUND_Y,
      seed: rnd() * 10,
    });
    this.lastLane = def.lane;
    this.nextGap =
      340 + this.speed * 0.42 + rnd() * 330 + (def.lane === 'over' ? 140 : 0);
  }

  private spawnPhoto() {
    // все 16 кадров собраны — новые не спавним
    if (this.album.size >= PHOTOS.length) {
      this.nextPhoto = 2000;
      return;
    }
    const air = rnd() < 0.68;
    let y = air ? GROUND_Y - 150 : GROUND_Y - 46;
    const x = this.w + 120 + rnd() * 160;
    if (!air) {
      for (const o of this.obstacles) {
        if (o.lane === 'ground' && Math.abs(o.x - x) < 110) {
          y = GROUND_Y - 150;
          break;
        }
      }
    }
    this.photos.push({ x, y, air, seed: rnd() * 10 });
  }

  private debris(kind: Kind, x: number, y: number) {
    const cols: Record<string, string[]> = {
      bottle: ['#2e7d4f', '#5cb483', '#d0342c'],
      bottles: ['#2e7d4f', '#5cb483', '#d0342c'],
      slipper: ['#c0453e', '#e8b7c6', '#6e2a26'],
      suitcase: ['#8a5a33', '#5e3a1e', '#3f2814'],
      floorbag: ['#b03a30', '#6e1f1a'],
      feet: ['#17171c', '#4a4f5a', '#3a3a42'],
      rackbag: ['#3d5a80', '#2b3f5c', '#cfd6dd'],
      rackcase: ['#8a5a33', '#5e3a1e'],
    };
    const c = cols[kind] || ['#ffffff'];
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: x + rnd() * 20,
        y: y + rnd() * 20,
        vx: -160 + rnd() * 360,
        vy: -340 + rnd() * 260,
        g: 1100,
        life: 0.7 + rnd() * 0.5,
        max: 1.1,
        size: 3 + rnd() * 5,
        color: c[i % c.length],
      });
    }
  }

  private dust(x: number, y: number, n = 5) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rnd() * 14 - 7,
        y: y - rnd() * 6,
        vx: -60 - rnd() * 90,
        vy: -20 - rnd() * 50,
        g: 160,
        life: 0.3 + rnd() * 0.3,
        max: 0.6,
        size: 2 + rnd() * 3.5,
        color: '#d8c8a8',
      });
    }
  }

  private popup(text: string, x: number, y: number, color = '#ffc24b') {
    this.popups.push({ text, x, y, t: 1.1, max: 1.1, color });
  }

  private die(kind: Kind, ox: number, oy: number) {
    if (this.state !== 'playing') return;
    this.debris(kind, ox, oy);
    this.debris('feet', this.playerX, this.py - 40);
    this.shake = 20;
    this.vy = -330;
    this.grounded = false;
    this.sound.hit();
    this.popup('ОЙ!', this.playerX + 10, this.py - 110, '#ff6a4d');
    const s = Math.floor(this.score);
    if (s > this.best) {
      this.best = s;
      this.newBest = true;
      localStorage.setItem('platskart-best-v1', String(s));
    }
    this.pushHud(true);
    this.hooks.onToast('СТОП-КРАН!');
    this.setState('dying');
  }

  // ------------------------------------------------- обновление
  private update(dt: number) {
    this.stateT += dt;
    this.shake = Math.max(0, this.shake - dt * 42);

    // частицы и всплывашки живут всегда
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > GROUND_Y + 30) p.life = 0;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t -= dt;
      p.y -= 36 * dt;
      if (p.t <= 0) this.popups.splice(i, 1);
    }

    if (this.state === 'menu') {
      this.worldX += 130 * dt;
      this.runT += dt * 1.2;
      return;
    }
    if (this.state === 'paused') return;
    if (this.state === 'quiz') return;

    if (this.state === 'dying') {
      this.deathT += dt;
      const ws = this.speed * Math.max(0, 1 - this.deathT / 0.8);
      this.worldX += ws * dt;
      for (const o of this.obstacles) o.x -= ws * dt;
      for (const pic of this.photos) pic.x -= ws * dt;
      this.vy += GRAV * 0.7 * dt;
      this.py += this.vy * dt;
      if (this.py > GROUND_Y) this.py = GROUND_Y;
      if (this.deathT >= 1.1) {
        if (!this.revivalUsed) this.setState('quiz');
        else this.setState('gameover');
      }
      return;
    }

    if (this.state === 'gameover') return;

    // ---- playing ----
    this.speed = Math.min(MAX_SPEED, this.speed + dt * (this.speed < 700 ? 13.5 : 9));
    this.worldX += this.speed * dt;
    this.score += this.speed * dt * 0.03;
    if (this.invincibleT > 0) this.invincibleT -= dt;

    // смена уровня маршрута
    const lv = levelForScore(this.score);
    if (lv > this.level) {
      this.level = lv;
      this.speed = Math.min(MAX_SPEED, this.speed + 55);
      this.sound.milestone();
      this.hooks.onToast(`УРОВЕНЬ ${lv}/4 — ${LEVELS[lv - 1].name}`);
      this.popup(`УРОВЕНЬ ${lv}`, this.playerX + 30, this.py - 130, '#ffc24b');
    }

    // шаги / стук колёс
    this.runT += dt * (this.speed / 52);
    this.stepTimer -= dt * (this.speed / 430);
    if (this.stepTimer <= 0) {
      this.stepTimer += 0.6;
      this.stepAlt = !this.stepAlt;
      this.sound.tick(this.stepAlt);
      if (this.grounded) this.dust(this.playerX - 8, GROUND_Y, 3);
    }

    // физика игрока
    this.jumpBuf -= dt;
    if (!this.grounded) this.coyote -= dt;
    if (this.jumpBuf > 0 && (this.grounded || this.coyote > 0)) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.ducking = false;
      this.jumpCut = false;
      this.jumpBuf = 0;
      this.coyote = 0;
      this.sound.jump();
      this.dust(this.playerX, GROUND_Y, 7);
    }
    const slam = !this.grounded && this.duckHeld ? 2.35 : 1;
    this.vy += GRAV * slam * dt;
    this.py += this.vy * dt;
    if (this.py >= GROUND_Y) {
      if (!this.grounded) {
        this.grounded = true;
        this.dust(this.playerX, GROUND_Y, 6);
      }
      this.py = GROUND_Y;
      this.vy = 0;
      this.coyote = 0.08;
    }
    this.ducking = this.duckHeld && this.grounded;

    // спавн
    this.distSince += this.speed * dt;
    if (this.distSince >= this.nextGap) {
      this.distSince = 0;
      this.spawnObstacle();
    }
    // фотографии — редкая находка (примерно в 4 раза реже чая)
    this.nextPhoto -= this.speed * dt;
    if (this.nextPhoto <= 0) {
      this.spawnPhoto();
      this.nextPhoto = 4400 + rnd() * 6000;
    }

    // движение препятствий + столкновения
    const px0 = this.ducking ? this.playerX - 8 : this.playerX - 14;
    const py0 = this.ducking ? GROUND_Y - 38 : this.py - 62;
    const pw = this.ducking ? 64 : 40;
    const ph = this.ducking ? 38 : 62;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= this.speed * dt;
      if (o.x < -260) {
        this.obstacles.splice(i, 1);
        continue;
      }
      if (this.invincibleT > 0) continue; // мигает после возрождения
      const pad = 5;
      const ox0 = o.x + pad;
      const oy0 = o.y + pad;
      const ow = o.w - pad * 2;
      const oh = o.h - pad * 2;
      if (px0 < ox0 + ow && px0 + pw > ox0 && py0 < oy0 + oh && py0 + ph > oy0) {
        this.die(o.kind, o.x, o.y);
        break;
      }
    }

    // фотографии — очков не дают, кладутся в альбом
    for (let i = this.photos.length - 1; i >= 0; i--) {
      const pic = this.photos[i];
      pic.x -= this.speed * dt;
      if (pic.x < -80) {
        this.photos.splice(i, 1);
        continue;
      }
      const ty = pic.y + (pic.air ? Math.sin(this.t * 3 + pic.seed) * 6 : 0);
      if (
        px0 < pic.x + 40 &&
        px0 + pw > pic.x &&
        py0 < ty + 46 &&
        py0 + ph > ty
      ) {
        this.photos.splice(i, 1);
        const uncollected = PHOTOS.filter((p) => !this.album.has(p.id));
        if (uncollected.length > 0) {
          const pick = uncollected[Math.floor(rnd() * uncollected.length)];
          this.album.add(pick.id);
          try {
            localStorage.setItem('platskart-album-v1', JSON.stringify([...this.album]));
          } catch {
            /* ignore */
          }
          this.hooks.onAlbum([...this.album]);
          this.hooks.onPhoto({
            id: pick.id,
            title: pick.title,
            count: this.album.size,
            total: PHOTOS.length,
          });
          this.popup(`ФОТО: ${pick.title.toUpperCase()}`, pic.x + 10, ty - 14, '#ffe9b0');
        }
        this.sound.shutter();
        for (let k = 0; k < 10; k++) {
          this.particles.push({
            x: pic.x + 18,
            y: ty + 16,
            vx: -90 + rnd() * 220,
            vy: -200 + rnd() * 140,
            g: 500,
            life: 0.55,
            max: 0.55,
            size: 3,
            color: k % 2 ? '#fff4d8' : '#ffd98a',
          });
        }
      }
    }

    // вехи
    if (this.score >= this.milestoneNext) {
      this.milestoneNext += 500;
      this.sound.milestone();
      this.popup('СТАНЦИЯ ПРОЕХАНА', this.playerX + 40, this.py - 130, '#8fd6b8');
      this.hooks.onToast(`ст. ${STATIONS[this.stationIdx % STATIONS.length]}`);
      this.stationIdx++;
    }

    this.pushHud();
  }

  // ------------------------------------------------- отрисовка
  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cw = Math.max(320, rect.width);
    this.ch = Math.max(280, rect.height);
    this.canvas.width = Math.round(this.cw * this.dpr);
    this.canvas.height = Math.round(this.ch * this.dpr);
    this.scale = this.ch / H;
    this.w = this.cw / this.scale;
    this.playerX = clamp(this.w * 0.2, 80, 230);
  }

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
    const w = this.w;

    const active = this.state === 'playing' || this.state === 'dying';
    const bob = Math.sin(this.t * (active ? 2.3 : 1.3)) * (active ? 3 : 1.8);
    const sx = this.shake > 0 ? (rnd() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (rnd() - 0.5) * this.shake * 0.7 : 0;
    ctx.translate(sx, sy);

    // стена
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#122620');
    wall.addColorStop(0.55, '#173229');
    wall.addColorStop(1, '#132821');
    ctx.fillStyle = wall;
    ctx.fillRect(-20, -20, w + 40, H + 40);

    this.drawCeiling(ctx, w, bob);
    this.drawRack(ctx, w, bob);
    this.drawWindows(ctx, w, bob);
    this.drawCouches(ctx, w, bob);
    this.drawFloor(ctx, w);

    const wob = bob * 0.32;
    for (const o of this.obstacles) this.drawObstacle(ctx, o, wob);
    for (const pic of this.photos) this.drawPhoto(ctx, pic);
    this.drawPlayer(ctx, wob);

    // частицы
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // скоростные штрихи
    if (this.state === 'playing' && this.speed > 640) {
      const a = clamp((this.speed - 640) / 600, 0, 1) * 0.12;
      ctx.strokeStyle = `rgba(255,240,210,${a})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const yy = 60 + hash(i * 7 + 1) * 440;
        const xx = w - ((this.t * this.speed * 1.7 + i * 310) % (w + 260)) + 120;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + 80 + hash(i) * 60, yy);
        ctx.stroke();
      }
    }

    // всплывающие подписи
    ctx.textAlign = 'center';
    ctx.font = '11px "Press Start 2P"';
    for (const p of this.popups) {
      const a = clamp(p.t / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      const tx = clamp(p.x, 130, Math.max(140, w - 130));
      ctx.strokeStyle = 'rgba(10,16,12,0.9)';
      ctx.strokeText(p.text, tx, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, tx, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawCeiling(ctx: CanvasRenderingContext2D, w: number, bob: number) {
    const y = bob;
    ctx.fillStyle = '#101f1a';
    ctx.fillRect(-20, -20, w + 40, 96 + y);
    ctx.fillStyle = '#2a4a3f';
    ctx.fillRect(-20, 92 + y, w + 40, 3);
    ctx.fillStyle = '#3c5c51';
    ctx.fillRect(-20, 95 + y, w + 40, 2);

    const tile = 380;
    const off = ((this.worldX * 0.92) % tile + tile) % tile;
    for (let x = -off - tile; x < w + tile; x += tile) {
      const flick = 0.86 + 0.14 * Math.sin(this.t * 11 + x * 0.13);
      const g = ctx.createRadialGradient(x, 84 + y, 4, x, 84 + y, 92);
      g.addColorStop(0, `rgba(255,196,80,${0.3 * flick})`);
      g.addColorStop(1, 'rgba(255,196,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 95, y - 10, 190, 190);
      // плафон
      ctx.fillStyle = '#1d3a32';
      ctx.fillRect(x - 4, y - 6, 8, 26);
      ctx.beginPath();
      ctx.moveTo(x - 17, 46 + y);
      ctx.lineTo(x + 17, 46 + y);
      ctx.lineTo(x + 8, 22 + y);
      ctx.lineTo(x - 8, 22 + y);
      ctx.closePath();
      ctx.fillStyle = '#2f5c4e';
      ctx.fill();
      ctx.fillStyle = `rgba(255,217,138,${0.95 * flick})`;
      ctx.beginPath();
      ctx.ellipse(x, 48 + y, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRack(ctx: CanvasRenderingContext2D, w: number, bob: number) {
    const y = 97 + bob;
    // декоративные сумки на полке
    const tile = 470;
    const off = ((this.worldX * 0.92) % tile + tile) % tile;
    const bagCols = ['#6e4a55', '#48587a', '#6a6a46', '#5a4a6a', '#7a5a3a'];
    let i0 = Math.floor((this.worldX * 0.92 - off) / tile);
    for (let x = -off - tile; x < w + tile; x += tile) {
      i0++;
      const hsh = hash(i0 * 13.7);
      const bw = 66 + hsh * 52;
      const bh = 24 + hash(i0 * 3.1) * 18;
      ctx.fillStyle = bagCols[i0 % bagCols.length];
      rr(ctx, x + 40, y - bh, bw, bh, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      rr(ctx, x + 40, y - 8, bw, 8, 4);
      ctx.fill();
      if (hsh > 0.5) {
        ctx.fillStyle = bagCols[(i0 + 2) % bagCols.length];
        rr(ctx, x + 210, y - 20, 54, 20, 5);
        ctx.fill();
      }
    }
    // штанга полки
    ctx.fillStyle = '#5e3a1e';
    ctx.fillRect(-20, y, w + 40, 9);
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(-20, y, w + 40, 3);
    const sup = 250;
    const soff = ((this.worldX * 0.92) % sup + sup) % sup;
    ctx.fillStyle = '#3c3f46';
    for (let x = -soff; x < w + sup; x += sup) {
      ctx.fillRect(x, y + 9, 5, 12);
    }
  }

  private drawWindows(ctx: CanvasRenderingContext2D, w: number, bob: number) {
    const y = 104 + bob * 0.85;
    ctx.fillStyle = '#1b3d33';
    ctx.fillRect(-20, y, w + 40, 196);

    const tile = 470;
    const off = ((this.worldX * 0.92) % tile + tile) % tile;
    const winW = 250;
    let idx = Math.floor((this.worldX * 0.92 - off) / tile);
    for (let x = -off - tile; x < w + tile; x += tile) {
      idx++;
      // рама
      ctx.fillStyle = '#6e4526';
      rr(ctx, x, y + 12, winW, 172, 6);
      ctx.fill();
      // небо за окном
      const ix = x + 11;
      const iy = y + 23;
      const iw = winW - 22;
      const ih = 150;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, 3);
      ctx.clip();
      const sky = ctx.createLinearGradient(0, iy, 0, iy + ih);
      sky.addColorStop(0, '#0d1b30');
      sky.addColorStop(1, '#1b3a55');
      ctx.fillStyle = sky;
      ctx.fillRect(ix, iy, iw, ih);
      // звёзды
      for (let s2 = 0; s2 < 9; s2++) {
        const stx = ix + hash(idx * 31 + s2) * iw;
        const sty = iy + 6 + hash(idx * 17 + s2 * 3) * ih * 0.55;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.7 + s2 + idx));
        ctx.fillStyle = `rgba(232,240,255,${0.7 * tw})`;
        ctx.fillRect(stx, sty, 2, 2);
      }
      // луна
      if (hash(idx * 5.3) > 0.62) {
        ctx.fillStyle = '#f0e3bd';
        ctx.beginPath();
        ctx.arc(ix + iw * 0.72, iy + 32, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b3a55';
        ctx.beginPath();
        ctx.arc(ix + iw * 0.72 + 6, iy + 28, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      // холмы (медленный параллакс)
      const hOff = ((this.worldX * 0.14) % 260 + 260) % 260;
      ctx.fillStyle = '#0e1d2e';
      for (let hx = -hOff - 260; hx < iw + 260; hx += 260) {
        ctx.beginPath();
        ctx.moveTo(ix + hx, iy + ih);
        ctx.quadraticCurveTo(ix + hx + 70, iy + ih - 46, ix + hx + 150, iy + ih);
        ctx.closePath();
        ctx.fill();
      }
      // лес ближе
      const fOff = ((this.worldX * 0.32) % 120 + 120) % 120;
      ctx.fillStyle = '#0a1622';
      for (let fx = -fOff - 120; fx < iw + 120; fx += 44) {
        const th = 26 + hash(Math.round((fx + fOff) / 44)) * 20;
        ctx.beginPath();
        ctx.moveTo(ix + fx, iy + ih);
        ctx.lineTo(ix + fx + 11, iy + ih - th);
        ctx.lineTo(ix + fx + 22, iy + ih);
        ctx.closePath();
        ctx.fill();
      }
      // столбы ЛЭП
      const pOff = ((this.worldX * 0.55) % 300 + 300) % 300;
      ctx.strokeStyle = 'rgba(10,15,22,0.9)';
      ctx.lineWidth = 3;
      for (let px2 = -pOff; px2 < iw + 300; px2 += 300) {
        ctx.beginPath();
        ctx.moveTo(ix + px2, iy + ih);
        ctx.lineTo(ix + px2, iy + 18);
        ctx.moveTo(ix + px2 - 14, iy + 26);
        ctx.lineTo(ix + px2 + 14, iy + 26);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(10,15,22,0.55)';
      ctx.beginPath();
      ctx.moveTo(ix, iy + 34);
      ctx.lineTo(ix + iw, iy + 34);
      ctx.stroke();
      ctx.restore();
      // переплёт
      ctx.fillStyle = '#6e4526';
      ctx.fillRect(x + winW / 2 - 3, y + 23, 6, 150);
      // занавески
      ctx.fillStyle = '#e8a13c';
      for (const side of [0, 1]) {
        const cx = side === 0 ? ix + 2 : ix + iw - 28;
        ctx.fillRect(cx, iy, 26, 88);
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          ctx.arc(cx + 4.4 + k * 8.6, iy + 88, 4.4, 0, Math.PI);
        }
        ctx.fill();
        ctx.fillStyle = '#c97f2a';
        ctx.fillRect(cx + 8, iy, 3, 86);
        ctx.fillRect(cx + 16, iy, 3, 86);
        ctx.fillStyle = '#e8a13c';
      }
      // подоконник
      ctx.fillStyle = '#5e3a1e';
      ctx.fillRect(x - 6, y + 184, winW + 12, 8);
    }
  }

  private drawCouches(ctx: CanvasRenderingContext2D, w: number, bob: number) {
    const y = 300 + bob * 0.6;
    ctx.fillStyle = '#173229';
    ctx.fillRect(-20, y, w + 40, GROUND_Y - y + 20);

    // нижние полки
    const tile = 560;
    const off = ((this.worldX) % tile + tile) % tile;
    let idx = Math.floor((this.worldX - off) / tile);
    for (let x = -off - tile; x < w + tile; x += tile) {
      idx++;
      const cx = x + 26;
      // матрас и одеяло
      ctx.fillStyle = '#5e3a26';
      ctx.fillRect(cx - 8, y + 40, 330, 62);
      ctx.fillStyle = '#a8433a';
      rr(ctx, cx, y + 34, 306, 40, 6);
      ctx.fill();
      ctx.fillStyle = '#c8654f';
      ctx.fillRect(cx + 14, y + 44, 278, 7);
      ctx.fillRect(cx + 14, y + 58, 278, 5);
      // подушка
      ctx.fillStyle = '#e8e0cc';
      ctx.save();
      ctx.translate(cx + 40, y + 26);
      ctx.rotate(-0.06);
      rr(ctx, 0, 0, 56, 26, 9);
      ctx.fill();
      ctx.restore();
      // откидной столик с чаем
      if (hash(idx * 7.7) > 0.35) {
        const tx = cx + 250;
        ctx.fillStyle = '#8a5a33';
        ctx.fillRect(tx, y + 74, 44, 7);
        ctx.fillStyle = '#5e3a1e';
        ctx.fillRect(tx + 20, y + 81, 5, 20);
        ctx.fillStyle = '#c9a24a';
        ctx.fillRect(tx + 14, y + 58, 15, 16);
        ctx.fillStyle = '#f5e6c8';
        ctx.fillRect(tx + 15, y + 56, 13, 5);
      }
      // силуэт попутчика
      if (hash(idx * 2.9) > 0.5) {
        const px3 = cx + 150;
        ctx.fillStyle = '#241d18';
        rr(ctx, px3, y + 44, 40, 58, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px3 + 20, y + 34, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2f26';
        ctx.fillRect(px3 + 8, y + 30, 24, 5);
      }
    }

    // кромка полки (доска)
    ctx.fillStyle = '#8a5a33';
    ctx.fillRect(-20, y, w + 40, 13);
    ctx.fillStyle = '#a8703f';
    ctx.fillRect(-20, y, w + 40, 3);
    ctx.fillStyle = '#5e3a1e';
    ctx.fillRect(-20, y + 13, w + 40, 3);
    const sup = 300;
    const soff = ((this.worldX) % sup + sup) % sup;
    ctx.fillStyle = '#3c3f46';
    for (let x = -soff; x < w + sup; x += sup) {
      ctx.fillRect(x, y + 16, 7, 16);
    }

    // тень у пола
    const sh = ctx.createLinearGradient(0, 430, 0, GROUND_Y);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = sh;
    ctx.fillRect(-20, 430, w + 40, GROUND_Y - 430);
  }

  private drawFloor(ctx: CanvasRenderingContext2D, w: number) {
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    g.addColorStop(0, '#382818');
    g.addColorStop(0.35, '#2c1f13');
    g.addColorStop(1, '#170f09');
    ctx.fillStyle = g;
    ctx.fillRect(-20, GROUND_Y, w + 40, H - GROUND_Y);
    ctx.fillStyle = '#4a3a24';
    ctx.fillRect(-20, GROUND_Y, w + 40, 2);
    // крапинки линолеума
    for (let i = 0; i < 70; i++) {
      const span = w + 80;
      const mx = (((i * 173.3 - this.worldX * 1) % span) + span) % span - 40;
      const my = 472 + ((i * 53) % 58);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(232,220,190,0.1)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(mx, my, 3, 2);
    }
    // стыки плиток
    const jOff = ((this.worldX) % 160 + 160) % 160;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = -jOff; x < w + 160; x += 160) {
      ctx.fillRect(x, GROUND_Y + 4, 2, H - GROUND_Y - 8);
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, wob: number) {
    const y = o.y + wob;
    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    const shw = o.w * 0.6;
    ctx.ellipse(o.x + o.w / 2, GROUND_Y + 7 + wob, shw / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const sway = o.lane === 'over' ? Math.sin(this.t * 2.1 + o.seed) * 0.02 : 0;
    ctx.save();
    if (sway !== 0) {
      ctx.translate(o.x + o.w / 2, o.lane === 'over' ? 100 + wob : y);
      ctx.rotate(sway);
      ctx.translate(-(o.x + o.w / 2), -(o.lane === 'over' ? 100 + wob : y));
    }
    switch (o.kind) {
      case 'bottle':
        drawSprite(ctx, BOTTLE, o.x, y, 3.5);
        break;
      case 'bottles':
        drawSprite(ctx, BOTTLE, o.x, y, 3.5);
        drawSprite(ctx, BOTTLE, o.x + 21, y, 3.5);
        drawSprite(ctx, BOTTLE, o.x + 42, y, 3.5);
        break;
      case 'slipper':
        drawSprite(ctx, SLIPPER, o.x, y + o.h - 28, 4);
        break;
      case 'suitcase':
        drawSprite(ctx, SUITCASE, o.x, y, 3.5);
        break;
      case 'floorbag':
        drawSprite(ctx, FLOORBAG, o.x, y, 4);
        break;
      case 'feet': {
        // штанина от полки
        ctx.fillStyle = '#4a4f5a';
        ctx.fillRect(o.x + 16, 298 + wob, 13, y - (298 + wob) + 10);
        drawSprite(ctx, FEET, o.x, y, 4);
        break;
      }
      case 'rackbag': {
        ctx.strokeStyle = '#3a3f4a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x + 12, 104 + wob);
        ctx.lineTo(o.x + 10, y + 8);
        ctx.moveTo(o.x + o.w - 12, 104 + wob);
        ctx.lineTo(o.x + o.w - 10, y + 8);
        ctx.stroke();
        drawSprite(ctx, RACKBAG, o.x, y, 4);
        break;
      }
      case 'rackcase': {
        ctx.strokeStyle = '#3a3f4a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x + 16, 104 + wob);
        ctx.lineTo(o.x + 22, y + 4);
        ctx.moveTo(o.x + o.w - 16, 104 + wob);
        ctx.lineTo(o.x + o.w - 22, y + 4);
        ctx.stroke();
        drawSprite(ctx, SUITCASE, o.x, y, 3.5);
        break;
      }
    }
    ctx.restore();
  }

  private drawPhoto(ctx: CanvasRenderingContext2D, pic: PhotoDrop) {
    const y = pic.y + (pic.air ? Math.sin(this.t * 3 + pic.seed) * 6 : 0);
    const x = pic.x;
    const cx = x + 18;
    const cy = y + 18;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42);
    glow.addColorStop(0, 'rgba(255,240,200,0.3)');
    glow.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 26, y - 24, 88, 88);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(this.t * 2.2 + pic.seed) * 0.12);
    ctx.translate(-cx, -cy);
    drawSprite(ctx, PHOTO_ITEM, x, y - 4, 3);
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, wob: number) {
    const feet = this.py + wob;
    const airH = GROUND_Y - this.py;
    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(
      this.playerX + 8,
      GROUND_Y + 8 + wob,
      Math.max(14, 30 - airH * 0.1),
      5.5,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.save();
    if (this.invincibleT > 0 && Math.floor(this.t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    if (this.state === 'dying' || this.state === 'gameover' || this.state === 'quiz') {
      const spin = Math.min(1.4, this.deathT * 2.2);
      ctx.translate(this.playerX + 6, feet - 34);
      ctx.rotate(spin);
      ctx.translate(-(this.playerX + 6), -(feet - 34));
      drawSprite(ctx, DEAD, this.playerX - 22, feet - 68, 4);
    } else if (this.ducking) {
      drawSprite(ctx, DUCK, this.playerX - 20, feet - 48, 4);
    } else if (!this.grounded) {
      drawSprite(ctx, JUMP, this.playerX - 22, feet - 68, 4);
    } else {
      const frame = this.state === 'menu' ? RUN_A : Math.floor(this.runT * 2.4) % 2 === 0 ? RUN_A : RUN_B;
      drawSprite(ctx, frame, this.playerX - 22, feet - 68, 4);
    }
    ctx.restore();
  }
}

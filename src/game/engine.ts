import {
  BOTTLE,
  DEAD,
  DOVE_A,
  DOVE_B,
  DUCK,
  FEET,
  FLOORBAG,
  HEART_P,
  HEART_R,
  JUMP,
  PHOTO_ITEM,
  PHOTOS,
  RACKBAG,
  RUN_A,
  RUN_B,
  SLIPPER,
  SUITCASE,
  TANYA,
  drawSprite,
} from './sprites';
import { SoundKit } from './audio';

export type GameState =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'dying'
  | 'quiz'
  | 'gameover'
  | 'transition'
  | 'finale'
  | 'wedding';

// длительность проходки по тамбуру и открытия двери в следующий вагон
const TRANS_WALK = 1.7;
const TRANS_OPEN = 0.6;

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

interface Heart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  pink: boolean;
  sway: number;
}

interface Dove {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
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
  godMode = false;

  // переход между вагонами (тамбур)
  private transT = 0;
  private transPhase: 'walk' | 'ready' | 'opening' = 'walk';
  private transLevel = 1;
  private transOpenT = 0;
  private preTransSpeed = BASE_SPEED;
  private transStepT = 0;

  private finaleT = 0;
  private finaleStartSpeed = 0;
  private tanyaX = -100;
  private kissDone = false;
  private dovesDone = false;
  private ringsDone = false;
  private heartTimer = 0;
  private flashT = 0;
  private hearts: Heart[] = [];
  private doves: Dove[] = [];

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
      else if (this.state === 'transition') this.beginOpenDoor();
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
    this.transT = 0;
    this.transPhase = 'walk';
    this.transLevel = 1;
    this.transOpenT = 0;
    this.transStepT = 0;
    this.finaleT = 0;
    this.tanyaX = -100;
    this.kissDone = false;
    this.dovesDone = false;
    this.ringsDone = false;
    this.heartTimer = 0;
    this.flashT = 0;
    this.hearts = [];
    this.doves = [];
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

  /** Скрытый режим бессмертия: столкновения не убивают. */
  toggleGod(): boolean {
    this.godMode = !this.godMode;
    return this.godMode;
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
    else if (this.state === 'transition') this.beginOpenDoor();
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
      else if (this.state === 'transition') this.beginOpenDoor();
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

  // ------------------------------------------------- переход между вагонами
  private startTransition(lv: number) {
    this.transLevel = lv;
    this.transT = 0;
    this.transPhase = 'walk';
    this.transOpenT = 0;
    this.transStepT = 0;
    this.preTransSpeed = this.speed;
    this.sound.doorOpen(); // дверь тамбура открылась
    this.setState('transition');
  }

  private updateTransition(dt: number) {
    this.transT += dt;
    // поезд плавно замедляется, пока пассажир идёт по тамбуру
    this.speed = Math.max(0, this.speed - 420 * dt);
    this.worldX += this.speed * dt;

    if (this.transPhase === 'walk') {
      this.runT += dt * 2.4;
      this.transStepT -= dt;
      if (this.transStepT <= 0) {
        this.transStepT = 0.34;
        this.sound.tick(true);
      }
      if (this.transT >= TRANS_WALK) this.transPhase = 'ready';
    } else if (this.transPhase === 'opening') {
      this.transOpenT += dt;
      this.runT += dt * 2.4;
      if (this.transOpenT >= TRANS_OPEN) this.finishTransition();
    }
    // в фазе 'ready' ждём прыжок от игрока
  }

  private beginOpenDoor() {
    if (this.transPhase !== 'ready') return;
    this.transPhase = 'opening';
    this.transOpenT = 0;
    this.sound.doorOpen();
  }

  private finishTransition() {
    this.level = this.transLevel;
    // новый вагон — чистый проход
    this.obstacles = [];
    this.photos = [];
    this.distSince = 0;
    this.nextGap = 520;
    this.nextPhoto = 3800 + rnd() * 1200;
    this.speed = Math.min(MAX_SPEED, this.preTransSpeed + 55);
    this.invincibleT = 1.4;
    this.py = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.sound.milestone();
    this.hooks.onToast(`ВАГОН ${this.level}/4 — ${LEVELS[this.level - 1].name}`);
    this.popup(`ВАГОН ${this.level}`, this.w / 2, 210, '#ffc24b');
    this.setState('playing');
  }

  // ------------------------------------------------- финал: свадьба
  private startFinale() {
    this.setState('finale');
    this.finaleT = 0;
    this.finaleStartSpeed = this.speed;
    this.photos = [];
    this.py = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.sound.brake();
    this.hooks.onToast('МОСКВА. КОНЕЧНАЯ');
    const s = Math.floor(this.score);
    if (s > this.best) {
      this.best = s;
      this.newBest = true;
      try {
        localStorage.setItem('platskart-best-v1', String(s));
      } catch {
        /* ignore */
      }
    }
    this.pushHud(true);
  }

  private updateFinale(dt: number) {
    const T = (this.finaleT += dt);

    // фаза 1: торможение (0 → 2.2с)
    if (T < 2.2) {
      this.speed = Math.max(0, this.finaleStartSpeed * (1 - T / 2.2));
      this.worldX += this.speed * dt;
      this.runT += dt * (this.speed / 52);
      for (const o of this.obstacles) o.x -= this.speed * dt;
    } else {
      this.speed = 0;
      if (this.obstacles.length) this.obstacles = [];
    }

    // игрок замирает
    if (T >= 2.2) {
      this.py = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
      this.ducking = false;
    }

    // Таня выходит навстречу (2.2 → 4.7с)
    if (T >= 2.2) {
      const target = this.playerX + 62;
      if (T < 4.7) {
        const p = (T - 2.2) / 2.5;
        this.tanyaX = this.w + 60 - p * (this.w + 60 - target);
      } else {
        this.tanyaX = target;
      }
    }

    // поцелуй (5.6с)
    if (!this.kissDone && T >= 5.6) {
      this.kissDone = true;
      this.flashT = 0.3;
      this.sound.kiss();
      for (let i = 0; i < 26; i++) this.spawnHeart(true);
    }

    // голуби (5.6с)
    if (!this.dovesDone && T >= 5.6) {
      this.dovesDone = true;
      this.sound.wings();
      this.spawnDoves();
    }

    // обручальные кольца (6.6с)
    if (!this.ringsDone && T >= 6.6) {
      this.ringsDone = true;
      this.sound.fanfare();
      for (let i = 0; i < 12; i++) this.spawnHeart(false);
    }

    // сердца фоном
    if (T > 5.6) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = 0.4;
        this.spawnHeart(false);
      }
    }

    this.updateFx(dt);
    if (this.flashT > 0) this.flashT -= dt;

    if (T >= 10.5) this.setState('wedding');
  }

  private spawnHeart(burst: boolean) {
    const cx = (this.playerX + this.tanyaX + 32) / 2;
    const cy = GROUND_Y - (burst ? 60 + rnd() * 30 : 75);
    this.hearts.push({
      x: cx + (rnd() - 0.5) * (burst ? 100 : 44),
      y: cy + (rnd() - 0.5) * 20,
      vx: (rnd() - 0.5) * 50,
      vy: -(40 + rnd() * 60),
      life: 1.6,
      max: 1.6,
      size: 2.5 + rnd() * 2,
      pink: rnd() < 0.5,
      sway: rnd() * 10,
    });
  }

  private spawnDoves() {
    const cx = (this.playerX + this.tanyaX + 32) / 2;
    for (let i = 0; i < 8; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      this.doves.push({
        x: cx + (rnd() - 0.5) * 60,
        y: GROUND_Y - 60 - rnd() * 40,
        vx: dir * (60 + rnd() * 90),
        vy: -(70 + rnd() * 60),
        t: rnd() * 10,
      });
    }
  }

  private updateFx(dt: number) {
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.life -= dt;
      if (h.life <= 0) {
        this.hearts.splice(i, 1);
        continue;
      }
      h.x += h.vx * dt + Math.sin(this.t * 4 + h.sway) * 0.6;
      h.y += h.vy * dt;
    }
    for (let i = this.doves.length - 1; i >= 0; i--) {
      const d = this.doves[i];
      d.t += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy *= 0.995;
      if (d.y < -60 || d.x < -60 || d.x > this.w + 60) this.doves.splice(i, 1);
    }
  }

  private drawFinale(ctx: CanvasRenderingContext2D, wob: number) {
    const T = this.finaleT;
    const groundY = GROUND_Y + wob;

    // Таня (появляется с 2.2с)
    if (T >= 2.2) {
      const walking = T < 4.7;
      const step = walking ? Math.sin(T * 10) * 2 : 0;
      const lean = this.kissDone ? -0.05 : 0;
      const tx = this.tanyaX;
      const feetY = groundY + step;
      ctx.save();
      ctx.translate(tx + 32, feetY);
      ctx.rotate(lean);
      ctx.translate(-(tx + 32), -feetY);
      drawSprite(ctx, TANYA, tx, feetY - TANYA.rows.length * 4, 4);
      ctx.restore();
    }

    // обручальные кольца над парой
    if (this.ringsDone) {
      const cx = (this.playerX + this.tanyaX + 32) / 2;
      const cy = groundY - 135;
      const pulse = 1 + Math.sin(this.t * 3) * 0.05;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.lineWidth = 5;
      const grad = ctx.createLinearGradient(-20, -20, 20, 20);
      grad.addColorStop(0, '#ffe9a8');
      grad.addColorStop(0.5, '#f0c040');
      grad.addColorStop(1, '#c8901a');
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(-11, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(11, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cfe9ff';
      ctx.beginPath();
      ctx.moveTo(11, -24);
      ctx.lineTo(17, -17);
      ctx.lineTo(11, -10);
      ctx.lineTo(5, -17);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const sa = 0.5 + 0.5 * Math.sin(this.t * 6);
      ctx.fillStyle = `rgba(255,240,180,${sa})`;
      ctx.fillRect(cx - 2, cy - 36, 4, 4);
    }

    // голуби
    for (const d of this.doves) {
      const frame = Math.floor(d.t * 8) % 2 === 0 ? DOVE_A : DOVE_B;
      drawSprite(ctx, frame, d.x, d.y, 3);
    }

    // сердца
    for (const h of this.hearts) {
      ctx.globalAlpha = clamp(h.life / h.max, 0, 1);
      drawSprite(ctx, h.pink ? HEART_P : HEART_R, h.x, h.y, h.size);
    }
    ctx.globalAlpha = 1;

    // вспышка поцелуя
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,220,235,${this.flashT * 1.5})`;
      ctx.fillRect(-20, -20, this.w + 40, H + 40);
    }
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

    if (this.state === 'finale') {
      this.updateFinale(dt);
      return;
    }

    if (this.state === 'transition') {
      this.updateTransition(dt);
      return;
    }

    if (this.state === 'gameover') return;

    if (this.state === 'wedding') {
      // сценка живёт и за свадебной карточкой
      this.updateFx(dt);
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = 0.5;
        this.spawnHeart(false);
      }
      if (this.flashT > 0) this.flashT -= dt;
      return;
    }

    // ---- playing ----
    this.speed = Math.min(MAX_SPEED, this.speed + dt * (this.speed < 700 ? 13.5 : 9));
    this.worldX += this.speed * dt;
    this.score += this.speed * dt * 0.03;
    if (this.invincibleT > 0) this.invincibleT -= dt;

    // конец маршрута — финал со свадьбой (приоритетнее перехода)
    if (this.score >= LEVELS[3].to) {
      this.startFinale();
      return;
    }

    // смена уровня маршрута — переход через тамбур в следующий вагон
    const lv = levelForScore(this.score);
    if (lv > this.level) {
      this.startTransition(lv);
      return;
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
      if (this.godMode || this.invincibleT > 0) continue; // бессмертие / мигает после возрождения
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
    if (this.state !== 'transition') this.drawPlayer(ctx, wob);

    // свадебная сценка
    if (this.state === 'finale' || this.state === 'wedding') this.drawFinale(ctx, wob);

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

    // переход между вагонами: тамбур
    if (this.state === 'transition') this.drawVestibule(ctx, w, wob);

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

  // ------------------------------------------------- тамбур (переход между вагонами)
  private transCharX(w: number): number {
    const from = w * 0.18;
    const mid = w * 0.56;
    if (this.transPhase === 'walk') {
      const p = clamp(this.transT / TRANS_WALK, 0, 1);
      const e = p * p * (3 - 2 * p); // плавный разгон/остановка шага
      return from + (mid - from) * e;
    }
    if (this.transPhase === 'ready') return mid;
    const p = clamp(this.transOpenT / TRANS_OPEN, 0, 1);
    return mid + (w * 0.66 - mid) * p;
  }

  private drawVestibule(ctx: CanvasRenderingContext2D, w: number, wob: number) {
    let alpha = clamp(this.transT / 0.3, 0, 1);
    if (this.transPhase === 'opening') {
      alpha = 1 - clamp((this.transOpenT - (TRANS_OPEN - 0.25)) / 0.25, 0, 1);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    const gy = GROUND_Y + wob;

    // стальная коробка тамбура
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e1418');
    bg.addColorStop(0.5, '#16202a');
    bg.addColorStop(1, '#101820');
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, w + 40, H + 40);

    // гофрированная обшивка
    ctx.fillStyle = '#1b2731';
    ctx.fillRect(-20, 96, w + 40, gy - 96);
    const rib = ((this.worldX * 0.5) % 46 + 46) % 46;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let x = -rib - 46; x < w + 46; x += 46) ctx.fillRect(x, 100, 3, gy - 104);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = -rib - 26; x < w + 46; x += 46) ctx.fillRect(x, 100, 2, gy - 104);

    // потолок
    ctx.fillStyle = '#0b1116';
    ctx.fillRect(-20, -20, w + 40, 100);
    ctx.fillStyle = '#232f3a';
    ctx.fillRect(-20, 96, w + 40, 3);

    // окно с проносящимися огнями
    const winX = w * 0.36;
    const winW = w * 0.16;
    ctx.fillStyle = '#0a0f14';
    rr(ctx, winX - 6, 150, winW + 12, 96, 8);
    ctx.fill();
    ctx.save();
    rr(ctx, winX, 156, winW, 84, 5);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, 156, 0, 240);
    sky.addColorStop(0, '#08101c');
    sky.addColorStop(1, '#0d1a2c');
    ctx.fillStyle = sky;
    ctx.fillRect(winX, 156, winW, 84);
    const ls = this.worldX + this.t * 70;
    for (let i = 0; i < 7; i++) {
      const span = winW + 60;
      const lx = winX + winW - (((ls * (1.5 + i * 0.2) + i * 90) % span + span) % span - 30);
      const ly = 168 + hash(i * 3.7) * 60;
      ctx.fillStyle = i % 2 ? 'rgba(255,196,90,0.8)' : 'rgba(150,190,255,0.7)';
      ctx.fillRect(lx, ly, 10 + i * 2, 3);
    }
    ctx.restore();
    ctx.strokeStyle = '#2c3a46';
    ctx.lineWidth = 3;
    rr(ctx, winX, 156, winW, 84, 5);
    ctx.stroke();

    // поручни
    ctx.fillStyle = '#39424c';
    ctx.fillRect(-20, 300, w + 40, 6);
    ctx.fillStyle = '#4a545f';
    ctx.fillRect(-20, 300, w + 40, 2);

    // пол — рифлёный металл
    const fg = ctx.createLinearGradient(0, gy, 0, H);
    fg.addColorStop(0, '#2a333c');
    fg.addColorStop(0.4, '#1e262e');
    fg.addColorStop(1, '#141a20');
    ctx.fillStyle = fg;
    ctx.fillRect(-20, gy, w + 40, H - gy);
    const fp = ((this.worldX) % 34 + 34) % 34;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = -fp - 34; x < w + 34; x += 34) {
      let k = 0;
      for (let y = gy + 8; y < H; y += 16) {
        ctx.fillRect(x + (k % 2 ? 12 : 0), y, 8, 2);
        k++;
      }
    }
    ctx.fillStyle = '#3a444e';
    ctx.fillRect(-20, gy, w + 40, 2);

    // дверной проём позади (откуда пришли) — открыт
    this.drawVestDoor(ctx, w * 0.02, gy);
    // дверь в следующий вагон
    const openP =
      this.transPhase === 'opening' ? clamp(this.transOpenT / (TRANS_OPEN * 0.7), 0, 1) : 0;
    this.drawNextDoor(ctx, w * 0.62, w * 0.16, gy, openP);

    // лампочка
    const flick = 0.8 + 0.2 * Math.sin(this.t * 13 + 1);
    const bulbX = w * 0.47;
    const glow = ctx.createRadialGradient(bulbX, 90, 4, bulbX, 90, 130);
    glow.addColorStop(0, `rgba(255,210,120,${0.28 * flick})`);
    glow.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(bulbX - 140, 0, 280, 300);
    ctx.fillStyle = '#2c3a46';
    ctx.fillRect(bulbX - 3, 60, 6, 22);
    ctx.fillStyle = `rgba(255,224,150,${0.95 * flick})`;
    ctx.beginPath();
    ctx.arc(bulbX, 92, 8, 0, Math.PI * 2);
    ctx.fill();

    // пассажир
    const cx = this.transCharX(w);
    const moving = this.transPhase !== 'ready';
    const frame = moving ? (Math.floor(this.runT * 2.6) % 2 === 0 ? RUN_A : RUN_B) : RUN_A;
    drawSprite(ctx, frame, cx - 22, gy - 68, 4);

    // просьба нажать прыжок
    if (this.transPhase === 'ready') {
      const pulse = 0.55 + 0.45 * Math.sin(this.t * 5.5);
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,194,75,${pulse})`;
      const ay = 200 + Math.sin(this.t * 5.5) * 6;
      ctx.beginPath();
      ctx.moveTo(w / 2, ay - 26);
      ctx.lineTo(w / 2 - 14, ay - 8);
      ctx.lineTo(w / 2 - 5, ay - 8);
      ctx.lineTo(w / 2 - 5, ay + 6);
      ctx.lineTo(w / 2 + 5, ay + 6);
      ctx.lineTo(w / 2 + 5, ay - 8);
      ctx.lineTo(w / 2 + 14, ay - 8);
      ctx.closePath();
      ctx.fill();
      ctx.font = '15px "Press Start 2P"';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(8,12,10,0.9)';
      ctx.strokeText('НАЖМИ ПРЫЖОК', w / 2, 246);
      ctx.fillStyle = `rgba(255,194,75,${0.7 + 0.3 * pulse})`;
      ctx.fillText('НАЖМИ ПРЫЖОК', w / 2, 246);
      ctx.font = '9px "Press Start 2P"';
      ctx.strokeText('ПРОБЕЛ / ↑ / ТАП', w / 2, 272);
      ctx.fillStyle = 'rgba(232,224,204,0.75)';
      ctx.fillText('ПРОБЕЛ / ↑ / ТАП', w / 2, 272);
    }

    // затемнение краёв
    const vg = ctx.createLinearGradient(0, 0, w, 0);
    vg.addColorStop(0, 'rgba(0,0,0,0.55)');
    vg.addColorStop(0.25, 'rgba(0,0,0,0)');
    vg.addColorStop(0.75, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(-20, -20, w + 40, H + 40);

    ctx.restore();
  }

  private drawVestDoor(ctx: CanvasRenderingContext2D, x: number, gy: number) {
    ctx.fillStyle = '#05080b';
    rr(ctx, x, 130, 90, gy - 130, 4);
    ctx.fill();
    ctx.fillStyle = '#2c3a46';
    rr(ctx, x - 26, 130, 30, gy - 130, 4);
    ctx.fill();
    rr(ctx, x + 86, 130, 30, gy - 130, 4);
    ctx.fill();
    ctx.strokeStyle = '#39424c';
    ctx.lineWidth = 4;
    rr(ctx, x, 130, 90, gy - 130, 4);
    ctx.stroke();
  }

  private drawNextDoor(
    ctx: CanvasRenderingContext2D,
    x: number,
    dw: number,
    gy: number,
    openP: number,
  ) {
    const dh = gy - 140;
    // тёплый свет следующего вагона за дверью
    if (openP > 0) {
      ctx.fillStyle = `rgba(255,214,140,${0.9 * openP})`;
      const ow = dw * openP;
      rr(ctx, x + (dw - ow) / 2, 140, ow, dh, 4);
      ctx.fill();
      const spill = ctx.createRadialGradient(x + dw / 2, gy, 10, x + dw / 2, gy, dw);
      spill.addColorStop(0, `rgba(255,200,110,${0.4 * openP})`);
      spill.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = spill;
      ctx.fillRect(x - dw, 140, dw * 3, dh + 40);
    }
    // полотно двери поднимается при открытии
    const lift = dh * openP;
    ctx.save();
    rr(ctx, x, 140, dw, dh, 4);
    ctx.clip();
    ctx.translate(0, -lift);
    const dg = ctx.createLinearGradient(x, 0, x + dw, 0);
    dg.addColorStop(0, '#3a4753');
    dg.addColorStop(0.5, '#46545f');
    dg.addColorStop(1, '#333f4a');
    ctx.fillStyle = dg;
    ctx.fillRect(x, 140, dw, dh);
    ctx.fillStyle = '#0e1a26';
    rr(ctx, x + dw * 0.3, 168, dw * 0.4, 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#5a6874';
    ctx.lineWidth = 3;
    rr(ctx, x + dw * 0.3, 168, dw * 0.4, 60, 6);
    ctx.stroke();
    ctx.fillStyle = '#2c3742';
    ctx.fillRect(x, 140 + dh * 0.55, dw, 6);
    ctx.fillStyle = '#8a97a3';
    rr(ctx, x + dw * 0.5 - 16, 140 + dh * 0.55 + 18, 32, 8, 4);
    ctx.fill();
    ctx.restore();
    // неподвижная рама
    ctx.strokeStyle = '#4a5866';
    ctx.lineWidth = 5;
    rr(ctx, x, 140, dw, dh, 4);
    ctx.stroke();
    // табличка с номером вагона
    const plate = `ВАГОН ${this.transLevel}`;
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'left';
    const tw = ctx.measureText(plate).width;
    const px = x + dw / 2 - tw / 2;
    ctx.fillStyle = '#1c2733';
    rr(ctx, px - 10, 106, tw + 20, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffc24b';
    ctx.lineWidth = 2;
    rr(ctx, px - 10, 106, tw + 20, 24, 4);
    ctx.stroke();
    ctx.fillStyle = '#ffc24b';
    ctx.fillText(plate, px, 123);
    ctx.textAlign = 'center';
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

// Пиксель-арт спрайты. '.' — прозрачный пиксель.
export interface Sprite {
  w: number;
  rows: string[];
  pal: Record<string, string>;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  px: number,
) {
  for (let r = 0; r < s.rows.length; r++) {
    const row = s.rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const col = s.pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c * px, y + r * px, px + 0.4, px + 0.4);
    }
  }
}

export const PAL_PLAYER: Record<string, string> = {
  h: '#4a2f1d', // волосы
  s: '#f0b587', // кожа
  e: '#20222a', // глаз
  x: '#e04430', // глаз (X)
  j: '#2f4a7d', // олимпийка
  w: '#e8e4d8', // лампасы
  p: '#27395e', // штаны
  b: '#1c1a17', // ботинок
  u: '#c9c2b4', // подошва
  m: '#3a2517', // усы
};

// ---------- ПАССАЖИР (бег, 2 кадра) ----------
const RUN_HEAD = [
  '....hhhhhh....',
  '...hhhhhhhh...',
  '...hssssssh...',
  '...hsessesh...',
  '...ssssssss...',
  '...ssmmmmss...',
  '....ssssss....',
  '..jjjjjjjjjj..',
  '.jjwjjjjjjwjj.',
];

export const RUN_A: Sprite = {
  w: 14,
  pal: PAL_PLAYER,
  rows: [
    ...RUN_HEAD,
    '.jjjjjjjjjjs..',
    '.jjjjjjjjjj...',
    '..jjjjjjjj....',
    '..pppppppp....',
    '..ppp..ppp....',
    '.ppp....ppp...',
    '.bbb....bbb...',
    'uuu......uuu..',
  ],
};

export const RUN_B: Sprite = {
  w: 14,
  pal: PAL_PLAYER,
  rows: [
    ...RUN_HEAD,
    '.jjjjjjjjjjs..',
    '.jjjjjjjjjj...',
    '..jjjjjjjj....',
    '..pppppppp....',
    '...pppppp.....',
    '...ppp.pp.....',
    '...bbb.bbb....',
    '..uuu..uuu....',
  ],
};

export const JUMP: Sprite = {
  w: 14,
  pal: PAL_PLAYER,
  rows: [
    ...RUN_HEAD,
    'sjjjjjjjjjjs..',
    '.jjjjjjjjjj...',
    '..jjjjjjjj....',
    '..pppppppp....',
    '..pppppppp....',
    '..ppp..ppp....',
    '..bbb..bbb....',
    '..uuu..uuu....',
  ],
};

export const DEAD: Sprite = {
  w: 14,
  pal: PAL_PLAYER,
  rows: [
    '....hhhhhh....',
    '...hhhhhhhh...',
    '...hssssssh...',
    '...hsxssxsh...',
    '...ssssssss...',
    '...ssmmmmss...',
    '....ssssss....',
    '..jjjjjjjjjj..',
    '.jjwjjjjjjwjj.',
    '.jjjjjjjjjjs..',
    '.jjjjjjjjjj...',
    '..jjjjjjjj....',
    '..pppppppp....',
    '..ppp..ppp....',
    '.ppp....ppp...',
    'bbb......bbb..',
    'uuu......uuu..',
  ],
};

// ---------- ПАССАЖИР ПРИГНУЛСЯ ----------
export const DUCK: Sprite = {
  w: 22,
  pal: PAL_PLAYER,
  rows: [
    '..............hhhhhh..',
    '.............hhhhhhhh.',
    '.............hsessesh.',
    '.............ssssssss.',
    '.....jjjjjjjjssmmmmss.',
    '....jjjjjjjjjjjjjjjj..',
    '...jjwjjjjjjjjjjjjjj..',
    '...jjjjjjjjjjjjjjjjj..',
    '..pppppppppppppppp....',
    '..pppp..pppp..........',
    '..bbbb..bbbb..........',
    '.uuuuu..uuuuu.........',
  ],
};

// ---------- НОГИ В ЧЁРНЫХ НОСКАХ (с верхней полки) ----------
export const FEET: Sprite = {
  w: 12,
  pal: { p: '#4a4f5a', k: '#17171c', u: '#3a3a42' },
  rows: [
    '....ppp.....',
    '....ppp.....',
    '....ppp.....',
    '....kkk.....',
    '....kkk.....',
    '...kkkk.....',
    '..kkkkk.....',
    '.kkkkkk.....',
    '.kkkkkkkk...',
    '.kkkkkkkkk..',
    '.uukkkkkkk..',
    '..uuuuuuu...',
  ],
};

// ---------- БУТЫЛКА ----------
export const BOTTLE: Sprite = {
  w: 7,
  pal: { c: '#d0342c', g: '#2e7d4f', l: '#5cb483' },
  rows: [
    '..cc...',
    '..cc...',
    '..gg...',
    '..gg...',
    '.gggg..',
    '.gggg..',
    'ggggggg',
    'glggggg',
    'glggggg',
    'glggggg',
    'glggggg',
    'glggggg',
    'glggggg',
    'glggggg',
    'ggggggg',
    'ggggggg',
  ],
};

// ---------- ТАПОК ----------
export const SLIPPER: Sprite = {
  w: 16,
  pal: { f: '#e8b7c6', h: '#8a5560', r: '#c0453e', d: '#6e2a26' },
  rows: [
    '....ffffffff....',
    '..ffffffffff....',
    '.fffhhfffffff...',
    '.ffffffffffffff.',
    'rrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrr',
    'dddddddddddddddd',
  ],
};

// ---------- ЧЕМОДАН ----------
export const SUITCASE: Sprite = {
  w: 20,
  pal: { b: '#8a5a33', c: '#5e3a1e', s: '#3f2814', h: '#5e3a1e' },
  rows: [
    '........hhhh........',
    '.......hhhhhh.......',
    'cccccccccccccccccccc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cbbbbbsbbbbbsbbbbbbc',
    'cccccccccccccccccccc',
  ],
};

// ---------- КЛЕТЧАТАЯ СУМКА ----------
export const FLOORBAG: Sprite = {
  w: 16,
  pal: { r: '#b03a30', d: '#6e1f1a', h: '#4a1210' },
  rows: [
    '.....hh..hh.....',
    '.....h....h.....',
    'rrrdrrrrdrrrrdrr',
    'rrrdrrrrdrrrrdrr',
    'rrrdrrrrdrrrrdrr',
    'dddddddddddddddd',
    'rrrdrrrrdrrrrdrr',
    'rrrdrrrrdrrrrdrr',
    'rrrdrrrrdrrrrdrr',
    'dddddddddddddddd',
    'rrrdrrrrdrrrrdrr',
    'rrrdrrrrdrrrrdrr',
  ],
};

// ---------- ДОРОЖНАЯ СУМКА С ПОЛКИ ----------
export const RACKBAG: Sprite = {
  w: 14,
  pal: { u: '#3d5a80', z: '#cfd6dd', k: '#2b3f5c' },
  rows: [
    '...uuuuuuuu.....',
    '.uuuuuuuuuuuu...',
    'uuuuuuuuuuuuuu',
    'uzzzzzzzzzzzzu',
    'uuuuuuuuuuuuuu',
    'uuuuuuuuuuuuuu',
    'uuuuuuuuuuuuuu',
    'uuuuuuuuuuuuuu',
    '.uuuuuuuuuuuu.',
    '.kkkkkkkkkkkk.',
    '..kkkkkkkkkk..',
  ],
};

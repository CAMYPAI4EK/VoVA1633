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

// ---------- ПРОВОДНИЦА ТАНЯ В СВАДЕБНОМ ПЛАТЬЕ ----------
export const TANYA: Sprite = {
  w: 16,
  pal: {
    t: '#d9a53f', // диадема
    h: '#2b1f16', // волосы
    s: '#f0b587', // кожа
    e: '#20222a', // глаз
    l: '#c94f4f', // губы
    v: '#efe8ec', // фата
    W: '#f7f4f0', // платье
    S: '#d9d2dc', // тени платья
    b: '#e86a8a', // букет
    g: '#3e7d4f', // зелень букета
    u: '#8a4a3a', // туфельки
  },
  rows: [
    '................',
    '.....tttttt.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hssssssshh...',
    '...hsessesh.....',
    '...ssssssss.....',
    '....slllls......',
    '....ssssss......',
    '..vvvvvvvvvvv...',
    '.vvWWWWWWWWvv...',
    '.vWWWWWWWWWWv...',
    'ssWbbWWWWWWW....',
    '.WbbggWWWWWW....',
    '.WWWWWWWWWWWW...',
    '.WWWWWWWWWWWW...',
    '.WWWWWWWWWWWW...',
    '..WWWWWWWWWW....',
    '.WWWWWWWWWWWW...',
    'WWWWWWWWWWWWWW..',
    'WWSSWWWWWWSSWW..',
    'WWWWWWWWWWWWWW..',
    '.WWWWWWWWWWWW...',
    '....uu..uu......',
  ],
};

// ---------- СЕРДЦА ----------
export const HEART_R: Sprite = {
  w: 7,
  pal: { r: '#e04356' },
  rows: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
};

export const HEART_P: Sprite = {
  w: 7,
  pal: { r: '#ff8fb0' },
  rows: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
};

// ---------- БЕЛЫЕ ГОЛУБКИ ----------
export const DOVE_A: Sprite = {
  w: 12,
  pal: { w: '#f5f2ea', e: '#20222a', o: '#e8912a' },
  rows: [
    '...ww.......',
    '..wwww......',
    '.wwwwwewoo..',
    '..wwwwwwwo..',
    '....wwww....',
    '....wwww....',
    '.....ww.....',
    '......ww....',
  ],
};

export const DOVE_B: Sprite = {
  w: 12,
  pal: { w: '#f5f2ea', e: '#20222a', o: '#e8912a' },
  rows: [
    '............',
    '............',
    '.wwwwwewoo..',
    '..wwwwwwwo..',
    '..wwwwww....',
    '...wwwww....',
    '..wwww......',
    '.wwww.......',
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

// ---------- ФОТОГРАФИЯ (подбираемый предмет) ----------
export const PHOTO_ITEM: Sprite = {
  w: 12,
  pal: {
    w: '#f2ead9',
    u: '#d8cdb4',
    s: '#a9d4e6',
    y: '#ffcf5e',
    g: '#4f9e63',
    G: '#2f6e46',
  },
  rows: [
    'wwwwwwwwwwww',
    'wssssssssssw',
    'wsyssssssssw',
    'wsyssssssssw',
    'wssssssgsssw',
    'wgggggsggssw',
    'wGGgggggggsw',
    'wGGGGGGGGGgw',
    'wGGGGGGGGGGw',
    'wwwwwwwwwwww',
    'wwwwwwwwwwww',
    'wuuuuuuuuuuw',
    'wuuuuuuuuuuw',
    'uuuuuuuuuuuu',
  ],
};

// ---------- 16 КАДРОВ ФОТОАЛЬБОМА (маршрут №037) ----------
export interface PhotoArt extends Sprite {
  id: number;
  title: string;
}

export const PHOTOS: PhotoArt[] = [
  {
    id: 1,
    title: 'Вокзал Новосибирск',
    w: 18,
    pal: { s: '#b8d9e6', g: '#2e6b4f', r: '#a8503a', c: '#f2e6c8', d: '#241d18' },
    rows: [
      'ssssssssssssssssss',
      'ssssssggggggssssss',
      'ssssssggggggssssss',
      'ssssssrrrrrrssssss',
      'ssssssrrccrrssssss',
      'ssssssrrccrrssssss',
      'ssssssrrrrrrssssss',
      'srrrrrrrrrrrrrrrrs',
      'srrrrrrrrrrrrrrrrs',
      'srrdrrdrrrrdrrdrrs',
      'srrrrrrrddrrrrrrrs',
      'ssssssssddssssssss',
    ],
  },
  {
    id: 2,
    title: 'Проводница',
    w: 18,
    pal: { v: '#2f4a41', u: '#7a2f3a', h: '#5e3a26', s: '#f0b587', e: '#20222a', w: '#f2e6c8' },
    rows: [
      'vvvvvvvvvvvvvvvvvv',
      'vvvvvuuuuuuvvvvvvv',
      'vvvvuuuuuuuuvvvvvv',
      'vvvvhhhhhhhhvvvvvv',
      'vvvvhsssssshvvvvvv',
      'vvvvhssesseshvvvvv',
      'vvvvvsssssssvvvvvv',
      'vvvuuuuuuuuuuvvvvv',
      'vvvuuwuuuuwuuuvvvv',
      'vvvuuuuuuuuuuuvvvv',
      'vvvuuuuuuuuuuuvvvv',
      'vvvvvvvvvvvvvvvvvv',
    ],
  },
  {
    id: 3,
    title: 'Самовар',
    w: 18,
    pal: { a: '#8a5a33', y: '#d8b25e', Y: '#8a6a2a', d: '#3a2814', w: '#e8dcc8', t: '#5e3a1e' },
    rows: [
      'aaaaaaaaaaaaaaaaaa',
      'aaaaaaaawwaaaaaaaa',
      'aaaaaaayyyaaaaaaaa',
      'aaaaaayyyyyaaaaaaa',
      'aaaaayyyyyyyaaaaaa',
      'aaaaayyyyyyyaaaaaa',
      'aaaaayyddyyyaaaaaa',
      'aaaaaYYYYYYYaaaaaa',
      'aaaaaaaYYYYaaaaaaa',
      'tttttttttttttttttt',
      'tttttttttttttttttt',
      'tttttttttttttttttt',
    ],
  },
  {
    id: 4,
    title: 'Чай в подстаканнике',
    w: 18,
    pal: { v: '#2f4a41', c: '#c9a24a', C: '#8a6a2a', g: '#f5e6c8', t: '#b5651d', w: '#e8dcc8' },
    rows: [
      'vvvvvvvvvvvvvvvvvv',
      'vvvvvwwvvvwwvvvvvv',
      'vvvvvwvvvvwvvvvvvv',
      'vvvvvvggggvvvvvvvv',
      'vvvvvvgttgvvvvvvvv',
      'vvvvvvgttgvvvvvvvv',
      'vvvvccgttgccvvvvvv',
      'vvvvcccccccvvvvvvv',
      'vvvvcCCCCCcvvvvvvv',
      'vvvvcccccccvvvvvvv',
      'vvvvvvvvvvvvvvvvvv',
      'vvvvvvvvvvvvvvvvvv',
    ],
  },
  {
    id: 5,
    title: 'Берёзки',
    w: 18,
    pal: {
      s: '#bfe0e8',
      m: '#7fae5a',
      M: '#5c8a42',
      W: '#efece0',
      d: '#241d18',
      G: '#5fa05f',
      L: '#8cc47a',
    },
    rows: [
      'ssssssssssssssssss',
      'sssGGssssssGGsssss',
      'ssGLLGssssGLLGssss',
      'ssGLLGssssGLLGssss',
      'sssGGssssssGGsssss',
      'ssssWsssssssWsssss',
      'ssssWdsssssdWsssss',
      'ssssWssdssssWsssss',
      'ssssWdsssssWdsssss',
      'mmmmmmmmmmmmmmmmmm',
      'MMMMMMMMMMMMMMMMMM',
      'mmmmmmmmmmmmmmmmmm',
    ],
  },
  {
    id: 6,
    title: 'Мост через Обь',
    w: 18,
    pal: { s: '#eeb56e', y: '#ffe08a', k: '#2f3a46', d: '#141a22', b: '#3a6e8a', B: '#5a92ab' },
    rows: [
      'ssssssssssssssssss',
      'ssssssssyyssssssss',
      'ssssssyyyyyyssssss',
      'ssssssyyyyyyssssss',
      'ssssssssssssssssss',
      'kkkkkkkkkkkkkkkkkk',
      'kkkdkkkdkkkdkkkdkk',
      'bbbkkbbbkkbbbkkbbb',
      'BbBbBbBbBbBbBbBbBb',
      'BbbBbbBbbBbbBbbBbb',
      'bbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbb',
    ],
  },
  {
    id: 7,
    title: 'Омск',
    w: 18,
    pal: {
      s: '#b8d9e6',
      l: '#8a5a33',
      L: '#5e3a1e',
      g: '#2e6b6b',
      d: '#1d3535',
      r: '#6e2a26',
      W: '#e8e8e2',
    },
    rows: [
      'ssssssssssssssssss',
      'sssssrrrrrrrrsssss',
      'ssssrrrrrrrrrrssss',
      'ssllllllllllllllss',
      'ssllggllllllggllss',
      'ssllgdllllllgdllss',
      'ssllggllllllggllss',
      'ssllllllllllllllss',
      'ssllllllLLllllllss',
      'ssllllllLLllllllss',
      'WWWWWWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWWWWWW',
    ],
  },
  {
    id: 8,
    title: 'Тюмень',
    w: 18,
    pal: { o: '#d97f4a', O: '#eeb56e', K: '#241d18', g: '#3a2a1a' },
    rows: [
      'oooooooooooooooooo',
      'ooooOOoooooooooooo',
      'ooooOOoooooooooooo',
      'oooooooooooooooooo',
      'ooooooooKooooooooo',
      'oooooooKKKoooooooo',
      'ooooooKKKKKooooooo',
      'oooooKKKKKKKoooooo',
      'ooooKKKKKKKKKooooo',
      'ggggKKKKKKKKKggggg',
      'gggggggggggggggggg',
      'gggggggggggggggggg',
    ],
  },
  {
    id: 9,
    title: 'Уральские горы',
    w: 18,
    pal: { s: '#b8d9e6', W: '#f2f2ee', M: '#6a7280', g: '#2e6b4f', G: '#1f4a38' },
    rows: [
      'ssssssssssssssssss',
      'ssssssMMMsssssssss',
      'sssssMMWMMssMsssss',
      'ssssMMWWWMMMMsssss',
      'sssMMMMWWMMMMMssss',
      'ssMMMMMMMMMMMMMsss',
      'sMMMMMMMMMMMMMMMss',
      'sMMMMMMMMMMMMMMMss',
      'sgggggMMMMMgggggss',
      'gggggggggggggggggg',
      'GgGgGgGgGgGgGgGgGg',
      'gggggggggggggggggg',
    ],
  },
  {
    id: 10,
    title: 'Екатеринбург',
    w: 18,
    pal: { s: '#b8d9e6', W: '#e8e8e2', w: '#c4c4ba', d: '#241d18', g: '#5c8a42' },
    rows: [
      'ssssssssssssssssss',
      'sssssWWWWWWsssssss',
      'sssssWWWWWssssssss',
      'ssssswWWWsssssssss',
      'sssssWdWWsssssssss',
      'sssssWWWssssssssss',
      'sssssWWWssssssssss',
      'ssssWWssWWssssssss',
      'ssssWWssWWssssssss',
      'ggggWWggWWgggggggg',
      'gggggggggggggggggg',
      'gggggggggggggggggg',
    ],
  },
  {
    id: 11,
    title: 'Река Кама',
    w: 18,
    pal: { s: '#b8d9e6', y: '#ffe08a', b: '#3a6e8a', B: '#5a92ab', k: '#241d18', r: '#a8322e' },
    rows: [
      'ssssssssssssssssss',
      'ssssssyyssssssssss',
      'ssssssyyssssssssss',
      'ssssssssssssssssss',
      'bbbbbbbbbbbbbbbbbb',
      'bbbbbkkkkkkbbbbbbb',
      'bbbbkkrrrrkkbbbbbb',
      'bbbbkkkkkkkkbbbbbb',
      'BbBbBbBbBbBbBbBbBb',
      'bbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbbbb',
    ],
  },
  {
    id: 12,
    title: 'Казань',
    w: 18,
    pal: { s: '#b8d9e6', y: '#ffcf5e', w: '#e8e0cc', d: '#241d18' },
    rows: [
      'ssssssssysssssssss',
      'sssssssyysssssssss',
      'ssssssswwsssssssss',
      'sssssswwwwssssssss',
      'sssssswwwwssssssss',
      'ssssswwwwwwsssssss',
      'ssssswwdwwssssssss',
      'sssswwwwwwwwssssss',
      'sssswwdwwdwwssssss',
      'ssswwwwwwwwwwsssss',
      'ssswwdwwwwdwwsssss',
      'ssswwwwwwwwwwsssss',
    ],
  },
  {
    id: 13,
    title: 'Нижний Новгород',
    w: 18,
    pal: { s: '#b8d9e6', r: '#a8322e', R: '#7d2622', w: '#e8e0cc', g: '#2e6b4f', d: '#241d18' },
    rows: [
      'ssssssssssssssssss',
      'ssssssggssssssssss',
      'sssssggggsssssssss',
      'ssssswwwwsssssssss',
      'ssssswwwwsssssssss',
      'ssssswwwwsssssssss',
      'ssssswwwwrrrrrrrrr',
      'ssssswwwwrRrRrRrRr',
      'ssssswwwwrrrrrrrrr',
      'ssssswwwwrRrRrRrRr',
      'gggggggggggggggggg',
      'gggggggggggggggggg',
    ],
  },
  {
    id: 14,
    title: 'Владимир',
    w: 18,
    pal: { s: '#b8d9e6', W: '#e8e0cc', y: '#ffcf5e', d: '#241d18', g: '#5c8a42' },
    rows: [
      'sssssssyysssssssss',
      'ssssssyyyyssssssss',
      'ssssssyyyyssssssss',
      'sssssWWWWWWsssssss',
      'sssssWWWWWWsssssss',
      'ssssWWWWWWWWssssss',
      'ssssWWWWWWWWssssss',
      'ssssWWdWWWdWWsssss',
      'ssssWWWdddWWWsssss',
      'ssssWWWdddWWWsssss',
      'ssssWWWdddWWWsssss',
      'gggggggggggggggggg',
    ],
  },
  {
    id: 15,
    title: 'Подмосковье',
    w: 18,
    pal: {
      s: '#b8d9e6',
      g: '#2e6b4f',
      G: '#4f9e63',
      l: '#8a5a33',
      r: '#6e2a26',
      w: '#ffe08a',
      m: '#7fae5a',
      f: '#e8e0cc',
    },
    rows: [
      'ssssssssssssssssss',
      'ssssGssssssGssssss',
      'sssGGGssssGGGsssss',
      'ssGGGGGssGGGGGssss',
      'ssssssrrrrrrssssss',
      'sssssrrrrrrrrsssss',
      'sssssllllllllsssss',
      'sssssllwllwllsssss',
      'sssssllllllllsssss',
      'mmfmmfmmfmmfmmfmmf',
      'mmmmmmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmmmmmm',
    ],
  },
  {
    id: 16,
    title: 'Москва',
    w: 18,
    pal: { n: '#14243a', w: '#f2e6c8', S: '#ff3b30', g: '#2e6b4f', r: '#a8322e', R: '#7d2622', c: '#f2e6c8', d: '#0d1420' },
    rows: [
      'nnnnnnnwnnnnnwnnnn',
      'nnnwnnnnnnwnnnnnwn',
      'nnnnnnnnSnnnnnnnnn',
      'nnnnnnngggnnnnnnnn',
      'nnnnnnrrrrrnnnnnnn',
      'nnnnnnrccrnnnnnnnn',
      'nnnnnnrrrrrnnnnnnn',
      'nnnrrrrrrrrrrrrrrn',
      'nnnrrRrrRrrRrrRrrn',
      'nnnrrrrrrrrrrrrrrn',
      'nnnrrrrrrrrrrrrrrn',
      'dddddddddddddddddd',
    ],
  },
];

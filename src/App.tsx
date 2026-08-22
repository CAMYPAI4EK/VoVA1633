import { Fragment, useEffect, useRef, useState } from 'react';
import { LEVELS, PlatskartGame } from './game/engine';
import type { GameState, HudData } from './game/engine';
import { pickQuestion } from './game/quiz';
import type { QuizQuestion } from './game/quiz';
import { PHOTOS, drawSprite } from './game/sprites';
import type { PhotoArt } from './game/sprites';

/* ---------- мелкие детали ---------- */

function Key({ children }: { children: React.ReactNode }) {
  return <span className="keycap">{children}</span>;
}

function TrainIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="14" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="7" y="6" width="10" height="5" rx="1" fill="#1d0e02" />
      <circle cx="8.5" cy="14" r="1.4" fill="#1d0e02" />
      <circle cx="15.5" cy="14" r="1.4" fill="#1d0e02" />
      <path d="M7 21l-1.5-2h13L17 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 17h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9l5 6m0-6l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path
          d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

function PhotoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="11" r="2" fill="currentColor" />
      <path
        d="M4.5 18l4.5-4.5 3 3 3.5-3.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RingsIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="14" r="6" stroke="#f0c040" strokeWidth="2.5" />
      <circle cx="15" cy="14" r="6" stroke="#f0c040" strokeWidth="2.5" />
      <path d="M15 4l2 2.5L15 9l-2-2.5L15 4z" fill="#cfe9ff" stroke="#9fc6e8" strokeWidth="1" />
    </svg>
  );
}

const fmt = (n: number) => String(Math.max(0, Math.floor(n))).padStart(5, '0');

/* ---------- квиз возрождения ---------- */

function QuizOverlay({
  onCorrect,
  onWrong,
  onSkip,
}: {
  onCorrect: () => void;
  onWrong: () => void;
  onSkip: () => void;
}) {
  const [q] = useState<QuizQuestion>(() => pickQuestion());
  const [picked, setPicked] = useState<number | null>(null);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    window.setTimeout(() => {
      if (i === q.correct) onCorrect();
      else onWrong();
    }, 700);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,11,9,0.66)] p-4">
      <div className="board board-in w-[min(560px,94vw)] rounded-lg px-6 py-6 sm:px-9 sm:py-7">
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-lamp-500/25 pb-3">
          <div className="font-display text-[9px] tracking-[0.25em] text-lamp-500/90">
            ВОПРОС ПРОВОДНИКА
          </div>
          <div className="flex items-center gap-2 font-display text-[8px] text-[#8fd6b8]">
            <span className="hud-pulse inline-block h-2 w-2 rounded-full bg-[#8fd6b8] shadow-[0_0_8px_#8fd6b8]" />
            ВОЗРОЖДЕНИЕ
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-rail-200/85">
          Володя упал, но поезд ещё можно догнать. Ответьте верно — и он вернётся в вагон{' '}
          <span className="font-medium text-lamp-300">на то же место</span>. Ошибётесь — маршрут
          начнётся сначала.
        </p>

        <div className="mt-4 rounded border border-lamp-500/25 bg-wagon-900/60 px-4 py-3.5 text-base font-medium leading-snug text-rail-100">
          {q.question}
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            let cls = 'opt-btn';
            if (picked !== null) {
              if (i === q.correct) cls += ' opt-correct';
              else if (i === picked) cls += ' opt-wrong';
              else cls += ' opt-dim';
            }
            return (
              <button key={opt} className={cls} onClick={() => answer(i)} disabled={picked !== null}>
                {opt}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div
            className={`mt-4 text-center font-display text-[10px] tracking-widest ${
              picked === q.correct ? 'text-[#8fd6b8]' : 'text-[#ff8a70]'
            }`}
          >
            {picked === q.correct ? 'ВЕРНО! ВОЗВРАЩАЕМСЯ В ВАГОН…' : 'НЕВЕРНО. ПОЕЗД УШЁЛ БЕЗ ВАС…'}
          </div>
        )}

        <button
          className="mt-5 w-full text-center text-xs text-rail-200/50 underline decoration-dotted underline-offset-4 transition-colors hover:text-rail-200/80"
          onClick={onSkip}
          disabled={picked !== null}
        >
          Не рисковать и сойти на конечной
        </button>
      </div>
    </div>
  );
}

/* ---------- свои фотографии (подменяют пиксель-арт) ----------
   Положите файлы в папку public/photos/ с именами 01.jpg … 16.jpg
   (также поддерживаются .jpeg, .png, .webp) и пересоберите проект.
   Номер файла = номер кадра в альбоме. Если файла нет — остаётся пиксель-арт. */

const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp'] as const;
const customPhotoCache = new Map<number, HTMLImageElement | null>();
const customPhotoPending = new Map<number, Promise<HTMLImageElement | null>>();

function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Ищет пользовательское фото для кадра id: photos/NN.jpg → .jpeg → .png → .webp. */
function loadCustomPhoto(id: number): Promise<HTMLImageElement | null> {
  if (customPhotoCache.has(id)) return Promise.resolve(customPhotoCache.get(id) ?? null);
  const cached = customPhotoPending.get(id);
  if (cached) return cached;
  const pad = String(id).padStart(2, '0');
  const promise = (async () => {
    const base = import.meta.env.BASE_URL ?? '/';
    for (const ext of PHOTO_EXTS) {
      const img = await tryLoadImage(`${base}photos/${pad}.${ext}`);
      if (img) {
        customPhotoCache.set(id, img);
        return img;
      }
    }
    customPhotoCache.set(id, null);
    return null;
  })();
  customPhotoPending.set(id, promise);
  return promise;
}

function useCustomPhoto(id: number): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    loadCustomPhoto(id).then((loaded) => {
      if (alive) setImg(loaded);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return img;
}

/** Вписывает картинку в прямоугольник (object-fit: cover). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > cr) {
    sw = img.height * cr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / cr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ---------- фотоальбом ---------- */

function PhotoCanvas({ art, id }: { art: PhotoArt; id: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const custom = useCustomPhoto(id);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (custom) {
      // своя фотография — рисуем в высоком разрешении, сглаженно
      const W = 378;
      const HH = 252;
      if (c.width !== W) c.width = W;
      if (c.height !== HH) c.height = HH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawCover(ctx, custom, 0, 0, W, HH);
    } else {
      // пиксель-арт
      const W = art.w * 7;
      const HH = art.rows.length * 7;
      if (c.width !== W) c.width = W;
      if (c.height !== HH) c.height = HH;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, HH);
      drawSprite(ctx, art, 0, 0, 7);
    }
  }, [art, custom]);
  return (
    <canvas
      ref={ref}
      className="block w-full rounded-[2px]"
      style={{ imageRendering: custom ? 'auto' : 'pixelated' }}
    />
  );
}

function AlbumOverlay({
  album,
  onClose,
  onReset,
}: {
  album: number[];
  onClose: () => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 2600);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const collected = new Set(album);
  const full = album.length >= PHOTOS.length;

  return (
    <div className="album-scroll board-in absolute inset-0 z-50 overflow-y-auto bg-[rgba(6,12,9,0.9)]">
      <div className="mx-auto w-[min(880px,94vw)] px-1 py-6 sm:py-8">
        <div className="board rounded-lg px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-display text-[8px] tracking-[0.22em] text-lamp-500/80">
                СКОРЫЙ №037 · НОВОСИБИРСК → МОСКВА
              </div>
              <h2 className="amber-glow mt-2 font-display text-2xl sm:text-3xl">ФОТОАЛЬБОМ</h2>
              <p className="mt-2 max-w-md text-xs text-rail-200/70">
                Снимки находятся по пути — в воздухе и под ногами. Очков за них не дают, зато
                дорога останется на память. Альбом сохраняется между поездками.
              </p>
            </div>
            <div className="text-right">
              <div className="font-display text-[7px] text-rail-200/60">СОБРАНО КАДРОВ</div>
              <div className="amber-glow font-display text-2xl">
                {album.length}
                <span className="text-sm text-rail-200/50">/16</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-1">
            {PHOTOS.map((p) => (
              <div
                key={p.id}
                className={`h-2.5 flex-1 rounded-sm transition-colors ${
                  collected.has(p.id)
                    ? 'bg-lamp-500 shadow-[0_0_8px_#ffc24b]'
                    : 'border border-rail-200/15 bg-wagon-950/70'
                }`}
                title={`${String(p.id).padStart(2, '0')} · ${p.title}`}
              />
            ))}
          </div>

          {full && (
            <div className="blink-hard mt-4 text-center font-display text-[10px] tracking-widest text-lamp-400">
              ★ АЛЬБОМ СОБРАН! ВЕСЬ ПУТЬ — В КАРМАШКЕ КУРТКИ ★
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {PHOTOS.map((p, i) =>
            collected.has(p.id) ? (
              <div
                key={p.id}
                className={`photo-card rounded-sm bg-[#f2ead9] p-2 pb-3 shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${
                  i % 2 ? 'rotate-1' : '-rotate-1'
                }`}
              >
                <PhotoCanvas art={p} id={p.id} />
                <div className="mt-2 text-center font-display text-[8px] leading-snug text-[#3a2f22]">
                  {String(p.id).padStart(2, '0')} · {p.title.toUpperCase()}
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-rail-200/20 bg-wagon-900/50 px-2 py-7 sm:py-9"
              >
                <div className="font-display text-2xl text-rail-200/20">?</div>
                <div className="mt-2 font-display text-[7px] tracking-widest text-rail-200/40">
                  КАДР {String(p.id).padStart(2, '0')}
                </div>
                <div className="mt-1 text-[10px] text-rail-200/35">ещё не снято</div>
              </div>
            ),
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            className="btn-train rounded-md px-6 py-3.5 text-[10px] tracking-widest"
            onClick={onClose}
          >
            ВЕРНУТЬСЯ В ВАГОН
          </button>
          <button
            className={`btn-ghost rounded-md px-4 py-3 text-[9px] tracking-widest ${
              confirming ? '!border-[#ff8a70]/70 !text-[#ff8a70]' : ''
            }`}
            onClick={() => {
              if (confirming) {
                onReset();
                setConfirming(false);
              } else {
                setConfirming(true);
              }
            }}
            disabled={album.length === 0}
          >
            {confirming ? 'ТОЧНО СБРОСИТЬ?' : 'СБРОСИТЬ АЛЬБОМ'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- приложение ---------- */

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<PlatskartGame | null>(null);
  const [gs, setGs] = useState<GameState>('menu');
  const [hud, setHud] = useState<HudData>({
    score: 0,
    best: 0,
    kmh: 40,
    newBest: false,
    level: 1,
    levelName: LEVELS[0].name,
    progress: 0,
    revive: true,
  });
  const [muted, setMuted] = useState(false);
  const [god, setGod] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [album, setAlbum] = useState<number[]>([]);
  const [view, setView] = useState<'game' | 'album'>('game');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const eng = new PlatskartGame(canvas, {
      onState: setGs,
      onHud: setHud,
      onToast: (t) => setToast({ id: Date.now(), text: t }),
      onMute: setMuted,
      onAlbum: (ids) => setAlbum([...ids].sort((a, b) => a - b)),
      onPhoto: (p) =>
        setToast({
          id: Date.now(),
          text: `ФОТО: «${p.title}» · ${p.count}/${p.total}`,
        }),
    });
    engRef.current = eng;
    return () => {
      eng.destroy();
      engRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const eng = () => engRef.current;
  const inRun = gs === 'playing' || gs === 'paused' || gs === 'dying';

  return (
    <div className="relative h-full w-full overflow-hidden bg-wagon-950 font-body text-rail-200">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

      {/* плёнки */}
      <div
        className={`crt-lines pointer-events-none absolute inset-0 z-20 ${
          gs === 'transition' ? 'crt-soft' : ''
        }`}
      />
      <div className="vignette pointer-events-none absolute inset-0 z-20" />

      {/* -------- HUD -------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <div className="panel pointer-events-auto flex items-center gap-1 rounded-md p-1">
            <button
              className={`tab-btn ${view === 'game' ? 'tab-active' : ''}`}
              onClick={() => setView('game')}
              title="Вернуться в вагон"
            >
              <TrainIcon className="h-4 w-4" />
              ВАГОН
            </button>
            <button
              className={`tab-btn ${view === 'album' ? 'tab-active' : ''}`}
              onClick={() => {
                if (gs === 'playing') eng()?.togglePause();
                setView('album');
              }}
              title="Фотоальбом маршрута"
            >
              <PhotoIcon className="h-4 w-4" />
              АЛЬБОМ
              <span className="rounded-sm border border-lamp-500/40 bg-wagon-950/70 px-1.5 py-0.5 font-display text-[7px] leading-none text-lamp-400">
                {album.length}/16
              </span>
            </button>
          </div>
          {inRun && (
            <div className="panel hidden rounded-md px-4 py-2.5 leading-tight sm:block">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[9px] text-lamp-400">УР. {hud.level}/4</span>
                <span className="font-display text-[6px] tracking-wider text-rail-200/55">
                  {hud.levelName}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-[130px] overflow-hidden rounded-sm border border-rail-200/20 bg-wagon-950/80">
                <div
                  className="h-full bg-lamp-500 shadow-[0_0_8px_#ffc24b] transition-[width] duration-300"
                  style={{ width: `${Math.round(hud.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setGod(eng()?.toggleGod() ?? false)}
            title="Скорость"
            aria-label="Скорость"
            className={`panel pointer-events-auto hidden cursor-pointer rounded-md px-4 py-2.5 text-right transition-all duration-200 sm:block ${
              god ? 'god-speed' : ''
            }`}
          >
            <div className={`font-display text-[7px] ${god ? 'text-[#ffb3a3]' : 'text-rail-200/60'}`}>
              СКОРОСТЬ
            </div>
            <div className={`font-display text-[11px] ${god ? 'text-[#ff6a4d]' : 'text-lamp-300'}`}>
              {hud.kmh}{' '}
              <span className={`text-[7px] ${god ? 'text-[#ff9a85]' : 'text-rail-200/50'}`}>КМ/Ч</span>
            </div>
          </button>
          <div className="panel rounded-md px-4 py-2.5 text-right">
            <div className="font-display text-[7px] text-rail-200/60">РЕКОРД</div>
            <div className="font-display text-[11px] text-rail-200/80">{fmt(hud.best)}</div>
          </div>
          <div className="panel panel-dark rounded-md px-4 py-2.5 text-right">
            <div className="font-display text-[7px] text-lamp-500/80">СЧЁТ</div>
            <div className="amber-glow font-display text-lg leading-none sm:text-xl">
              {fmt(hud.score)}
            </div>
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              className="btn-ghost flex h-9 w-9 items-center justify-center rounded-md"
              onClick={() => eng()?.toggleMute()}
              title="Звук (M)"
              aria-label="Звук"
            >
              <SoundIcon muted={muted} />
            </button>
            {gs === 'playing' && (
              <button
                className="btn-ghost flex h-9 w-9 items-center justify-center rounded-md"
                onClick={() => eng()?.togglePause()}
                title="Пауза (P)"
                aria-label="Пауза"
              >
                <PauseIcon />
              </button>
            )}
            {inRun && hud.revive && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#8fd6b8]/40 bg-[#0f2b22]/85 text-center font-display text-[7px] leading-none text-[#8fd6b8]"
                title="Доступно одно возрождение — ответьте на вопрос проводника"
              >
                1×
              </div>
            )}
          </div>
        </div>
      </header>

      {/* -------- тост (станции, стоп-кран) -------- */}
      {toast && (
        <div
          key={toast.id}
          className="board-in pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 sm:top-24"
        >
          <div className="panel-dark rounded px-5 py-2.5 font-display text-[10px] tracking-widest text-lamp-400">
            {toast.text}
          </div>
        </div>
      )}

      {/* -------- подсказка управления -------- */}
      {gs === 'playing' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-4 opacity-70 md:flex">
          <span className="flex items-center gap-1.5 text-xs text-rail-200/80">
            <Key>SPACE</Key>/<Key>↑</Key> прыжок
          </span>
          <span className="flex items-center gap-1.5 text-xs text-rail-200/80">
            <Key>↓</Key> пригнуться
          </span>
          <span className="flex items-center gap-1.5 text-xs text-rail-200/80">
            <Key>P</Key> пауза
          </span>
        </div>
      )}

      {/* -------- сенсорные кнопки -------- */}
      {gs === 'playing' && (
        <>
          <button
            className="touch-btn touch-only absolute bottom-6 left-5 z-30 px-6 py-5 text-[10px] tracking-widest"
            onPointerDown={(e) => {
              e.preventDefault();
              eng()?.duckOn();
            }}
            onPointerUp={() => eng()?.duckOff()}
            onPointerLeave={() => eng()?.duckOff()}
            onPointerCancel={() => eng()?.duckOff()}
          >
            ПРИГНУТЬСЯ
          </button>
          <button
            className="touch-btn touch-only absolute bottom-6 right-5 z-30 px-8 py-5 text-[10px] tracking-widest"
            onPointerDown={(e) => {
              e.preventDefault();
              eng()?.jumpPress();
            }}
          >
            ПРЫЖОК
          </button>
        </>
      )}

      {/* -------- экраны -------- */}
      {gs === 'menu' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,11,9,0.55)] p-4">
          <div className="board board-in w-[min(700px,94vw)] rounded-lg px-6 py-6 sm:px-10 sm:py-8">
            <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-lamp-500/25 pb-3">
              <div className="font-display text-[8px] tracking-[0.2em] text-lamp-500/90">
                РОССИЙСКИЕ ЖЕЛЕЗНЫЕ ДОРОГИ
              </div>
              <div className="flex items-center gap-2 font-display text-[8px] text-lamp-400">
                <span className="hud-pulse inline-block h-2 w-2 rounded-full bg-lamp-400 shadow-[0_0_8px_#ffc24b]" />
                СКОРЫЙ №037
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="amber-glow font-display text-4xl leading-none sm:text-5xl">
                  ПЛАЦКАРТ
                </h1>
                <div className="red-glow mt-3 font-display text-[11px] tracking-[0.25em] sm:text-xs">
                  БЕГИ, ВОЛОДЯ!
                </div>
              </div>
              <div className="rounded border-2 border-brake-500/70 px-3 py-2 text-right">
                <div className="font-display text-[7px] text-rail-200/60">РЕКОРД МАРШРУТА</div>
                <div className="amber-glow font-display text-base">{fmt(hud.best)}</div>
              </div>
            </div>

            <div className="rise-in mt-5 space-y-1.5 text-sm text-rail-200/90">
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">НОВОСИБИРСК → МОСКВА</span>
                <span className="flex-1 border-b border-dotted border-rail-200/25" />
                <span className="font-display text-[8px] text-lamp-400">3335 КМ</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">ПАССАЖИР: ВОЛОДЯ</span>
                <span className="flex-1 border-b border-dotted border-rail-200/25" />
                <span className="font-display text-[8px] text-lamp-400">СТУДОТРЯД</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">ВАГОН 09 · МЕСТО 24</span>
                <span className="flex-1 border-b border-dotted border-rail-200/25" />
                <span className="font-display text-[8px] text-lamp-400">У ОКНА</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">ОТПРАВЛЕНИЕ</span>
                <span className="flex-1 border-b border-dotted border-rail-200/25" />
                <span className="blink-hard font-display text-[8px] text-lamp-400">СЕЙЧАС</span>
              </div>
            </div>

            <div className="rise-in-2 mt-5 rounded border border-brake-500/40 bg-brake-600/10 px-4 py-3">
              <div className="font-display text-[8px] tracking-widest text-[#ff9a7d]">
                ОСТОРОЖНО, ПРОХОД ЗАГРОМОЖДЁН:
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-rail-200/85">
                {['бутылки', 'тапки', 'чемоданы', 'клетчатые сумки', 'ноги в чёрных носках'].map(
                  (s) => (
                    <span
                      key={s}
                      className="rounded-sm border border-rail-200/20 bg-wagon-900/60 px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rise-in-2 mt-5 rounded border border-lamp-500/25 bg-wagon-900/50 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[8px] tracking-widest text-rail-200/60">
                  УРОВНИ МАРШРУТА
                </span>
                <span className="font-display text-[7px] text-lamp-500/80">900 ОЧКОВ = КОНЕЦ ПУТИ</span>
              </div>
              <div className="mt-3 flex items-start">
                {LEVELS.map((L, i) => (
                  <Fragment key={L.name}>
                    {i > 0 && (
                      <div className="mt-3 h-0 flex-1 border-t-2 border-dotted border-lamp-500/40" />
                    )}
                    <div className="flex flex-col items-center px-0.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-lamp-400 bg-wagon-950 font-display text-[10px] text-lamp-400">
                        {i + 1}
                      </div>
                      <div className="mt-1 w-16 text-center text-[9px] leading-tight text-rail-200/75">
                        {L.name}
                      </div>
                      <div className="font-display text-[7px] text-lamp-500/80">{L.to}</div>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="rise-in-2 mt-5 grid gap-2 text-xs text-rail-200/85 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Key>SPACE</Key>
                <Key>↑</Key>
                <span>— прыжок через бутылки</span>
              </div>
              <div className="flex items-center gap-2">
                <Key>↓</Key>
                <span>— пригнуться под ноги и сумки</span>
              </div>
              <div className="flex items-center gap-2">
                <Key>P</Key>
                <span>— стоянка (пауза)</span>
              </div>
              <div className="flex items-center gap-2">
                <Key>M</Key>
                <span>— звук; фото по пути — в альбом</span>
              </div>
            </div>
            <div className="mt-2.5 rounded border border-[#8fd6b8]/30 bg-[#0f2b22]/50 px-4 py-2 text-xs text-[#a9e3cb]">
              Упали? Один раз за поездку проводник даст вопрос — ответите верно и вернётесь на то
              же место. Ошибка — и маршрут с нуля.
            </div>

            <div className="rise-in-3 mt-6 flex flex-wrap items-center justify-between gap-4">
              <button
                className="btn-train flex items-center gap-3 rounded-md px-7 py-4 text-[11px] tracking-widest"
                onClick={() => eng()?.start()}
              >
                <TrainIcon className="h-5 w-5" />
                ОТПРАВЛЕНИЕ
              </button>
              <div className="blink-hard font-display text-[9px] text-lamp-400/90">
                ИЛИ НАЖМИ ПРОБЕЛ
              </div>
            </div>
          </div>
        </div>
      )}

      {gs === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,11,9,0.6)] p-4">
          <div className="board board-in w-[min(440px,92vw)] rounded-lg px-8 py-8 text-center">
            <div className="font-display text-[9px] tracking-[0.3em] text-lamp-500/80">
              ТЕХНИЧЕСКАЯ
            </div>
            <h2 className="amber-glow mt-2 font-display text-3xl">СТОЯНКА</h2>
            <p className="mt-4 text-sm text-rail-200/80">
              Поезд стоит. Чай стынет. Проводница недовольна.
            </p>
            <button
              className="btn-train mx-auto mt-6 rounded-md px-6 py-3.5 text-[10px] tracking-widest"
              onClick={() => eng()?.togglePause()}
            >
              ПРОДОЛЖИТЬ — P
            </button>
          </div>
        </div>
      )}

      {gs === 'quiz' && (
        <QuizOverlay
          onCorrect={() => eng()?.revive()}
          onWrong={() => eng()?.failQuiz()}
          onSkip={() => eng()?.skipRevive()}
        />
      )}

      {/* -------- фотоальбом -------- */}
      {view === 'album' && (
        <AlbumOverlay
          album={album}
          onClose={() => setView('game')}
          onReset={() => eng()?.resetAlbum()}
        />
      )}

      {gs === 'gameover' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,11,9,0.6)] p-4">
          <div className="board board-in relative w-[min(520px,94vw)] overflow-hidden rounded-lg px-6 py-7 sm:px-9">
            <div className="stamp-in pointer-events-none absolute right-4 top-5 rounded border-[3px] border-brake-500/80 px-3 py-1.5 font-display text-sm text-brake-500/90">
              ПРОЕХАЛ
            </div>
            <div className="font-display text-[9px] tracking-[0.3em] text-[#ff9a7d]">
              ПОЕЗД ДАЛЬШЕ НЕ ИДЁТ
            </div>
            <h2 className="red-glow mt-2 font-display text-3xl sm:text-4xl">КОНЕЧНАЯ</h2>
            <p className="mt-3 max-w-sm text-sm text-rail-200/80">
              Володя споткнулся в проходе и не доехал до своей станции. Бойцовка цела, джинсы тоже, а
              вещи его, впрочем, на месте.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded border border-lamp-500/30 bg-wagon-900/70 px-4 py-3">
                <div className="font-display text-[7px] text-rail-200/60">ПРОЙДЕНО</div>
                <div className="amber-glow mt-1 font-display text-xl">{fmt(hud.score)}</div>
              </div>
              <div className="rounded border border-lamp-500/30 bg-wagon-900/70 px-4 py-3">
                <div className="font-display text-[7px] text-rail-200/60">РЕКОРД</div>
                <div className="mt-1 font-display text-xl text-rail-200/90">{fmt(hud.best)}</div>
              </div>
            </div>

            {hud.newBest && (
              <div className="blink-hard mt-3 text-center font-display text-[10px] tracking-widest text-lamp-400">
                ★ НОВЫЙ РЕКОРД МАРШРУТА ★
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="btn-train rounded-md px-6 py-3.5 text-[10px] tracking-widest"
                onClick={() => eng()?.restart()}
              >
                ЕЩЁ ПОЕЗДКА
              </button>
              <button
                className="btn-ghost rounded-md px-5 py-3.5 text-[10px] tracking-widest"
                onClick={() => eng()?.toMenu()}
              >
                В ДЕПО
              </button>
              <span className="ml-auto hidden font-display text-[8px] text-rail-200/50 sm:block">
                ПРОБЕЛ — РЕВАНШ
              </span>
            </div>
          </div>
        </div>
      )}

      {gs === 'wedding' && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center p-4 pb-6 sm:pb-10">
          <div className="board board-in pointer-events-auto w-[min(560px,94vw)] rounded-lg px-6 py-5 text-center sm:px-8">
            <div className="flex items-center justify-center gap-3">
              <RingsIcon className="h-7 w-7" />
              <div className="font-display text-[9px] tracking-[0.35em] text-[#ff8fb0]">
                МОСКВА · КОНЕЧНАЯ
              </div>
              <RingsIcon className="h-7 w-7" />
            </div>
            <div className="mt-1.5 font-display text-[10px] tracking-widest text-lamp-300">
              ВОЛОДЯ + ТАНЯ = ЛЮБОВЬ
            </div>
            <h2
              className="mt-2 font-display text-4xl text-[#ffd9e4]"
              style={{ textShadow: '0 0 20px rgba(232,106,138,0.85)' }}
            >
              ГОРЬКО!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-rail-200/85">
              <span className="font-medium text-lamp-300">Володя</span> добежал до конца маршрута —
              и до сердца проводницы <span className="font-medium text-[#ffb3c6]">Тани</span>. Узы
              брака скреплены обручальными кольцами, голуби разлетелись по вагону.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded border border-[#e86a8a]/40 bg-wagon-900/70 px-4 py-3">
                <div className="font-display text-[7px] text-rail-200/60">ПУТЬ ПРОЙДЕН</div>
                <div className="mt-1 font-display text-xl text-[#ffd9e4]">{fmt(hud.score)}</div>
              </div>
              <div className="rounded border border-[#e86a8a]/40 bg-wagon-900/70 px-4 py-3">
                <div className="font-display text-[7px] text-rail-200/60">ФОТО В АЛЬБОМЕ</div>
                <div className="mt-1 font-display text-xl text-[#ffd9e4]">
                  {album.length}
                  <span className="text-sm text-rail-200/50">/16</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                className="btn-train rounded-md px-6 py-3.5 text-[10px] tracking-widest"
                onClick={() => eng()?.restart()}
              >
                ЕЩЁ ПОЕЗДКА
              </button>
              <button
                className="btn-ghost rounded-md px-5 py-3.5 text-[10px] tracking-widest"
                onClick={() => eng()?.toMenu()}
              >
                В ДЕПО
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

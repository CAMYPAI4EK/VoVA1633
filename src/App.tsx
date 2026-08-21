import { useEffect, useRef, useState } from 'react';
import { PlatskartGame } from './game/engine';
import type { GameState, HudData } from './game/engine';

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

const fmt = (n: number) => String(Math.max(0, Math.floor(n))).padStart(5, '0');

/* ---------- приложение ---------- */

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<PlatskartGame | null>(null);
  const [gs, setGs] = useState<GameState>('menu');
  const [hud, setHud] = useState<HudData>({ score: 0, best: 0, kmh: 80, newBest: false });
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const eng = new PlatskartGame(canvas, {
      onState: setGs,
      onHud: setHud,
      onToast: (t) => setToast({ id: Date.now(), text: t }),
      onMute: setMuted,
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
      <div className="crt-lines pointer-events-none absolute inset-0 z-20" />
      <div className="vignette pointer-events-none absolute inset-0 z-20" />

      {/* -------- HUD -------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="panel flex items-center gap-3 rounded-md px-4 py-2.5">
          <TrainIcon className="h-6 w-6 text-lamp-400" />
          <div className="leading-tight">
            <div className="font-display text-[10px] tracking-wider text-lamp-400">ВАГОН 07</div>
            <div className="font-display text-[7px] text-rail-200/60">ПЛАЦКАРТ-ЭКСПРЕСС</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="panel hidden rounded-md px-4 py-2.5 text-right sm:block">
            <div className="font-display text-[7px] text-rail-200/60">СКОРОСТЬ</div>
            <div className="font-display text-[11px] text-lamp-300">
              {hud.kmh} <span className="text-[7px] text-rail-200/50">КМ/Ч</span>
            </div>
          </div>
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
                СКОРЫЙ №092Э
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="amber-glow font-display text-4xl leading-none sm:text-5xl">
                  ПЛАЦКАРТ
                </h1>
                <div className="red-glow mt-3 font-display text-[11px] tracking-[0.25em] sm:text-xs">
                  БЕГИ, ПАССАЖИР!
                </div>
              </div>
              <div className="rounded border-2 border-brake-500/70 px-3 py-2 text-right">
                <div className="font-display text-[7px] text-rail-200/60">РЕКОРД МАРШРУТА</div>
                <div className="amber-glow font-display text-base">{fmt(hud.best)}</div>
              </div>
            </div>

            <div className="rise-in mt-5 space-y-1.5 text-sm text-rail-200/90">
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">МОСКВА → ВЛАДИВОСТОК</span>
                <span className="flex-1 border-b border-dotted border-rail-200/25" />
                <span className="font-display text-[8px] text-lamp-400">9288 КМ</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium">ВАГОН 07 · МЕСТО 36 (БОКОВОЕ)</span>
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
                <span>— звук, чай в подстаканнике = +50</span>
              </div>
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
              Вы споткнулись в проходе и не доехали до своей станции. Вещи ваши, впрочем, на месте.
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
    </div>
  );
}

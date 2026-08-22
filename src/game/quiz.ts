// ============================================================
//  ВОПРОСЫ ПРОВОДНИКА (квиз при возрождении)
//
//  Данные: public/questions.txt — читается в РАНТАЙМЕ (fetch),
//  поэтому файл НЕ участвует в сборке и не может сломать запуск.
//
//  Логика:
//    - если вопросов нет (файл пуст / не найден / не распарсился)
//      — работает ПЕРВИЧНАЯ заглушка;
//    - если вопросы есть — при каждой смерти выбирается
//      СЛУЧАЙНЫЙ вопрос, а варианты ПЕРЕМЕШИВАЮТСЯ (Фишер–Йетс),
//      чтобы правильный ответ не стоял на одном и том же месте.
// ============================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface RawQuestion {
  question: string;
  correct: string;
  wrongs: string[];
}

/** Первичная заглушка — показывается, пока файл без вопросов. */
const FALLBACK: RawQuestion = {
  question: 'ЗАГЛУШКА: здесь появится вопрос из вашего файла. Пока правильный ответ — четвёртый.',
  correct: '4.',
  wrongs: ['1.', '2.', '3.'],
};

let QUESTIONS: RawQuestion[] = [];
let loaded = false;

function parseQuestions(text: string): RawQuestion[] {
  const out: RawQuestion[] = [];
  for (const line of String(text ?? '').split('\n')) {
    const t = line.trim();
    // пустые строки и комментарии
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;
    // всё, что в двойных кавычках
    const parts = [...t.matchAll(/"([^"]*)"/g)].map((m) => m[1].trim());
    // минимум 5 цитат: вопрос + правильный + 3 неправильных
    if (parts.length < 5) continue;
    out.push({ question: parts[0], correct: parts[1], wrongs: parts.slice(2, 5) });
  }
  return out;
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/**
 * Загружает вопросы один раз при старте игры. Вызывается из App.
 * Никогда не бросает исключений: любая ошибка → заглушка.
 */
export async function loadQuestions(): Promise<number> {
  if (loaded) return QUESTIONS.length;
  let text: string | null = null;
  // пробуем несколько путей: и относительный, и от корня
  for (const url of ['./questions.txt', '/questions.txt', 'questions.txt']) {
    text = await tryFetch(url);
    if (text !== null) break;
  }
  if (text !== null) {
    try {
      QUESTIONS = parseQuestions(text);
    } catch {
      QUESTIONS = [];
    }
  }
  loaded = true;
  console.info(
    '[квиз проводника] файл: public/questions.txt · распознано: ' +
      QUESTIONS.length +
      ' · режим: ' +
      (QUESTIONS.length > 0 ? 'случайный вопрос из файла' : 'заглушка'),
  );
  return QUESTIONS.length;
}

/** Сколько вопросов сейчас доступно (для отладки/интерфейса). */
export function quizCount(): number {
  return QUESTIONS.length;
}

/** Случайный вопрос со случайно перемешанными вариантами ответа. */
export function pickQuestion(): QuizQuestion {
  const src =
    QUESTIONS.length > 0 ? QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)] : FALLBACK;

  const deck = [
    { text: src.correct, good: true },
    ...src.wrongs.map((text) => ({ text, good: false })),
  ];
  // перемешивание Фишера–Йетса
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return {
    question: src.question,
    options: deck.map((d) => d.text),
    correct: deck.findIndex((d) => d.good),
  };
}

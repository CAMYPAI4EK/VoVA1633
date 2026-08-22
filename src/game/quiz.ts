// ============================================================
//  ВОПРОСЫ ПРОВОДНИКА (квиз при возрождении)
//
//  Данные: src/game/questions.txt (встраивается в сборку).
//
//  Логика:
//    - если в файле НЕТ вопросов (пуст или только комментарии) —
//      работает ПЕРВИЧНАЯ заглушка;
//    - если вопросы ЕСТЬ — при каждой смерти выбирается
//      СЛУЧАЙНЫЙ вопрос, а варианты ПЕРЕМЕШИВАЮТСЯ (Фишер–Йетс),
//      чтобы правильный ответ не стоял на одном и том же месте.
//
//  Парсер максимально защищён: любая некорректная строка или
//  ошибка разбора просто пропускается, игра не ломается.
// ============================================================

import questionsRaw from './questions.txt?raw';

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

function parseQuestions(text: string): RawQuestion[] {
  const out: RawQuestion[] = [];
  try {
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
  } catch {
    return out; // что успели разобрать — то и используем
  }
  return out;
}

let PARSED: RawQuestion[] = [];
try {
  PARSED = parseQuestions(questionsRaw);
} catch {
  PARSED = [];
}

/** Первичная заглушка — работает, пока файл без вопросов. */
const FALLBACK: RawQuestion = {
  question: 'ЗАГЛУШКА: здесь появится вопрос из вашего файла. Пока правильный ответ — четвёртый.',
  correct: '4.',
  wrongs: ['1.', '2.', '3.'],
};

/** Сколько вопросов распознано в файле. */
export const QUIZ_COUNT = PARSED.length;

// Отчёт в консоль: где лежат вопросы и какой режим активен.
console.info(
  '[квиз проводника] файл с вопросами: src/game/questions.txt · распознано: ' +
    PARSED.length +
    ' · режим: ' +
    (PARSED.length > 0 ? 'случайный вопрос из файла' : 'заглушка (файл без вопросов)'),
);

/** Случайный вопрос со случайно перемешанными вариантами ответа. */
export function pickQuestion(): QuizQuestion {
  const src =
    PARSED.length > 0 ? PARSED[Math.floor(Math.random() * PARSED.length)] : FALLBACK;

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

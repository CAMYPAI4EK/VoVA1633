// ============================================================
//  ВОПРОСЫ ПРОВОДНИКА (квиз при возрождении)
//
//  Данные лежат в src/game/questions.txt — формат см. в файле.
//  Файл встраивается в сборку (import ... ?raw), поэтому вопросов
//  не может «не оказаться» при запуске игры.
//
//  При каждой смерти:
//    - выбирается СЛУЧАЙНЫЙ вопрос;
//    - порядок вариантов ПЕРЕМЕШИВАЕТСЯ (Фишер–Йетс), поэтому
//      правильный ответ никогда не стоит на одном и том же месте.
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
  for (const line of text.split('\n')) {
    const t = line.trim();
    // пропускаем пустые строки и комментарии
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;
    // вытаскиваем всё, что в двойных кавычках
    const parts = [...t.matchAll(/"([^"]*)"/g)].map((m) => m[1].trim());
    // нужно минимум 5 цитат: вопрос + правильный + 3 неправильных
    if (parts.length < 5) continue;
    out.push({ question: parts[0], correct: parts[1], wrongs: parts.slice(2, 5) });
  }
  return out;
}

const PARSED = parseQuestions(questionsRaw);

/** Резервный вопрос — на случай, если файл окажется пуст или повреждён. */
const FALLBACK: RawQuestion = {
  question: 'Проводница не успела придумать вопрос. Просто выберите «Встать и бежать дальше».',
  correct: 'Встать и бежать дальше',
  wrongs: ['Лечь и спать', 'Попросить чай', 'Дёрнуть стоп-кран'],
};

/** Сколько вопросов распознано в файле (для отладки/интерфейса). */
export const QUIZ_COUNT = PARSED.length;

/** Случайный вопрос со случайно перемешанными вариантами ответа. */
export function pickQuestion(): QuizQuestion {
  const src = PARSED.length ? PARSED[Math.floor(Math.random() * PARSED.length)] : FALLBACK;

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

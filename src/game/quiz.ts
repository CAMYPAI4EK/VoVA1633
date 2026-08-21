// ============================================================
//  ВОПРОСЫ ДЛЯ ВОЗРОЖДЕНИЯ
//  Позже сюда будут добавлены реальные вопросы из файла.
//  correct — индекс правильного варианта (0..3).
// ============================================================

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correct: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'ЗАГЛУШКА: здесь появится вопрос из вашего файла. Пока правильный ответ — четвёртый.',
    options: ['1.', '2.', '3.', '4.'],
    correct: 3,
  },
];

export function pickQuestion(): QuizQuestion {
  return QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
}

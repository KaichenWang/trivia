import type { QuizProgress } from '../types/quiz'

const STORAGE_KEY = 'quiz-progress-v1'

type QuizProgressById = Record<string, QuizProgress>

export function loadProgress(): QuizProgressById {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as QuizProgressById) : {}
  } catch {
    return {}
  }
}

export function getQuizProgress(quizId: string): QuizProgress | null {
  const data = loadProgress()
  return data[quizId] ?? null
}

export function saveQuizProgress(quizId: string, progress: QuizProgress): void {
  const data = loadProgress()
  data[quizId] = progress
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearQuizProgress(quizId: string): void {
  const data = loadProgress()
  delete data[quizId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

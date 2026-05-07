import quiz1 from './quizzes/quiz-1.json'
import quiz2 from './quizzes/quiz-2.json'
import type { Quiz } from '../types/quiz'

export const quizzes: Quiz[] = [quiz1 as Quiz, quiz2 as Quiz]

export function getQuizById(quizId: string | undefined): Quiz | undefined {
  return quizzes.find((quiz) => quiz.id === quizId)
}

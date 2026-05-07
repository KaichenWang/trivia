export interface QuizQuestion {
  question: string
  answer: string
  options: string[]
}

export interface Quiz {
  id: string
  title: string
  questions: QuizQuestion[]
}

export interface QuizProgress {
  currentIndex: number
  score: number
  totalQuestions: number
  completed: boolean
  totalElapsedMs?: number
  timerMode?: 'zen' | 'easy' | 'hard' | 'expert'
}

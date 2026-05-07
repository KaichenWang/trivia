import type { QuizProgress } from '../types/quiz'

interface ResumePromptProps {
  progress: QuizProgress
  quizTitle: string
  onRestart: () => void
  onResume: () => void
}

function ResumePrompt({ progress, quizTitle, onRestart, onResume }: ResumePromptProps) {
  const completionText = progress.completed
    ? `Completed with score ${progress.score}/${progress.totalQuestions}`
    : `Question ${progress.currentIndex + 1} of ${progress.totalQuestions}`

  return (
    <div className="card">
      <h2>{quizTitle}</h2>
      <p className="muted">Saved progress found.</p>
      <p>{completionText}</p>
      <div className="actions">
        <button type="button" className="btn secondary" onClick={onRestart}>
          Restart Quiz
        </button>
        {!progress.completed && (
          <button type="button" className="btn" onClick={onResume}>
            Continue Where I Left Off
          </button>
        )}
      </div>
    </div>
  )
}

export default ResumePrompt

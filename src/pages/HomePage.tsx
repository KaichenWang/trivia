import { Link } from 'react-router-dom'
import { quizzes } from '../data/quizzes'
import { getQuizProgress } from '../lib/storage'

function HomePage() {
  return (
    <main className="page">
      <div className="card">
        <h1>Quiz Game</h1>
        <p className="muted">Choose a quiz to begin.</p>
        <ul className="quiz-list">
          {quizzes.map((quiz) => {
            const progress = getQuizProgress(quiz.id)
            const status = progress?.completed
              ? `Completed (${progress.score}/${progress.totalQuestions})`
              : progress
                ? `In progress (question ${progress.currentIndex + 1}/${progress.totalQuestions})`
                : 'Not started'

            return (
              <li key={quiz.id} className="quiz-item">
                <div>
                  <h2>{quiz.title}</h2>
                  <p className="muted">{status}</p>
                </div>
                <Link className="btn" to={`/quiz/${quiz.id}`}>
                  Open Quiz
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}

export default HomePage

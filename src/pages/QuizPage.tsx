import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ResumePrompt from '../components/ResumePrompt'
import { getQuizById } from '../data/quizzes'
import { clearQuizProgress, getQuizProgress, saveQuizProgress } from '../lib/storage'
import type { QuizProgress } from '../types/quiz'

function QuizPage() {
  const { quizId } = useParams()
  const quiz = getQuizById(quizId)

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedProgress, setSavedProgress] = useState<QuizProgress | null>(null)
  const [resolvedSavedChoice, setResolvedSavedChoice] = useState(false)
  const [completedResult, setCompletedResult] = useState<QuizProgress | null>(null)

  const totalQuestions = quiz?.questions.length ?? 0
  const isOutOfRange = currentIndex < 0 || currentIndex >= totalQuestions
  const currentQuestion = quiz?.questions[currentIndex]
  const isLastQuestion = currentIndex === totalQuestions - 1
  const isCorrect = selectedOption === currentQuestion?.answer

  useEffect(() => {
    if (!quiz) {
      return
    }

    const progress = getQuizProgress(quiz.id)
    setSavedProgress(progress)
    setResolvedSavedChoice(!progress)
    setSelectedOption(null)
    setShowResult(false)
    setScore(0)
    setCurrentIndex(0)
    setCompletedResult(null)
  }, [quiz])

  useEffect(() => {
    if (!quiz || savedProgress || !resolvedSavedChoice || isOutOfRange) {
      return
    }

    saveQuizProgress(quiz.id, {
      currentIndex,
      score,
      totalQuestions,
      completed: false,
    })
  }, [
    quiz,
    currentIndex,
    score,
    totalQuestions,
    savedProgress,
    resolvedSavedChoice,
    isOutOfRange,
  ])

  const progressLabel = useMemo(() => {
    if (!quiz || totalQuestions === 0) {
      return ''
    }
    return `Question ${currentIndex + 1} of ${totalQuestions}`
  }, [quiz, totalQuestions, currentIndex])

  if (!quiz) {
    return (
      <main className="page">
        <div className="card">
          <h1>Quiz not found</h1>
          <Link to="/" className="btn">
            Back to Quizzes
          </Link>
        </div>
      </main>
    )
  }

  if (savedProgress?.completed && !resolvedSavedChoice) {
    return (
      <main className="page">
        <div className="card">
          <h1>{quiz.title}</h1>
          <p>
            Last score: {savedProgress.score}/{savedProgress.totalQuestions}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              clearQuizProgress(quiz.id)
              setSavedProgress(null)
              setResolvedSavedChoice(true)
              setScore(0)
              setCurrentIndex(0)
              setSelectedOption(null)
              setShowResult(false)
              setCompletedResult(null)
            }}
          >
            Restart Quiz
          </button>
        </div>
      </main>
    )
  }

  if (savedProgress && !resolvedSavedChoice) {
    return (
      <main className="page">
        <ResumePrompt
          progress={savedProgress}
          quizTitle={quiz.title}
          onRestart={() => {
            clearQuizProgress(quiz.id)
            setSavedProgress(null)
            setResolvedSavedChoice(true)
            setScore(0)
            setCurrentIndex(0)
            setSelectedOption(null)
            setShowResult(false)
            setCompletedResult(null)
          }}
          onResume={() => {
            setScore(savedProgress.score ?? 0)
            setResolvedSavedChoice(true)
            setCurrentIndex(savedProgress.currentIndex ?? 0)
            setSelectedOption(null)
            setShowResult(false)
          }}
        />
      </main>
    )
  }

  if (isOutOfRange) {
    return (
      <main className="page">
        <div className="card">
          <h1>Invalid question state</h1>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setCurrentIndex(0)
              setSelectedOption(null)
              setShowResult(false)
            }}
          >
            Go to first question
          </button>
        </div>
      </main>
    )
  }

  const submitAnswer = (option: string) => {
    if (showResult || !currentQuestion) {
      return
    }
    setSelectedOption(option)
    setShowResult(true)

    const updatedScore = option === currentQuestion.answer ? score + 1 : score
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1)
    }

    saveQuizProgress(quiz.id, {
      currentIndex,
      score: updatedScore,
      totalQuestions,
      completed: false,
    })
  }

  const goNext = () => {
    const nextIndex = currentIndex + 1

    if (isLastQuestion) {
      const result = {
        currentIndex,
        score,
        totalQuestions,
        completed: true,
      }
      saveQuizProgress(quiz.id, result)
      setCompletedResult(result)
      return
    }

    saveQuizProgress(quiz.id, {
      currentIndex: nextIndex,
      score,
      totalQuestions,
      completed: false,
    })
    setSelectedOption(null)
    setShowResult(false)
    setCurrentIndex(nextIndex)
  }

  return (
    <main className="page">
      <div className="card">
        <div className="card-header">
          <h1>{quiz.title}</h1>
          <Link to="/" className="text-link">
            Back
          </Link>
        </div>
        <p className="muted">{progressLabel}</p>
        <p className="score">Score: {score}</p>

        {completedResult ? (
          <div className="result done">
            <p>
              Quiz complete. Final score: {completedResult.score}/{completedResult.totalQuestions}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                clearQuizProgress(quiz.id)
                setSavedProgress(null)
                setResolvedSavedChoice(true)
                setScore(0)
                setCurrentIndex(0)
                setSelectedOption(null)
                setShowResult(false)
                setCompletedResult(null)
              }}
            >
              Restart Quiz
            </button>
          </div>
        ) : (
          <>
            <h2>{currentQuestion?.question}</h2>
            <div className="options">
              {currentQuestion?.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`option ${selectedOption === option ? 'selected' : ''}`}
                  onClick={() => submitAnswer(option)}
                  disabled={showResult}
                >
                  {option}
                </button>
              ))}
            </div>

            {showResult && (
              <div className={`result ${isCorrect ? 'correct' : 'wrong'}`}>
                <p>{isCorrect ? 'Correct!' : `Wrong. Correct answer: ${currentQuestion?.answer}`}</p>
                <button type="button" className="btn" onClick={goNext}>
                  {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default QuizPage

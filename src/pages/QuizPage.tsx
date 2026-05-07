import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import ResumePrompt from '../components/ResumePrompt'
import { getQuizById } from '../data/quizzes'
import { clearQuizProgress, getQuizProgress, saveQuizProgress } from '../lib/storage'
import type { QuizProgress } from '../types/quiz'

function QuizPage() {
  const { quizId, questionIndex } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const quiz = getQuizById(quizId)
  const parsedQuestionNumber = Number(questionIndex ?? 1)
  const safeQuestionIndex = Number.isInteger(parsedQuestionNumber) ? parsedQuestionNumber - 1 : -1
  const locationState = location.state as { skipSavedProgress?: boolean; initialScore?: number } | null
  const shouldCheckSavedProgress = navigationType === 'POP' && !locationState?.skipSavedProgress

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [savedProgress, setSavedProgress] = useState<QuizProgress | null>(null)
  const [resolvedSavedChoice, setResolvedSavedChoice] = useState(false)
  const [completedResult, setCompletedResult] = useState<QuizProgress | null>(null)

  const totalQuestions = quiz?.questions.length ?? 0
  const isOutOfRange = safeQuestionIndex < 0 || safeQuestionIndex >= totalQuestions
  const currentQuestion = quiz?.questions[safeQuestionIndex]
  const isLastQuestion = safeQuestionIndex === totalQuestions - 1
  const isCorrect = selectedOption === currentQuestion?.answer

  useEffect(() => {
    if (!quiz) {
      return
    }

    const progress = shouldCheckSavedProgress ? getQuizProgress(quiz.id) : null
    setSavedProgress(progress)
    setResolvedSavedChoice(!progress)
    setSelectedOption(null)
    setShowResult(false)
    setScore(locationState?.initialScore ?? 0)
    setCompletedResult(null)
  }, [quiz, shouldCheckSavedProgress, locationState?.initialScore])

  useEffect(() => {
    if (quiz && !questionIndex && resolvedSavedChoice) {
      navigate(`/quiz/${quiz.id}/question/1`, {
        replace: true,
        state: { skipSavedProgress: true, initialScore: score },
      })
    }
  }, [quiz, questionIndex, resolvedSavedChoice, navigate, score])

  useEffect(() => {
    if (!quiz || savedProgress || !resolvedSavedChoice || isOutOfRange) {
      return
    }

    saveQuizProgress(quiz.id, {
      currentIndex: safeQuestionIndex,
      score,
      totalQuestions,
      completed: false,
    })
  }, [
    quiz,
    safeQuestionIndex,
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
    return `Question ${safeQuestionIndex + 1} of ${totalQuestions}`
  }, [quiz, totalQuestions, safeQuestionIndex])

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
              navigate(`/quiz/${quiz.id}/question/1`, {
                replace: true,
                state: { skipSavedProgress: true, initialScore: 0 },
              })
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
            navigate(`/quiz/${quiz.id}/question/1`, {
              replace: true,
              state: { skipSavedProgress: true, initialScore: 0 },
            })
          }}
          onResume={() => {
            setScore(savedProgress.score ?? 0)
            setResolvedSavedChoice(true)
            navigate(`/quiz/${quiz.id}/question/${(savedProgress.currentIndex ?? 0) + 1}`, {
              replace: true,
              state: { skipSavedProgress: true, initialScore: savedProgress.score ?? 0 },
            })
          }}
        />
      </main>
    )
  }

  if (isOutOfRange) {
    return (
      <main className="page">
        <div className="card">
          <h1>Invalid question URL</h1>
          <Link
            to={`/quiz/${quiz.id}/question/1`}
            state={{ skipSavedProgress: true, initialScore: 0 }}
            className="btn"
          >
            Go to first question
          </Link>
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
      currentIndex: safeQuestionIndex,
      score: updatedScore,
      totalQuestions,
      completed: false,
    })
  }

  const goNext = () => {
    const nextIndex = safeQuestionIndex + 1

    if (isLastQuestion) {
      const result = {
        currentIndex: safeQuestionIndex,
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
    navigate(`/quiz/${quiz.id}/question/${nextIndex + 1}`, {
      state: { skipSavedProgress: true, initialScore: score },
    })
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
                navigate(`/quiz/${quiz.id}/question/1`, {
                  replace: true,
                  state: { skipSavedProgress: true, initialScore: 0 },
                })
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

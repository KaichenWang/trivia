import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ResumePrompt from '../components/ResumePrompt'
import { getQuizById } from '../data/quizzes'
import { clearQuizProgress, getQuizProgress, saveQuizProgress } from '../lib/storage'
import type { QuizProgress } from '../types/quiz'

type TimerMode = 'zen' | 'easy' | 'hard' | 'expert'

const QUESTION_TIME_MS: Record<Exclude<TimerMode, 'zen'>, number> = {
  easy: 30_000,
  hard: 10_000,
  expert: 5_000,
}

const formatElapsedTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]]
  }
  return shuffled
}

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
  const [timerMode, setTimerMode] = useState<TimerMode | null>(null)
  const [isQuestionTiming, setIsQuestionTiming] = useState(false)
  const [activeQuestionElapsedMs, setActiveQuestionElapsedMs] = useState(0)
  const [totalElapsedMs, setTotalElapsedMs] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

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
    setTimerMode(null)
    setIsQuestionTiming(false)
    setActiveQuestionElapsedMs(0)
    setTotalElapsedMs(0)
    setTimedOut(false)
  }, [quiz])

  const finalizeQuestionTime = () => {
    if (!isQuestionTiming) {
      return 0
    }

    const elapsed = activeQuestionElapsedMs
    setIsQuestionTiming(false)
    setActiveQuestionElapsedMs(0)
    setTotalElapsedMs((prev) => prev + elapsed)
    return elapsed
  }

  useEffect(() => {
    if (!quiz || !resolvedSavedChoice || !currentQuestion || completedResult || showResult || !timerMode) {
      return
    }

    setTimedOut(false)
    setIsQuestionTiming(true)
    setActiveQuestionElapsedMs(0)
  }, [quiz, resolvedSavedChoice, currentQuestion, completedResult, showResult, timerMode])

  useEffect(() => {
    if (!isQuestionTiming || showResult || completedResult) {
      return
    }

    const ticker = window.setInterval(() => {
      setActiveQuestionElapsedMs((prev) => prev + 100)
    }, 100)

    return () => {
      window.clearInterval(ticker)
    }
  }, [isQuestionTiming, showResult, completedResult])

  useEffect(() => {
    if (
      !quiz ||
      timerMode === null ||
      timerMode === 'zen' ||
      showResult ||
      completedResult ||
      !isQuestionTiming
    ) {
      return
    }

    const questionTimeLimitMs = QUESTION_TIME_MS[timerMode]
    const remainingMs = Math.max(questionTimeLimitMs - activeQuestionElapsedMs, 0)
    if (remainingMs > 0) {
      return
    }

    const elapsed = activeQuestionElapsedMs
    setIsQuestionTiming(false)
    setActiveQuestionElapsedMs(0)
    setTotalElapsedMs((prev) => prev + elapsed)
    const updatedTotalElapsedMs = totalElapsedMs + elapsed

    setTimedOut(true)
    setSelectedOption('__timeout__')
    setShowResult(true)

    const nextIndex = currentIndex + 1
    const reachedEnd = nextIndex >= totalQuestions
    saveQuizProgress(quiz.id, {
      currentIndex: reachedEnd ? currentIndex : nextIndex,
      score,
      totalQuestions,
      completed: reachedEnd,
      totalElapsedMs: updatedTotalElapsedMs,
      timerMode,
    })
  }, [
    timerMode,
    showResult,
    completedResult,
    isQuestionTiming,
    activeQuestionElapsedMs,
    quiz,
    currentIndex,
    score,
    totalQuestions,
    totalElapsedMs,
  ])

  const progressLabel = useMemo(() => {
    if (!quiz || totalQuestions === 0) {
      return ''
    }
    return `Question ${currentIndex + 1} of ${totalQuestions}`
  }, [quiz, totalQuestions, currentIndex])

  const displayOptions = useMemo(() => {
    if (!currentQuestion) {
      return []
    }

    const combinedOptions = Array.from(new Set([...currentQuestion.options, currentQuestion.answer]))
    return shuffleArray(combinedOptions)
  }, [currentQuestion])

  const resetQuizState = () => {
    setSavedProgress(null)
    setResolvedSavedChoice(true)
    setScore(0)
    setCurrentIndex(0)
    setSelectedOption(null)
    setShowResult(false)
    setCompletedResult(null)
    setTimerMode(null)
    setIsQuestionTiming(false)
    setActiveQuestionElapsedMs(0)
    setTotalElapsedMs(0)
    setTimedOut(false)
  }

  const restartQuiz = () => {
    if (!quiz) {
      return
    }

    clearQuizProgress(quiz.id)
    resetQuizState()
  }

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
            onClick={restartQuiz}
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
          onRestart={restartQuiz}
          onResume={() => {
            setScore(savedProgress.score ?? 0)
            setResolvedSavedChoice(true)
            setCurrentIndex(savedProgress.currentIndex ?? 0)
            setSelectedOption(null)
            setShowResult(false)
            setTimerMode(savedProgress.timerMode ?? 'zen')
            setIsQuestionTiming(false)
            setActiveQuestionElapsedMs(0)
            setTotalElapsedMs(savedProgress.totalElapsedMs ?? 0)
            setTimedOut(false)
          }}
        />
      </main>
    )
  }

  if (!savedProgress && resolvedSavedChoice && !timerMode) {
    return (
      <main className="page">
        <div className="card">
          <div className="card-header">
            <h1>{quiz.title}</h1>
            <Link to="/" className="text-link">
              Quit
            </Link>
          </div>
          <p className="muted">Choose a mode before starting your quiz.</p>
          <div className="options">
            <button type="button" className="option" onClick={() => setTimerMode('zen')}>
              Zen mode (no timer)
            </button>
            <button type="button" className="option" onClick={() => setTimerMode('easy')}>
              Easy (30 s per question)
            </button>
            <button type="button" className="option" onClick={() => setTimerMode('hard')}>
              Hard (10 s per question)
            </button>
            <button type="button" className="option" onClick={() => setTimerMode('expert')}>
              Expert (5 s per question)
            </button>
          </div>
        </div>
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
    const elapsed = finalizeQuestionTime()
    const updatedTotalElapsedMs = totalElapsedMs + elapsed

    setTimedOut(false)
    setSelectedOption(option)
    setShowResult(true)

    const updatedScore = option === currentQuestion.answer ? score + 1 : score
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1)
    }

    const nextIndex = currentIndex + 1
    const reachedEnd = nextIndex >= totalQuestions
    saveQuizProgress(quiz.id, {
      currentIndex: reachedEnd ? currentIndex : nextIndex,
      score: updatedScore,
      totalQuestions,
      completed: reachedEnd,
      totalElapsedMs: updatedTotalElapsedMs,
      timerMode: timerMode ?? 'zen',
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
        totalElapsedMs,
        timerMode: timerMode ?? 'zen',
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
      totalElapsedMs,
      timerMode: timerMode ?? 'zen',
    })
    setSelectedOption(null)
    setShowResult(false)
    setTimedOut(false)
    setCurrentIndex(nextIndex)
  }

  const activeTotalElapsedMs = isQuestionTiming ? totalElapsedMs + activeQuestionElapsedMs : totalElapsedMs
  const totalTimeLabel = formatElapsedTime(activeTotalElapsedMs)
  const questionTimeLimitMs = timerMode && timerMode !== 'zen' ? QUESTION_TIME_MS[timerMode] : null
  const remainingQuestionMs =
    questionTimeLimitMs === null ? null : Math.max(questionTimeLimitMs - activeQuestionElapsedMs, 0)
  const questionProgressPercent =
    questionTimeLimitMs === null ? null : Math.min((activeQuestionElapsedMs / questionTimeLimitMs) * 100, 100)

  return (
    <main className="page">
      <div className="card">
        <div className="card-header">
          <h1>{quiz.title}</h1>
          <Link to="/" className="text-link">
            Quit
          </Link>
        </div>
        <p className="muted">{progressLabel}</p>
        <p className="score">
          <span>Score: {score}</span>
          {
            timerMode !== 'zen' && (
              <span> | Time: {totalTimeLabel}</span>
            )
          }
        </p>

        {completedResult ? (
          <div className="result done">
            <p>
              Quiz complete. Final score: {completedResult.score}/{completedResult.totalQuestions}
            </p>
            <p>Total time: {formatElapsedTime(completedResult.totalElapsedMs ?? 0)}</p>
            <button
              type="button"
              className="btn"
              onClick={restartQuiz}
            >
              Restart Quiz
            </button>
          </div>
        ) : (
          <>
            {questionTimeLimitMs !== null && (
              <div className="timer-wrap">
                <div className="timer-meta">
                  <span>Time left</span>
                  <span>{Math.ceil((remainingQuestionMs ?? 0) / 1000)}s</span>
                </div>
                <div className="timer-track" aria-hidden="true">
                  <div className="timer-fill" style={{ width: `${100 - (questionProgressPercent ?? 0)}%` }} />
                </div>
              </div>
            )}
            <h2>{currentQuestion?.question}</h2>
            <div className="options">
              {displayOptions.map((option) => (
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
                <p>
                  {isCorrect
                    ? 'Correct!'
                    : timedOut
                      ? `Time's up. Correct answer: ${currentQuestion?.answer}`
                      : `Wrong. Correct answer: ${currentQuestion?.answer}`}
                </p>
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

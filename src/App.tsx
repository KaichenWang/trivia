import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quiz/:quizId" element={<QuizPage />} />
      <Route path="/quiz/:quizId/question/:questionIndex" element={<QuizPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

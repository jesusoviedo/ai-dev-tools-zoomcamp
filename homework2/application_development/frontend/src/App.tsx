import { Routes, Route, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CodeRunnerProvider } from './contexts/CodeRunnerContext'
import AppHeader from './components/AppHeader'
import EditorPage from './pages/EditorPage'
import './App.css'

function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    // Set HTML lang attribute based on current language
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <CodeRunnerProvider>
      <AppHeader />
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/session/:sessionId" element={<SessionRoute />} />
      </Routes>
    </CodeRunnerProvider>
  )
}

function SessionRoute() {
  const { sessionId } = useParams<{ sessionId: string }>()
  return <EditorPage sessionId={sessionId || null} />
}

export default App


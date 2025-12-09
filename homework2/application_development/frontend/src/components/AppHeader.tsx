import { useTranslation } from 'react-i18next'
import './AppHeader.css'

export default function AppHeader() {
  const { t, i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    document.documentElement.lang = lng
  }

  return (
    <header className="app-header">
      <div className="app-header-content">
        <div className="app-title-section">
          <h1 className="app-title">{t('app.name')}</h1>
          <p className="app-description">{t('app.description')}</p>
        </div>
        <div className="language-selector-container">
          <button
            className={`lang-button ${i18n.language === 'es' ? 'active' : ''}`}
            onClick={() => changeLanguage('es')}
            aria-label="Español"
          >
            ES
          </button>
          <button
            className={`lang-button ${i18n.language === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
            aria-label="English"
          >
            EN
          </button>
        </div>
      </div>
    </header>
  )
}



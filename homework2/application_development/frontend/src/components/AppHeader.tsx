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
          <select
            className="language-selector"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label={t('header.languageSelector')}
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
    </header>
  )
}



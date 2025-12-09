import { useState } from 'react'
import './CollapsiblePanel.css'

interface CollapsiblePanelProps {
  title: string
  children: React.ReactNode
  defaultCollapsed?: boolean
  icon?: React.ReactNode
}

export default function CollapsiblePanel({ 
  title, 
  children, 
  defaultCollapsed = false,
  icon 
}: CollapsiblePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className={`collapsible-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="collapsible-panel-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <div className="collapsible-panel-title">
          {icon && <span className="collapsible-panel-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <svg 
          className={`collapsible-panel-chevron ${isCollapsed ? 'collapsed' : ''}`}
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {!isCollapsed && (
        <div className="collapsible-panel-content">
          {children}
        </div>
      )}
    </div>
  )
}



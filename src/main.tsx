import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import './styles/base.css'
import './styles/search.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/landlord.css'
import './styles/overrides.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import icon from './assets/icon_invert.svg'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <img src={icon} alt="Icon" /> */}
    <App />
  </StrictMode>,
)

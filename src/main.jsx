// import { StrictMode } from 'react' // Disabled for Socket.IO development
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode disabled in development to prevent multiple Socket.IO connections
  // Re-enable for production builds
  // <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  // </StrictMode>,
)

// import { StrictMode } from 'react' // Disabled for Socket.IO development
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { setupGlobalYjsErrorHandler } from '@/utils/yjsErrorHandler'
import './index.css'
import App from './App.jsx'

// Set up global YJS error handling to prevent app crashes
setupGlobalYjsErrorHandler();

createRoot(document.getElementById('root')).render(
  // StrictMode disabled in development to prevent multiple Socket.IO connections
  // Re-enable for production builds
  // <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  // </StrictMode>,
)
